const db = require("../../../config/product_management_db/product_management_db");

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toPositiveInt(value, fallback = 1) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return fallback;
  return Math.floor(numberValue);
}

async function findByWrongSku(wrongSku, excludeId = null) {
  const params = [wrongSku];

  let sql = `
    SELECT id, wrong_sku, correct_sku
    FROM sku_mappings
    WHERE wrong_sku = ?
  `;

  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }

  sql += ` LIMIT 1`;

  const [rows] = await db.query(sql, params);
  return rows[0] || null;
}

async function list(filters = {}) {
  const page = toPositiveInt(filters.page, 1);
  const limit = Math.min(toPositiveInt(filters.limit, 50), 200);
  const offset = (page - 1) * limit;

  const search = cleanString(filters.search);

  const where = [];
  const params = [];

  if (search) {
    where.push(`(wrong_sku LIKE ? OR correct_sku LIKE ? OR notes LIKE ?)`);
    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM sku_mappings ${whereSql}`,
    params
  );

  const total = Number(countRows[0]?.total || 0);

  const [rows] = await db.query(
    `
    SELECT id, wrong_sku, correct_sku, platform, notes, created_at, updated_at
    FROM sku_mappings
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

async function getById(id) {
  const [rows] = await db.query(
    `
    SELECT id, wrong_sku, correct_sku, platform, notes, created_at, updated_at
    FROM sku_mappings
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

// Used by SKU matching logic elsewhere (reports/sync) to resolve a wrong
// marketplace SKU to the real local one before giving up on a lookup.
async function resolveCorrectSku(wrongSku) {
  const clean = cleanString(wrongSku);
  if (!clean) return null;

  const mapping = await findByWrongSku(clean);
  return mapping?.correct_sku || null;
}

async function create(data, options = {}) {
  const wrongSku = cleanString(data.wrong_sku);
  const correctSku = cleanString(data.correct_sku);
  const platform = cleanString(data.platform) || "DARAZ";
  const notes = cleanString(data.notes);

  if (!wrongSku) throw new Error("Wrong SKU is required.");
  if (!correctSku) throw new Error("Correct SKU is required.");

  if (wrongSku === correctSku) {
    throw new Error("Wrong SKU and correct SKU cannot be the same.");
  }

  const duplicate = await findByWrongSku(wrongSku);

  if (duplicate) {
    throw new Error("A mapping for this wrong SKU already exists.");
  }

  const [result] = await db.query(
    `
    INSERT INTO sku_mappings (wrong_sku, correct_sku, platform, notes, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [wrongSku, correctSku, platform, notes, options.userId || null, options.userId || null]
  );

  return getById(result.insertId);
}

async function update(id, data, options = {}) {
  const mappingId = Number(id);
  const existing = await getById(mappingId);

  if (!existing) {
    throw new Error("SKU mapping not found.");
  }

  const wrongSku =
    cleanString(data.wrong_sku) !== null ? cleanString(data.wrong_sku) : existing.wrong_sku;

  const correctSku =
    cleanString(data.correct_sku) !== null ? cleanString(data.correct_sku) : existing.correct_sku;

  const platform = cleanString(data.platform) || existing.platform || "DARAZ";

  const notes = data.notes !== undefined ? cleanString(data.notes) : existing.notes;

  if (!wrongSku) throw new Error("Wrong SKU is required.");
  if (!correctSku) throw new Error("Correct SKU is required.");

  if (wrongSku === correctSku) {
    throw new Error("Wrong SKU and correct SKU cannot be the same.");
  }

  const duplicate = await findByWrongSku(wrongSku, mappingId);

  if (duplicate) {
    throw new Error("A mapping for this wrong SKU already exists.");
  }

  await db.query(
    `
    UPDATE sku_mappings
    SET wrong_sku = ?, correct_sku = ?, platform = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [wrongSku, correctSku, platform, notes, options.userId || null, mappingId]
  );

  return getById(mappingId);
}

async function remove(id) {
  const [result] = await db.query(`DELETE FROM sku_mappings WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  resolveCorrectSku,
};
