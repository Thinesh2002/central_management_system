const db = require("../../../config/product_management_db/product_management_db");

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getAll({ search = "", page = 1, limit = 20, includeDeleted = false }) {
  page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 100);
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (!includeDeleted) where.push("deleted_at IS NULL");

  if (search) {
    where.push("(name LIKE ? OR slug LIKE ? OR input_type LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `SELECT * FROM attributes ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [count] = await db.query(
    `SELECT COUNT(*) AS total FROM attributes ${whereSql}`,
    params
  );

  return {
    rows,
    pagination: {
      total: count[0].total,
      page,
      limit,
      totalPages: Math.ceil(count[0].total / limit),
    },
  };
}

async function getById(id, includeDeleted = false) {
  const where = ["id = ?"];
  const params = [id];

  if (!includeDeleted) where.push("deleted_at IS NULL");

  const [rows] = await db.query(
    `SELECT * FROM attributes WHERE ${where.join(" AND ")} LIMIT 1`,
    params
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `
    INSERT INTO attributes (name, slug, input_type)
    VALUES (?, ?, ?)
    `,
    [
      data.name,
      data.slug || slugify(data.name),
      data.input_type || "select",
    ]
  );

  return getById(result.insertId, true);
}

async function update(id, data) {
  const existing = await getById(id, true);
  if (!existing) return null;

  await db.query(
    `
    UPDATE attributes
    SET name = ?, slug = ?, input_type = ?
    WHERE id = ?
    `,
    [
      data.name !== undefined ? data.name : existing.name,
      data.slug !== undefined ? data.slug : existing.slug,
      data.input_type !== undefined ? data.input_type : existing.input_type,
      id,
    ]
  );

  return getById(id, true);
}

async function remove(id) {
  await db.query(
    `UPDATE attributes SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return getById(id, true);
}

async function restore(id) {
  await db.query(`UPDATE attributes SET deleted_at = NULL WHERE id = ?`, [id]);
  return getById(id, false);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  restore,
};