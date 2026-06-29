const db = require("../../../config/inventory_management_db/inventory_management_db");

const TABLE_NAME = "product_inventory";
let tableMetaCache = null;

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function normalizeSku(value) {
  return String(value || "").trim();
}

function getPayloadSku(payload = {}) {
  return normalizeSku(
    payload.sku ||
      payload.variant_sku ||
      payload.product_sku ||
      payload.local_sku ||
      payload.seller_sku ||
      ""
  );
}

function toSafeInt(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;

  return Math.max(Math.trunc(numberValue), 0);
}

function makeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getTableMeta() {
  if (tableMetaCache) return tableMetaCache;

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

function hasColumn(meta, columnName) {
  return meta.columnSet.has(columnName);
}

function assertSkuColumn(meta) {
  if (!hasColumn(meta, "sku")) {
    throw makeError(
      "product_inventory table does not have sku column. Please add sku column first.",
      500
    );
  }
}

function normalizeListParams(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 500);
  const offset =
    query.offset !== undefined
      ? Math.max(Number(query.offset || 0), 0)
      : (page - 1) * limit;

  return { page, limit, offset };
}

function pickAllowedData(meta, payload = {}) {
  const blocked = new Set([
    meta.primaryKey,
    "product_id",
    "variant_id",
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

function addAuditFields(meta, data, mode, userId) {
  const userValue = userId || null;

  if (mode === "create") {
    if (hasColumn(meta, "created_by") && data.created_by === undefined) {
      data.created_by = userValue;
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

function normalizeInventoryData(meta, payload = {}, mode = "create", existing = {}) {
  assertSkuColumn(meta);

  const data = pickAllowedData(meta, payload);
  const sku = getPayloadSku(payload);

  if (sku) {
    data.sku = sku;
  }

  if (mode === "create" && !normalizeSku(data.sku)) {
    throw makeError("SKU is required for inventory.", 400);
  }

  if (data.sku !== undefined) {
    data.sku = normalizeSku(data.sku);

    if (!data.sku) {
      throw makeError("SKU cannot be empty.", 400);
    }
  }

  if (hasColumn(meta, "stock_qty") && data.stock_qty !== undefined) {
    data.stock_qty = toSafeInt(data.stock_qty, existing.stock_qty || 0);
  }

  if (hasColumn(meta, "reserved_qty") && data.reserved_qty !== undefined) {
    data.reserved_qty = toSafeInt(data.reserved_qty, existing.reserved_qty || 0);
  }

  if (hasColumn(meta, "low_stock_alert_qty") && data.low_stock_alert_qty !== undefined) {
    data.low_stock_alert_qty = toSafeInt(
      data.low_stock_alert_qty,
      existing.low_stock_alert_qty || 5
    );
  }

  const shouldRecalculateAvailable =
    hasColumn(meta, "available_qty") &&
    (mode === "create" ||
      data.stock_qty !== undefined ||
      data.reserved_qty !== undefined ||
      data.available_qty === undefined);

  if (shouldRecalculateAvailable) {
    const stockQty =
      data.stock_qty !== undefined
        ? data.stock_qty
        : toSafeInt(existing.stock_qty, 0);

    const reservedQty =
      data.reserved_qty !== undefined
        ? data.reserved_qty
        : toSafeInt(existing.reserved_qty, 0);

    data.available_qty = Math.max(stockQty - reservedQty, 0);
  } else if (hasColumn(meta, "available_qty") && data.available_qty !== undefined) {
    data.available_qty = toSafeInt(data.available_qty, existing.available_qty || 0);
  }

  return data;
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

    if (value === undefined || value === null || value === "") return;
    if (!meta.columnSet.has(key)) return;

    where.push(`${qid(key)} = ?`);
    values.push(value);
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
  assertSkuColumn(meta);

  const { page, limit, offset } = normalizeListParams(params);
  const where = buildWhere(meta, params);

  const preferredSort = ["updated_at", "created_at", meta.primaryKey].find((column) =>
    hasColumn(meta, column)
  );

  const requestedSort = String(params.sort_by || "").trim();
  const sortBy = hasColumn(meta, requestedSort) ? requestedSort : preferredSort;
  const sortDir =
    String(params.sort_dir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const [rows] = await db.query(
    `SELECT *
     FROM ${qid(TABLE_NAME)}
     ${where.clause}
     ORDER BY ${qid(sortBy)} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...where.values, limit, offset]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM ${qid(TABLE_NAME)}
     ${where.clause}`,
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

async function findById(id) {
  const meta = await getTableMeta();

  const where = [`${qid(meta.primaryKey)} = ?`];
  const values = [id];

  if (hasColumn(meta, "deleted_at")) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  const [rows] = await db.query(
    `SELECT *
     FROM ${qid(TABLE_NAME)}
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function findBySku(sku) {
  const meta = await getTableMeta();
  assertSkuColumn(meta);

  const cleanSku = normalizeSku(sku);
  if (!cleanSku) return null;

  const where = [`${qid("sku")} = ?`];
  const values = [cleanSku];

  if (hasColumn(meta, "deleted_at")) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  const [rows] = await db.query(
    `SELECT *
     FROM ${qid(TABLE_NAME)}
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function insertRow(meta, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)}
     (${columns.map(qid).join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

async function create(payload = {}, options = {}) {
  const meta = await getTableMeta();
  assertSkuColumn(meta);

  let data = normalizeInventoryData(meta, payload, "create");
  data = addAuditFields(meta, data, "create", options.userId);

  if (!Object.keys(data).length) {
    throw makeError(`No valid columns supplied for ${TABLE_NAME}.`, 400);
  }

  const existing = await findBySku(data.sku);

  if (existing) {
    return updateById(existing[meta.primaryKey], data, options);
  }

  return insertRow(meta, data);
}

async function updateById(id, payload = {}, options = {}) {
  const meta = await getTableMeta();
  assertSkuColumn(meta);

  const existing = await findById(id);
  if (!existing) return null;

  let data = normalizeInventoryData(meta, payload, "update", existing);
  data = addAuditFields(meta, data, "update", options.userId);

  if (!Object.keys(data).length) {
    throw makeError(`No valid columns supplied for ${TABLE_NAME}.`, 400);
  }

  const assignments = Object.keys(data)
    .map((column) => `${qid(column)} = ?`)
    .join(", ");

  const [result] = await db.query(
    `UPDATE ${qid(TABLE_NAME)}
     SET ${assignments}
     WHERE ${qid(meta.primaryKey)} = ?`,
    [...Object.values(data), id]
  );

  if (!result.affectedRows) return null;

  return findById(id);
}

async function updateBySku(sku, payload = {}, options = {}) {
  const meta = await getTableMeta();
  assertSkuColumn(meta);

  const existing = await findBySku(sku);
  if (!existing) return null;

  return updateById(existing[meta.primaryKey], payload, options);
}

async function upsertBySku(sku, payload = {}, options = {}) {
  const cleanSku = normalizeSku(sku || getPayloadSku(payload));

  if (!cleanSku) {
    throw makeError("SKU is required for inventory upsert.", 400);
  }

  const existing = await findBySku(cleanSku);

  if (existing) {
    return updateBySku(cleanSku, { ...payload, sku: cleanSku }, options);
  }

  return create({ ...payload, sku: cleanSku }, options);
}

async function removeById(id, options = {}) {
  const meta = await getTableMeta();

  const existing = await findById(id);
  if (!existing) return null;

  if (hasColumn(meta, "deleted_at")) {
    const data = { deleted_at: new Date() };

    if (hasColumn(meta, "updated_by")) {
      data.updated_by = options.userId || null;
    }

    const assignments = Object.keys(data)
      .map((column) => `${qid(column)} = ?`)
      .join(", ");

    await db.query(
      `UPDATE ${qid(TABLE_NAME)}
       SET ${assignments}
       WHERE ${qid(meta.primaryKey)} = ?`,
      [...Object.values(data), id]
    );
  } else {
    await db.query(
      `DELETE FROM ${qid(TABLE_NAME)}
       WHERE ${qid(meta.primaryKey)} = ?`,
      [id]
    );
  }

  return existing;
}

async function removeBySku(sku, options = {}) {
  const meta = await getTableMeta();
  assertSkuColumn(meta);

  const existing = await findBySku(sku);
  if (!existing) return null;

  return removeById(existing[meta.primaryKey], options);
}

async function insertMatching(payload = {}) {
  const meta = await getTableMeta();
  assertSkuColumn(meta);

  const sku = getPayloadSku(payload);

  if (!sku) {
    throw makeError("SKU is required for inventory insert.", 400);
  }

  return upsertBySku(sku, payload);
}

function clearMetaCache() {
  tableMetaCache = null;
}

module.exports = {
  tableName: TABLE_NAME,

  list,

  findById,
  findBySku,

  create,

  updateById,
  updateBySku,
  upsertBySku,

  removeById,
  removeBySku,

  insertMatching,

  clearMetaCache,
};