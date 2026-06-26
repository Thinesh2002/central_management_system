function toNumber(value, fallback = 0) {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : fallback;
}

function toMoney(value, fallback = 0) {
  return Number(toNumber(value, fallback).toFixed(2));
}

function toInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clean(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function jsonValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function dateRangeWhere({ tableAlias = '', dateColumn = 'created_at', date_from, date_to } = {}, values = []) {
  const prefix = tableAlias ? `${qid(tableAlias)}.` : '';
  const where = [];
  if (date_from) {
    where.push(`${prefix}${qid(dateColumn)} >= ?`);
    values.push(date_from);
  }
  if (date_to) {
    where.push(`${prefix}${qid(dateColumn)} < DATE_ADD(?, INTERVAL 1 DAY)`);
    values.push(date_to);
  }
  return where;
}

function listParams(query = {}, defaultLimit = 25, maxLimit = 500) {
  const page = Math.max(toInt(query.page, 1), 1);
  const limit = Math.min(Math.max(toInt(query.limit, defaultLimit), 1), maxLimit);
  const offset = query.offset !== undefined ? Math.max(toInt(query.offset, 0), 0) : (page - 1) * limit;
  return { page, limit, offset };
}

async function tableExists(db, tableName) {
  const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
}

async function getColumns(db, tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(tableName)}`);
  return rows.map((row) => row.Field);
}

async function hasColumn(db, tableName, columnName) {
  try {
    const columns = await getColumns(db, tableName);
    return columns.includes(columnName);
  } catch {
    return false;
  }
}

module.exports = {
  toNumber,
  toMoney,
  toInt,
  clean,
  jsonValue,
  qid,
  dateRangeWhere,
  listParams,
  tableExists,
  getColumns,
  hasColumn,
};
