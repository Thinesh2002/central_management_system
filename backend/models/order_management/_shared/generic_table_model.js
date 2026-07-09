const db = require("../../../config/order_management_db/order_management_db");

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

const metaCache = new Map();

// mysql2 (strict mode) rejects JS's native ISO 8601 format ("...T...Z") for
// DATE/DATETIME/TIMESTAMP columns. Dynamic payloads in this module often
// carry values that started life as a JS Date (JSON round-tripped through a
// form, or serialized by axios/Express) or as a marketplace API's own date
// string — neither is guaranteed to already be in MySQL's "YYYY-MM-DD
// HH:MM:SS" shape, so every write is normalized before it reaches SQL.
function toMysqlDateTime(value) {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  if (typeof value === "number") {
    const ms = value > 0 && value < 10000000000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace("T", " ");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    // Already MySQL-safe ("YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS") — leave as-is.
    if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(trimmed)) return trimmed;

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return trimmed; // unparseable — let MySQL be the judge
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  return value;
}

async function getTableMeta(tableName) {
  if (metaCache.has(tableName)) return metaCache.get(tableName);

  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(tableName)}`);

  const columns = rows.map((row) => ({
    name: row.Field,
    type: String(row.Type || "").toLowerCase(),
  }));

  const meta = {
    columnNames: columns.map((column) => column.name),
    columnSet: new Set(columns.map((column) => column.name)),
    searchableColumns: columns
      .filter((column) => /(char|text|json|enum)/i.test(column.type))
      .map((column) => column.name),
    dateColumns: new Set(
      columns.filter((column) => /^(date|datetime|timestamp)/.test(column.type)).map((column) => column.name)
    ),
  };

  metaCache.set(tableName, meta);
  return meta;
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

function buildWhere(meta, query = {}, dateColumn) {
  const where = [];
  const values = [];

  const reserved = new Set([
    "page",
    "limit",
    "offset",
    "search",
    "sort_by",
    "sort_dir",
    "date_from",
    "date_to",
  ]);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (reserved.has(key)) return;
    if (value === undefined || value === null || value === "") return;
    if (!meta.columnSet.has(key)) return;

    where.push(`${qid(key)} = ?`);
    values.push(value);
  });

  const search = String(query.search || "").trim();

  if (search && meta.searchableColumns.length) {
    const columns = meta.searchableColumns.slice(0, 15);

    where.push(`(${columns.map((column) => `${qid(column)} LIKE ?`).join(" OR ")})`);
    columns.forEach(() => values.push(`%${search}%`));
  }

  if (dateColumn && meta.columnSet.has(dateColumn)) {
    if (query.date_from) {
      where.push(`${qid(dateColumn)} >= ?`);
      values.push(query.date_from);
    }

    if (query.date_to) {
      where.push(`${qid(dateColumn)} <= ?`);
      values.push(`${query.date_to} 23:59:59`);
    }
  }

  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

function createGenericModel(tableName, { dateColumn = "created_at", defaultSort = "id" } = {}) {
  async function list(params = {}) {
    const meta = await getTableMeta(tableName);
    const { page, limit, offset } = normalizeListParams(params);
    const where = buildWhere(meta, params, dateColumn);

    const sortBy = meta.columnSet.has(params.sort_by) ? params.sort_by : defaultSort;
    const sortDir = String(params.sort_dir || "").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const [rows] = await db.query(
      `SELECT * FROM ${qid(tableName)} ${where.clause} ORDER BY ${qid(sortBy)} ${sortDir} LIMIT ? OFFSET ?`,
      [...where.values, limit, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM ${qid(tableName)} ${where.clause}`,
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
    const [rows] = await db.query(
      `SELECT * FROM ${qid(tableName)} WHERE ${qid("id")} = ? LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  }

  async function findByColumn(column, value) {
    if (!value) return [];

    const [rows] = await db.query(
      `SELECT * FROM ${qid(tableName)} WHERE ${qid(column)} = ?`,
      [value]
    );

    return rows;
  }

  // Only ever writes columns that genuinely exist on the live table (via
  // SHOW COLUMNS) — this lets callers build payloads without needing to
  // hardcode the exact schema of tables owned by a separate project.
  async function pickAllowedData(data = {}) {
    const meta = await getTableMeta(tableName);
    const picked = {};

    Object.entries(data || {}).forEach(([key, value]) => {
      if (meta.columnSet.has(key) && value !== undefined) {
        picked[key] = meta.dateColumns.has(key) ? toMysqlDateTime(value) : value;
      }
    });

    return picked;
  }

  async function create(data = {}) {
    const picked = await pickAllowedData(data);

    if (!Object.keys(picked).length) {
      throw new Error(`No valid columns to insert into ${tableName}`);
    }

    const columns = Object.keys(picked);
    const placeholders = columns.map(() => "?").join(",");

    const [result] = await db.query(
      `INSERT INTO ${qid(tableName)} (${columns.map(qid).join(",")}) VALUES (${placeholders})`,
      columns.map((column) => picked[column])
    );

    return findById(result.insertId);
  }

  async function update(id, data = {}) {
    const picked = await pickAllowedData(data);

    if (!Object.keys(picked).length) {
      return findById(id);
    }

    const columns = Object.keys(picked);
    const setClause = columns.map((column) => `${qid(column)} = ?`).join(", ");

    await db.query(`UPDATE ${qid(tableName)} SET ${setClause} WHERE ${qid("id")} = ?`, [
      ...columns.map((column) => picked[column]),
      id,
    ]);

    return findById(id);
  }

  return { list, findById, findByColumn, create, update, pickAllowedData, tableName };
}

module.exports = { createGenericModel, db, qid, toMysqlDateTime };
