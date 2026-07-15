const db = require("../../../config/price_management_db/price_management_db");
const productManagementDb = require("../../../config/product_management_db/product_management_db");

const ALLOWED_MARKETPLACES = new Set(["local", "daraz", "woocommerce", "all"]);
const ALLOWED_MARGIN_TYPES = new Set(["percentage", "fixed"]);
const ALLOWED_ROUNDING_RULES = new Set(["none", "nearest_9", "nearest_50", "nearest_100", "nearest_whole"]);
const ALLOWED_STATUSES = new Set(["active", "inactive"]);

function clean(value) {
  return value === undefined || value === null ? null : String(value).trim() || null;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function list({ category_id: categoryId, marketplace, status, search, limit = 100, offset = 0 } = {}) {
  const params = [];
  let whereSql = "WHERE deleted_at IS NULL";

  if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
    whereSql += " AND category_id = ?";
    params.push(categoryId);
  }

  if (marketplace && ALLOWED_MARKETPLACES.has(marketplace)) {
    whereSql += " AND marketplace = ?";
    params.push(marketplace);
  }

  if (status && ALLOWED_STATUSES.has(status)) {
    whereSql += " AND status = ?";
    params.push(status);
  }

  if (search) {
    whereSql += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  const [rows] = await db.query(
    `SELECT * FROM price_rules ${whereSql} ORDER BY priority DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM price_rules ${whereSql}`, params);

  return { rows, total: Number(countRows[0]?.total || 0) };
}

async function findById(id) {
  const [rows] = await db.query(`SELECT * FROM price_rules WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] || null;
}

function validatePayload({ name, margin_type: marginType, margin_value: marginValue, marketplace, rounding_rule: roundingRule }) {
  if (!name || !String(name).trim()) throw badRequest("Rule name is required.");
  if (marginValue === undefined || marginValue === null || marginValue === "" || Number.isNaN(Number(marginValue))) {
    throw badRequest("Margin value is required.");
  }
  if (marginType && !ALLOWED_MARGIN_TYPES.has(marginType)) throw badRequest("Invalid margin type.");
  if (marketplace && !ALLOWED_MARKETPLACES.has(marketplace)) throw badRequest("Invalid marketplace.");
  if (roundingRule && !ALLOWED_ROUNDING_RULES.has(roundingRule)) throw badRequest("Invalid rounding rule.");
}

async function create({
  name,
  category_id: categoryId,
  marketplace,
  margin_type: marginType,
  margin_value: marginValue,
  rounding_rule: roundingRule,
  min_price: minPrice,
  max_price: maxPrice,
  priority,
  status,
  created_by: createdBy = null,
}) {
  validatePayload({ name, margin_type: marginType, margin_value: marginValue, marketplace, rounding_rule: roundingRule });

  const [result] = await db.query(
    `INSERT INTO price_rules
       (name, category_id, marketplace, margin_type, margin_value, rounding_rule, min_price, max_price, priority, status, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).trim(),
      categoryId || null,
      ALLOWED_MARKETPLACES.has(marketplace) ? marketplace : "all",
      ALLOWED_MARGIN_TYPES.has(marginType) ? marginType : "percentage",
      Number(marginValue),
      ALLOWED_ROUNDING_RULES.has(roundingRule) ? roundingRule : "none",
      minPrice !== undefined && minPrice !== null && minPrice !== "" ? Number(minPrice) : null,
      maxPrice !== undefined && maxPrice !== null && maxPrice !== "" ? Number(maxPrice) : null,
      Number.isFinite(Number(priority)) ? Number(priority) : 0,
      ALLOWED_STATUSES.has(status) ? status : "active",
      createdBy,
      createdBy,
    ]
  );

  return findById(result.insertId);
}

