const db = require("../../../config/product_management_db/product_management_db");

const TABLE_NAME = "product_images";
let tableMetaCache = null;

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function getTableMeta(forceRefresh = false) {
  if (tableMetaCache && !forceRefresh) return tableMetaCache;

  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(TABLE_NAME)}`);

  const columns = rows.map((row) => ({
    name: row.Field,
    type: String(row.Type || "").toLowerCase(),
    key: row.Key,
  }));

  tableMetaCache = {
    columns,
    columnNames: columns.map((column) => column.name),
    columnSet: new Set(columns.map((column) => column.name)),
    primaryKey: columns.find((column) => column.key === "PRI")?.name || "id",
    searchableColumns: columns
      .filter((column) => /(char|text|json|enum|set)/i.test(column.type))
      .map((column) => column.name),
  };

  return tableMetaCache;
}

function clearTableMetaCache() {
  tableMetaCache = null;
}

function hasColumn(meta, columnName) {
  return meta.columnSet.has(columnName);
}

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    String(value).trim() === "null" ||
    String(value).trim() === "undefined"
  );
}

function firstValid(...values) {
  for (const value of values) {
    if (!isEmpty(value)) return value;
  }

  return null;
}

function cleanSku(value) {
  if (isEmpty(value)) return null;
  return String(value).trim();
}

function normalizeIncomingPayload(payload = {}) {
  const normalized = { ...payload };

  /**
   * SKU support
   * Frontend can send any one of these:
   * sku / product_sku / variant_sku / child_sku / local_sku
   */
  const sku = cleanSku(
    firstValid(
      normalized.sku,
      normalized.product_sku,
      normalized.variant_sku,
      normalized.child_sku,
      normalized.local_sku
    )
  );

  if (sku) {
    normalized.sku = sku;
  }

  return normalized;
}

function splitValues(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeListParams(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 1000);

  const offset =
    query.offset !== undefined
      ? Math.max(Number(query.offset || 0), 0)
      : (page - 1) * limit;

  return { page, limit, offset };
}

function pickAllowedData(meta, payload = {}) {
  const blocked = new Set([
    meta.primaryKey,
    "created_at",
    "updated_at",
    "deleted_at",
  ]);

  const data = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (!meta.columnSet.has(key)) return;
    if (blocked.has(key)) return;
    if (value === undefined) return;

    data[key] = value;
  });

  return data;
}

function normalizeProductImageData(data = {}) {
  const normalized = { ...data };

  if (Object.prototype.hasOwnProperty.call(normalized, "sku")) {
    normalized.sku = cleanSku(normalized.sku);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "product_id")) {
    const productId = Number(normalized.product_id);
    normalized.product_id = Number.isFinite(productId) ? productId : normalized.product_id;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "variant_id")) {
    if (isEmpty(normalized.variant_id)) {
      normalized.variant_id = null;
    } else {
      const variantId = Number(normalized.variant_id);
      normalized.variant_id = Number.isFinite(variantId) ? variantId : normalized.variant_id;
    }
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "sort_order")) {
    const sortOrder = Number(normalized.sort_order);

    normalized.sort_order =
      Number.isFinite(sortOrder) && sortOrder >= 1
        ? Math.floor(sortOrder)
        : 1;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "is_main")) {
    normalized.is_main = Number(normalized.is_main) === 1 ? 1 : 0;
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "size_bytes") &&
    !Object.prototype.hasOwnProperty.call(normalized, "file_size")
  ) {
    normalized.file_size = normalized.size_bytes;
  }

  delete normalized.size_bytes;

  return normalized;
}

function addAuditFields(meta, data, mode, userId) {
  const userValue = userId || null;

  if (mode === "create") {
    if (hasColumn(meta, "created_by") && data.created_by === undefined) {
      data.created_by = userValue;
    }

    if (hasColumn(meta, "uploaded_by") && data.uploaded_by === undefined) {
      data.uploaded_by = userValue;
    }

    if (hasColumn(meta, "updated_by") && data.updated_by === undefined) {
      data.updated_by = userValue;
    }
  }

  if (mode === "update") {
    if (hasColumn(meta, "updated_by") && data.updated_by === undefined) {
      data.updated_by = userValue;
    }
  }

  return data;
}

function addInOrEqualCondition(where, values, column, rawValue) {
  const list = splitValues(rawValue);

  if (!list.length) return;

  if (list.length === 1) {
    where.push(`${qid(column)} = ?`);
    values.push(list[0]);
    return;
  }

  where.push(`${qid(column)} IN (${list.map(() => "?").join(", ")})`);
  values.push(...list);
}

function buildWhere(meta, query = {}) {
  const where = [];
  const values = [];

  if (hasColumn(meta, "deleted_at") && String(query.include_deleted || "") !== "1") {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  Object.entries(query || {}).forEach(([key, value]) => {
    if (
      [
        "page",
        "limit",
        "offset",
        "search",
        "sort_by",
        "sort_dir",
        "include_deleted",
      ].includes(key)
    ) {
      return;
    }

    if (isEmpty(value)) return;
    if (!meta.columnSet.has(key)) return;

    addInOrEqualCondition(where, values, key, value);
  });

  const search = String(query.search || "").trim();

  if (search && meta.searchableColumns.length) {
    const columns = meta.searchableColumns.slice(0, 12);

    where.push(
      `(${columns.map((column) => `${qid(column)} LIKE ?`).join(" OR ")})`
    );

    columns.forEach(() => values.push(`%${search}%`));
  }

  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

async function list(params = {}) {
  const meta = await getTableMeta();
  const { page, limit, offset } = normalizeListParams(params);
  const where = buildWhere(meta, params);

  const preferredSort = [
    "is_main",
    "sort_order",
    "updated_at",
    "created_at",
    meta.primaryKey,
  ].find((column) => hasColumn(meta, column));

  const requestedSort = String(params.sort_by || "").trim();
  const sortBy = hasColumn(meta, requestedSort) ? requestedSort : preferredSort;

  let sortDir =
    String(params.sort_dir || "").toUpperCase() === "DESC" ? "DESC" : "ASC";

  if (sortBy === "is_main") {
    sortDir = "DESC";
  }

  const orderParts = [];

  if (hasColumn(meta, "is_main")) {
    orderParts.push(`${qid("is_main")} DESC`);
  }

  if (hasColumn(meta, "sort_order")) {
    orderParts.push(`${qid("sort_order")} ASC`);
  }

  if (sortBy && !["is_main", "sort_order"].includes(sortBy)) {
    orderParts.push(`${qid(sortBy)} ${sortDir}`);
  }

  orderParts.push(`${qid(meta.primaryKey)} DESC`);

  const orderBy = orderParts.join(", ");

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} ${where.clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...where.values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM ${qid(TABLE_NAME)} ${where.clause}`,
    where.values
  );

  const total = Number(countRows?.[0]?.total || 0);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      offset,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

