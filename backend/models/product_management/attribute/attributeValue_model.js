const db = require("../../../config/product_management_db/product_management_db");

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getAll({ search = "", attribute_id = "", page = 1, limit = 20, includeDeleted = false }) {
  page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 100);
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (!includeDeleted) where.push("av.deleted_at IS NULL");

  if (attribute_id) {
    where.push("av.attribute_id = ?");
    params.push(attribute_id);
  }

  if (search) {
    where.push("(av.value LIKE ? OR av.slug LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `
    SELECT av.*, a.name AS attribute_name
    FROM attribute_values av
    LEFT JOIN attributes a ON a.id = av.attribute_id
    ${whereSql}
    ORDER BY av.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const [count] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM attribute_values av
    ${whereSql}
    `,
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
  const where = ["av.id = ?"];
  const params = [id];

  if (!includeDeleted) where.push("av.deleted_at IS NULL");

  const [rows] = await db.query(
    `
    SELECT av.*, a.name AS attribute_name
    FROM attribute_values av
    LEFT JOIN attributes a ON a.id = av.attribute_id
    WHERE ${where.join(" AND ")}
    LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `
    INSERT INTO attribute_values (attribute_id, value, slug)
    VALUES (?, ?, ?)
    `,
    [
      data.attribute_id,
      data.value,
      data.slug || slugify(data.value),
    ]
  );

  return getById(result.insertId, true);
}

async function update(id, data) {
  const existing = await getById(id, true);
  if (!existing) return null;

  await db.query(
    `
    UPDATE attribute_values
    SET attribute_id = ?, value = ?, slug = ?
    WHERE id = ?
    `,
    [
      data.attribute_id !== undefined ? data.attribute_id : existing.attribute_id,
      data.value !== undefined ? data.value : existing.value,
      data.slug !== undefined ? data.slug : existing.slug,
      id,
    ]
  );

  return getById(id, true);
}

async function remove(id) {
  await db.query(
    `UPDATE attribute_values SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return getById(id, true);
}

async function restore(id) {
  await db.query(`UPDATE attribute_values SET deleted_at = NULL WHERE id = ?`, [id]);
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