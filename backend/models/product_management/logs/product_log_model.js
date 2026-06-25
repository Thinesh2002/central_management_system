const db = require("../../../config/product_management_db/product_management_db");

async function getAll({ product_id = "", variant_id = "", sku = "", action = "", page = 1, limit = 20 }) {
  page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 100);
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (product_id) {
    where.push("product_id = ?");
    params.push(product_id);
  }

  if (variant_id) {
    where.push("variant_id = ?");
    params.push(variant_id);
  }

  if (sku) {
    where.push("(sku LIKE ? OR variant_sku LIKE ?)");
    params.push(`%${sku}%`, `%${sku}%`);
  }

  if (action) {
    where.push("action = ?");
    params.push(action);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `
    SELECT *
    FROM product_logs
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const [count] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM product_logs
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

async function getById(id) {
  const [rows] = await db.query(
    `SELECT * FROM product_logs WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const [result] = await db.query(
    `
    INSERT INTO product_logs
    (
      product_id, variant_id, sku, variant_sku, action, field_name,
      old_value, new_value, message, changed_by, ip_address, user_agent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.product_id || null,
      data.variant_id || null,
      data.sku || null,
      data.variant_sku || null,
      data.action,
      data.field_name || null,
      data.old_value || null,
      data.new_value || null,
      data.message || null,
      data.changed_by || null,
      data.ip_address || null,
      data.user_agent || null,
    ]
  );

  return getById(result.insertId);
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;

  await db.query(`DELETE FROM product_logs WHERE id = ?`, [id]);

  return existing;
}

module.exports = {
  getAll,
  getById,
  create,
  remove,
};