const db = require("../../../config/price_management_db/price_management_db");

const TABLE_NAME = "product_prices";
let tableMetaCache = null;

const SYSTEM_COLUMNS = new Set([
  "created_at",
  "deleted_at",
]);

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toMoney(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return fallback;
  return Number(numberValue.toFixed(2));
}

function getUserId(options = {}) {
  return options.userId || options.user_id || null;
}

async function getTableMeta(forceRefresh = false) {
  if (tableMetaCache && !forceRefresh) return tableMetaCache;

  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(TABLE_NAME)}`);

  const columns = rows.map((row) => ({
    name: row.Field,
    type: String(row.Type || "").toLowerCase(),
    key: row.Key,
    extra: String(row.Extra || "").toLowerCase(),
  }));

  const primaryKey = columns.find((column) => column.key === "PRI")?.name || "id";

  tableMetaCache = {
    columns,
    columnNames: columns.map((column) => column.name),
    columnSet: new Set(columns.map((column) => column.name)),
    primaryKey,
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
  return Boolean(meta?.columnSet?.has(columnName));
}

function normalizeListParams(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 200);

  const offset =
    query.offset !== undefined
      ? Math.max(Number(query.offset || 0), 0)
      : (page - 1) * limit;

  return { page, limit, offset };
}

function getSkuFromPayload(payload = {}) {
  return cleanString(
    payload.sku ||
      payload.item_sku ||
      payload.product_sku ||
      payload.variant_sku ||
      payload.local_sku ||
      payload.seller_sku
  );
}

function normalizeColumnValue(columnType, value) {
  if (value === undefined) return undefined;

  if (value === null) return null;

  if (/decimal|float|double/.test(columnType)) {
    return toMoney(value);
  }

  if (/int|bigint|tinyint|smallint|mediumint/.test(columnType)) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  if (/date|time|year/.test(columnType)) {
    return value || null;
  }

  return cleanString(value);
}

function normalizePricePayload(meta, payload = {}, mode = "create") {
  const data = {};

  const sku = getSkuFromPayload(payload);

  if (hasColumn(meta, "sku") && sku !== null) {
    data.sku = sku;
  }

  for (const column of meta.columns) {
    const columnName = column.name;

    if (columnName === meta.primaryKey) continue;
    if (SYSTEM_COLUMNS.has(columnName)) continue;
    if (columnName === "sku") continue;
    if (columnName === "created_by") continue;
    if (columnName === "updated_by") continue;
    if (columnName === "updated_at") continue;

    if (payload[columnName] !== undefined) {
      data[columnName] = normalizeColumnValue(column.type, payload[columnName]);
    }
  }

  if (mode === "create") {
    if (hasColumn(meta, "cost_price") && data.cost_price === undefined) {
      data.cost_price = 0;
    }

    if (hasColumn(meta, "sale_price") && data.sale_price === undefined) {
      data.sale_price = 0;
    }
  }

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

  if (hasColumn(meta, "updated_at")) {
    data.updated_at = new Date();
  }

  return data;
}

function buildWhere(meta, query = {}) {
  const where = [];
  const values = [];

  const sku = getSkuFromPayload(query);

  if (sku && hasColumn(meta, "sku")) {
    where.push(`${qid("sku")} = ?`);
    values.push(sku);
  }

  const search = cleanString(query.search || query.keyword || query.q);

  if (search && hasColumn(meta, "sku")) {
    where.push(`${qid("sku")} LIKE ?`);
    values.push(`%${search}%`);
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

  const preferredSort = ["created_at", meta.primaryKey].find((column) =>
    hasColumn(meta, column)
  );

  const requestedSort = String(params.sort_by || "").trim();
  const sortBy = hasColumn(meta, requestedSort)
    ? requestedSort
    : preferredSort || meta.primaryKey;

  const sortDir =
    String(params.sort_dir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const [rows] = await db.query(
    `
    SELECT *
    FROM ${qid(TABLE_NAME)}
    ${where.clause}
    ORDER BY ${qid(sortBy)} ${sortDir}
    LIMIT ? OFFSET ?
    `,
    [...where.values, limit, offset]
  );

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM ${qid(TABLE_NAME)}
    ${where.clause}
    `,
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

  const [rows] = await db.query(
    `
    SELECT *
    FROM ${qid(TABLE_NAME)}
    WHERE ${qid(meta.primaryKey)} = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function findBySku(sku) {
  const meta = await getTableMeta();

  if (!hasColumn(meta, "sku")) {
    throw new Error("SKU column is missing in product_prices table.");
  }

  const cleanSku = cleanString(sku);

  if (!cleanSku) return null;

  const [rows] = await db.query(
    `
    SELECT *
    FROM ${qid(TABLE_NAME)}
    WHERE ${qid("sku")} = ?
    LIMIT 1
    `,
    [cleanSku]
  );

  return rows[0] || null;
}

async function create(payload = {}, options = {}) {
  const meta = await getTableMeta();

  const data = addAuditFields(
    meta,
    normalizePricePayload(meta, payload, "create"),
    "create",
    getUserId(options)
  );

  if (hasColumn(meta, "sku") && !data.sku) {
    const error = new Error("SKU is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `
    INSERT INTO ${qid(TABLE_NAME)}
    (${columns.map(qid).join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    `,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

async function updateById(id, payload = {}, options = {}) {
  const meta = await getTableMeta();

  const existing = await findById(id);

  if (!existing) {
    return null;
  }

  const data = addAuditFields(
    meta,
    normalizePricePayload(meta, payload, "update"),
    "update",
    getUserId(options)
  );

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const assignments = Object.keys(data)
    .map((column) => `${qid(column)} = ?`)
    .join(", ");

  const values = [...Object.values(data), id];

  const [result] = await db.query(
    `
    UPDATE ${qid(TABLE_NAME)}
    SET ${assignments}
    WHERE ${qid(meta.primaryKey)} = ?
    `,
    values
  );

  console.log("[PRODUCT_PRICE_UPDATE_BY_ID]", {
    id,
    data,
    affectedRows: result.affectedRows,
    changedRows: result.changedRows,
  });

  if (!result.affectedRows) {
    return null;
  }

  return findById(id);
}

async function updateBySku(sku, payload = {}, options = {}) {
  const meta = await getTableMeta();

  if (!hasColumn(meta, "sku")) {
    throw new Error("SKU column is missing in product_prices table.");
  }

  const cleanSku = cleanString(sku || payload.sku);

  if (!cleanSku) {
    const error = new Error("SKU is required.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await findBySku(cleanSku);

  if (!existing) {
    return null;
  }

  const data = addAuditFields(
    meta,
    normalizePricePayload(meta, payload, "update"),
    "update",
    getUserId(options)
  );

  delete data.sku;

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const assignments = Object.keys(data)
    .map((column) => `${qid(column)} = ?`)
    .join(", ");

  const values = [...Object.values(data), cleanSku];

  const [result] = await db.query(
    `
    UPDATE ${qid(TABLE_NAME)}
    SET ${assignments}
    WHERE ${qid("sku")} = ?
    `,
    values
  );

  console.log("[PRODUCT_PRICE_UPDATE_BY_SKU]", {
    sku: cleanSku,
    data,
    affectedRows: result.affectedRows,
    changedRows: result.changedRows,
  });

  if (!result.affectedRows) {
    return null;
  }

  return findBySku(cleanSku);
}

async function upsertBySku(payload = {}, options = {}) {
  const meta = await getTableMeta();

  if (!hasColumn(meta, "sku")) {
    throw new Error("SKU column is missing in product_prices table.");
  }

  const cleanSku = getSkuFromPayload(payload);

  if (!cleanSku) {
    const error = new Error("SKU is required.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await findBySku(cleanSku);

  if (existing) {
    return updateBySku(cleanSku, payload, options);
  }

  return create(
    {
      ...payload,
      sku: cleanSku,
    },
    options
  );
}

async function removeById(id) {
  const meta = await getTableMeta();

  const existing = await findById(id);

  if (!existing) return null;

  await db.query(
    `
    DELETE FROM ${qid(TABLE_NAME)}
    WHERE ${qid(meta.primaryKey)} = ?
    `,
    [id]
  );

  return existing;
}

async function removeBySku(sku) {
  const meta = await getTableMeta();

  if (!hasColumn(meta, "sku")) {
    throw new Error("SKU column is missing in product_prices table.");
  }

  const existing = await findBySku(sku);

  if (!existing) return null;

  await db.query(
    `
    DELETE FROM ${qid(TABLE_NAME)}
    WHERE ${qid("sku")} = ?
    `,
    [existing.sku]
  );

  return existing;
}

async function insertMatching(payload = {}) {
  const meta = await getTableMeta();

  const data = normalizePricePayload(meta, payload, "create");

  if (hasColumn(meta, "sku") && !data.sku) {
    return null;
  }

  if (!Object.keys(data).length) {
    return null;
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `
    INSERT INTO ${qid(TABLE_NAME)}
    (${columns.map(qid).join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    `,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
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
  clearTableMetaCache,
};