async function update(
  id,
  {
    name,
    category_id: categoryId,
    marketplace,
    margin_type: marginType,
    margin_value: marginValue,
    rounding_rule: roundingRule,
    min_price: minPrice,
    max_price: maxPrice,
    priority,
    status,
    updated_by: updatedBy = null,
  }
) {
  const existing = await findById(id);
  if (!existing) return null;

  if (name !== undefined || marginValue !== undefined || marketplace !== undefined || roundingRule !== undefined) {
    validatePayload({
      name: name ?? existing.name,
      margin_type: marginType ?? existing.margin_type,
      margin_value: marginValue ?? existing.margin_value,
      marketplace: marketplace ?? existing.marketplace,
      rounding_rule: roundingRule ?? existing.rounding_rule,
    });
  }

  await db.query(
    `UPDATE price_rules
     SET name = ?, category_id = ?, marketplace = ?, margin_type = ?, margin_value = ?, rounding_rule = ?,
         min_price = ?, max_price = ?, priority = ?, status = ?, updated_by = ?
     WHERE id = ?`,
    [
      name && String(name).trim() ? String(name).trim() : existing.name,
      categoryId !== undefined ? categoryId || null : existing.category_id,
      ALLOWED_MARKETPLACES.has(marketplace) ? marketplace : existing.marketplace,
      ALLOWED_MARGIN_TYPES.has(marginType) ? marginType : existing.margin_type,
      marginValue !== undefined && marginValue !== "" ? Number(marginValue) : existing.margin_value,
      ALLOWED_ROUNDING_RULES.has(roundingRule) ? roundingRule : existing.rounding_rule,
      minPrice !== undefined ? (minPrice === null || minPrice === "" ? null : Number(minPrice)) : existing.min_price,
      maxPrice !== undefined ? (maxPrice === null || maxPrice === "" ? null : Number(maxPrice)) : existing.max_price,
      priority !== undefined && priority !== "" ? Number(priority) : existing.priority,
      ALLOWED_STATUSES.has(status) ? status : existing.status,
      updatedBy,
      id,
    ]
  );

  return findById(id);
}

async function softDelete(id) {
  const [result] = await db.query(
    `UPDATE price_rules SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return result.affectedRows > 0;
}

// Picks the single best-matching active rule for a SKU's category +
// target marketplace: a category-specific rule beats a global one, an
// exact-marketplace rule beats an "all" rule, then higher priority, then
// most recently updated.
async function resolveRule({ categoryId, marketplace }) {
  const [rows] = await db.query(
    `SELECT *,
            (category_id IS NOT NULL AND category_id = ?) AS category_match,
            (marketplace = ?) AS marketplace_exact
     FROM price_rules
     WHERE deleted_at IS NULL
       AND status = 'active'
       AND (category_id IS NULL OR category_id = ?)
       AND (marketplace = ? OR marketplace = 'all')
     ORDER BY category_match DESC, marketplace_exact DESC, priority DESC, updated_at DESC
     LIMIT 1`,
    [categoryId || 0, marketplace, categoryId || 0, marketplace]
  );

  return rows[0] || null;
}

function applyRounding(value, roundingRule) {
  switch (roundingRule) {
    case "nearest_9":
      return Math.ceil(value / 10) * 10 - 1;
    case "nearest_50":
      return Math.round(value / 50) * 50;
    case "nearest_100":
      return Math.round(value / 100) * 100;
    case "nearest_whole":
      return Math.round(value);
    default:
      return Math.round(value * 100) / 100;
  }
}

function computeSuggestedPrice({ costPrice, rule }) {
  if (!rule) return null;

  const cost = Number(costPrice || 0);
  if (!Number.isFinite(cost) || cost <= 0) return null;

  let price =
    rule.margin_type === "fixed"
      ? cost + Number(rule.margin_value || 0)
      : cost * (1 + Number(rule.margin_value || 0) / 100);

  price = applyRounding(price, rule.rounding_rule);

  if (rule.min_price !== null && rule.min_price !== undefined && price < Number(rule.min_price)) {
    price = Number(rule.min_price);
  }
  if (rule.max_price !== null && rule.max_price !== undefined && price > Number(rule.max_price)) {
    price = Number(rule.max_price);
  }

  return Math.round(price * 100) / 100;
}

// category_id lives on cm_product_management.products only (not on
// product_variants) - a variant SKU needs a second hop through its
// parent product. No generic findBySku exists on that model yet, so
// this stays a small local raw-query helper rather than a broader
// product-model change.
async function resolveCategoryIdForSku(sku) {
  const cleanSku = clean(sku);
  if (!cleanSku) return null;

  const [productRows] = await productManagementDb.query(
    `SELECT category_id FROM products WHERE sku = ? LIMIT 1`,
    [cleanSku]
  );
  if (productRows[0]) return productRows[0].category_id || null;

  const [variantRows] = await productManagementDb.query(
    `SELECT p.category_id
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.variant_sku = ?
     LIMIT 1`,
    [cleanSku]
  );

  return variantRows[0]?.category_id || null;
}

module.exports = {
  list,
  findById,
  create,
  update,
  softDelete,
  resolveRule,
  computeSuggestedPrice,
  resolveCategoryIdForSku,
};
