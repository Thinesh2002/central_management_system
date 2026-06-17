const db = require("../../../config/product_management_db");

const safeJsonStringify = (data, fallback = "{}") => {
  try {
    if (data === undefined || data === null) return fallback;
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
};

exports.upsertCategory = async ({ country_code = "LK", category_id, parent_category_id = null, category_name, category_path = null, is_leaf = 0, level_no = null, raw_json = null }) => {
  if (!category_id || !category_name) return null;

  await db.query(
    `
    INSERT INTO daraz_categories (
      country_code, category_id, parent_category_id, category_name, category_path,
      is_leaf, level_no, raw_json, last_synced_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      parent_category_id = VALUES(parent_category_id),
      category_name = VALUES(category_name),
      category_path = VALUES(category_path),
      is_leaf = VALUES(is_leaf),
      level_no = VALUES(level_no),
      raw_json = VALUES(raw_json),
      last_synced_at = NOW()
    `,
    [country_code, category_id, parent_category_id, category_name, category_path, is_leaf ? 1 : 0, level_no, safeJsonStringify(raw_json)]
  );
};

exports.upsertAttribute = async ({ country_code = "LK", category_id, attribute = {} }) => {
  const attributeName = attribute.name || attribute.attribute_name || attribute.label || attribute.AttributeName;
  if (!category_id || !attributeName) return null;

  await db.query(
    `
    INSERT INTO daraz_category_attributes (
      country_code, category_id, attribute_id, attribute_name, input_type, attribute_type,
      is_mandatory, is_sale_prop, is_sku_attribute, options_json, raw_json, last_synced_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      attribute_id = VALUES(attribute_id),
      input_type = VALUES(input_type),
      attribute_type = VALUES(attribute_type),
      is_mandatory = VALUES(is_mandatory),
      is_sale_prop = VALUES(is_sale_prop),
      is_sku_attribute = VALUES(is_sku_attribute),
      options_json = VALUES(options_json),
      raw_json = VALUES(raw_json),
      last_synced_at = NOW()
    `,
    [
      country_code,
      category_id,
      attribute.id || attribute.attribute_id || null,
      attributeName,
      attribute.input_type || attribute.inputType || null,
      attribute.type || attribute.attribute_type || null,
      attribute.is_mandatory || attribute.mandatory ? 1 : 0,
      attribute.is_sale_prop || attribute.sale_prop ? 1 : 0,
      attribute.is_sku_attribute || attribute.sku_attribute ? 1 : 0,
      safeJsonStringify(attribute.options || attribute.values || [], "[]"),
      safeJsonStringify(attribute)
    ]
  );
};

exports.upsertBrand = async ({ country_code = "LK", category_id, brand = {} }) => {
  const brandName = brand.name || brand.brand_name || brand.BrandName;
  if (!category_id || !brandName) return null;

  await db.query(
    `
    INSERT INTO daraz_category_brands (
      country_code, category_id, brand_id, brand_name, status, raw_json, last_synced_at
    )
    VALUES (?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      brand_id = VALUES(brand_id),
      status = VALUES(status),
      raw_json = VALUES(raw_json),
      last_synced_at = NOW()
    `,
    [country_code, category_id, brand.id || brand.brand_id || null, brandName, brand.status || "active", safeJsonStringify(brand)]
  );
};

exports.getCategories = async ({ country_code = "LK", leaf_only = false, search = null, limit = 100 } = {}) => {
  const where = ["country_code = ?"];
  const params = [country_code];

  if (leaf_only === true || leaf_only === "true") where.push("is_leaf = 1");
  if (search) {
    where.push("(category_name LIKE ? OR category_path LIKE ? OR CAST(category_id AS CHAR) LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  params.push(Math.min(Number(limit) || 100, 500));

  const [rows] = await db.query(
    `SELECT * FROM daraz_categories WHERE ${where.join(" AND ")} ORDER BY category_path ASC, category_name ASC LIMIT ?`,
    params
  );

  return rows;
};

exports.getAttributes = async (categoryId, countryCode = "LK") => {
  const [rows] = await db.query(
    `SELECT * FROM daraz_category_attributes WHERE country_code = ? AND category_id = ? ORDER BY is_mandatory DESC, attribute_name ASC`,
    [countryCode, categoryId]
  );
  return rows;
};

exports.getBrands = async (categoryId, countryCode = "LK") => {
  const [rows] = await db.query(
    `SELECT * FROM daraz_category_brands WHERE country_code = ? AND category_id = ? ORDER BY brand_name ASC`,
    [countryCode, categoryId]
  );
  return rows;
};
