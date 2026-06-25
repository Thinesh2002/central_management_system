const db = require("../../../config/product_management_db/product_management_db");

const TABLE_NAME = "product_attribute_values";
let tableMetaCache = null;

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
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

function normalizeListParams(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 200);
  const offset = query.offset !== undefined ? Math.max(Number(query.offset || 0), 0) : (page - 1) * limit;
  return { page, limit, offset };
}

function pickAllowedData(meta, payload = {}, mode = "create") {
  const blocked = new Set([meta.primaryKey, "created_at", "updated_at", "deleted_at"]);
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
    if (hasColumn(meta, "created_by") && data.created_by === undefined) data.created_by = userValue;
    if (hasColumn(meta, "updated_by") && data.updated_by === undefined) data.updated_by = userValue;
  }

  if (mode === "update") {
    if (hasColumn(meta, "updated_by") && data.updated_by === undefined) data.updated_by = userValue;
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
    if (["page", "limit", "offset", "search", "sort_by", "sort_dir", "include_deleted"].includes(key)) return;
    if (value === undefined || value === null || value === "") return;
    if (!meta.columnSet.has(key)) return;

    where.push(`${qid(key)} = ?`);
    values.push(value);
  });

  const search = String(query.search || "").trim();
  if (search && meta.searchableColumns.length) {
    const columns = meta.searchableColumns.slice(0, 12);
    where.push(`(${columns.map((column) => `${qid(column)} LIKE ?`).join(" OR ")})`);
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

  const preferredSort = ["updated_at", "created_at", meta.primaryKey].find((column) => hasColumn(meta, column));
  const requestedSort = String(params.sort_by || "").trim();
  const sortBy = hasColumn(meta, requestedSort) ? requestedSort : preferredSort;
  const sortDir = String(params.sort_dir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} ${where.clause} ORDER BY ${qid(sortBy)} ${sortDir} LIMIT ? OFFSET ?`,
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

async function findById(id) {
  const meta = await getTableMeta();
  const where = [`${qid(meta.primaryKey)} = ?`];
  const values = [id];

  if (hasColumn(meta, "deleted_at")) where.push(`${qid("deleted_at")} IS NULL`);

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} WHERE ${where.join(" AND ")} LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function create(payload = {}, options = {}) {
  const meta = await getTableMeta();
  const data = addAuditFields(meta, pickAllowedData(meta, payload, "create"), "create", options.userId);

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)} (${columns.map(qid).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

async function updateById(id, payload = {}, options = {}) {
  const meta = await getTableMeta();
  const data = addAuditFields(meta, pickAllowedData(meta, payload, "update"), "update", options.userId);

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const assignments = Object.keys(data).map((column) => `${qid(column)} = ?`).join(", ");

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
    const data = { deleted_at: new Date() };
    if (hasColumn(meta, "updated_by")) data.updated_by = options.userId || null;

    const assignments = Object.keys(data).map((column) => `${qid(column)} = ?`).join(", ");

    await db.query(
      `UPDATE ${qid(TABLE_NAME)} SET ${assignments} WHERE ${qid(meta.primaryKey)} = ?`,
      [...Object.values(data), id]
    );
  } else {
    await db.query(`DELETE FROM ${qid(TABLE_NAME)} WHERE ${qid(meta.primaryKey)} = ?`, [id]);
  }

  return existing;
}

async function insertMatching(payload = {}) {
  const meta = await getTableMeta();
  const data = pickAllowedData(meta, payload, "create");

  if (!Object.keys(data).length) return null;

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)} (${columns.map(qid).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

module.exports = {
  tableName: TABLE_NAME,
  list,
  findById,
  create,
  updateById,
  removeById,
  insertMatching,
};