async function findByImagePath(imagePath, excludeId = null) {
  const meta = await getTableMeta();

  if (!imagePath || !hasColumn(meta, "image_path")) return [];

  const where = [`${qid("image_path")} = ?`];
  const values = [imagePath];

  if (hasColumn(meta, "deleted_at")) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  if (excludeId) {
    where.push(`${qid(meta.primaryKey)} != ?`);
    values.push(excludeId);
  }

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} WHERE ${where.join(" AND ")}`,
    values
  );

  return rows;
}

async function findById(id) {
  const meta = await getTableMeta();

  const where = [`${qid(meta.primaryKey)} = ?`];
  const values = [id];

  if (hasColumn(meta, "deleted_at")) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} WHERE ${where.join(" AND ")} LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function create(payload = {}, options = {}) {
  const meta = await getTableMeta();

  const incomingPayload = normalizeIncomingPayload(payload);
  const pickedData = pickAllowedData(meta, incomingPayload);
  const normalizedData = normalizeProductImageData(pickedData);
  const data = addAuditFields(meta, normalizedData, "create", options.userId);

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)} (${columns.map(qid).join(", ")}) VALUES (${columns
      .map(() => "?")
      .join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

async function updateById(id, payload = {}, options = {}) {
  const meta = await getTableMeta();

  const incomingPayload = normalizeIncomingPayload(payload);
  const pickedData = pickAllowedData(meta, incomingPayload);
  const normalizedData = normalizeProductImageData(pickedData);
  const data = addAuditFields(meta, normalizedData, "update", options.userId);

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const assignments = Object.keys(data)
    .map((column) => `${qid(column)} = ?`)
    .join(", ");

  const [result] = await db.query(
    `UPDATE ${qid(TABLE_NAME)} SET ${assignments} WHERE ${qid(meta.primaryKey)} = ?`,
    [...Object.values(data), id]
  );

  if (!result.affectedRows) return null;

  return findById(id);
}

async function removeById(id, options = {}) {
  const meta = await getTableMeta();

  const existing = await findById(id);
  if (!existing) return null;

  if (hasColumn(meta, "deleted_at")) {
    const data = {
      deleted_at: new Date(),
    };

    if (hasColumn(meta, "updated_by")) {
      data.updated_by = options.userId || null;
    }

    const assignments = Object.keys(data)
      .map((column) => `${qid(column)} = ?`)
      .join(", ");

    await db.query(
      `UPDATE ${qid(TABLE_NAME)} SET ${assignments} WHERE ${qid(meta.primaryKey)} = ?`,
      [...Object.values(data), id]
    );
  } else {
    await db.query(
      `DELETE FROM ${qid(TABLE_NAME)} WHERE ${qid(meta.primaryKey)} = ?`,
      [id]
    );
  }

  return existing;
}

function normalizeSkuKey(value) {
  return String(value || "").trim().toUpperCase();
}

async function getAssignedLookup() {
  // Local products/variants have no main_image column — SKU is the
  // system-wide key here, not product_id, so local assignment is
  // determined by matching product_images.sku against live SKUs, not
  // by an image-URL column on `products`.
  const [productSkuRows] = await db.query(
    `SELECT sku FROM products WHERE deleted_at IS NULL AND sku IS NOT NULL AND sku <> ''`
  );

  const [variantSkuRows] = await db.query(
    `SELECT variant_sku FROM product_variants WHERE deleted_at IS NULL AND variant_sku IS NOT NULL AND variant_sku <> ''`
  );

  const [darazRows] = await db.query(
    `SELECT main_image FROM daraz_products WHERE main_image IS NOT NULL AND main_image <> ''`
  );

  const [wooRows] = await db.query(
    `SELECT image_src FROM woo_product_images WHERE image_src IS NOT NULL AND image_src <> ''`
  );

  const urls = new Set();
  darazRows.forEach((row) => urls.add(row.main_image));
  wooRows.forEach((row) => urls.add(row.image_src));

  const skus = new Set();
  productSkuRows.forEach((row) => skus.add(normalizeSkuKey(row.sku)));
  variantSkuRows.forEach((row) => skus.add(normalizeSkuKey(row.variant_sku)));

  return { urls, skus };
}

function isAssigned(row, assignedLookup) {
  if (!row) return false;
  if (row.product_id) return true;
  if (row.variant_id) return true;

  const lookup = assignedLookup || { urls: new Set(), skus: new Set() };

  if (row.sku && lookup.skus.has(normalizeSkuKey(row.sku))) return true;
  if (row.image_url && lookup.urls.has(row.image_url)) return true;
  if (row.image_path && lookup.urls.has(row.image_path)) return true;

  return false;
}

async function insertMatching(payload = {}) {
  const meta = await getTableMeta();

  const incomingPayload = normalizeIncomingPayload(payload);
  const pickedData = pickAllowedData(meta, incomingPayload);
  const data = normalizeProductImageData(pickedData);

  if (!Object.keys(data).length) return null;

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)} (${columns.map(qid).join(", ")}) VALUES (${columns
      .map(() => "?")
      .join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

module.exports = {
  tableName: TABLE_NAME,
  list,
  findById,
  findByImagePath,
  create,
  updateById,
  removeById,
  insertMatching,
  clearTableMetaCache,
  getAssignedLookup,
  isAssigned,
};