const db = require("../../../config/product_management_db/product_management_db");

const ALLOWED_LAYOUTS = new Set(["image_left", "image_right", "image_full", "text_only"]);

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function cleanLayout(value) {
  const layout = cleanString(value);
  return layout && ALLOWED_LAYOUTS.has(layout) ? layout : "image_left";
}

async function listByProduct(productId, { includeInactive = false } = {}) {
  const where = ["product_id = ?", "deleted_at IS NULL"];
  const params = [productId];

  if (!includeInactive) {
    where.push("status = 'active'");
  }

  const [rows] = await db.query(
    `
    SELECT *
    FROM product_content_blocks
    WHERE ${where.join(" AND ")}
    ORDER BY sort_order ASC, id ASC
    `,
    params
  );

  return rows;
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT * FROM product_content_blocks WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function nextSortOrder(productId) {
  const [rows] = await db.query(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM product_content_blocks WHERE product_id = ? AND deleted_at IS NULL`,
    [productId]
  );

  return Number(rows[0]?.max_order ?? -1) + 1;
}

async function create(data = {}) {
  const productId = Number(data.product_id);
  if (!Number.isFinite(productId)) throw new Error("Product ID is required.");

  const sortOrder = Number.isFinite(Number(data.sort_order))
    ? Number(data.sort_order)
    : await nextSortOrder(productId);

  const [result] = await db.query(
    `
    INSERT INTO product_content_blocks (
      product_id, sort_order, layout, heading, body_html, image_id, image_url, status, created_by, updated_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      productId,
      sortOrder,
      cleanLayout(data.layout),
      cleanString(data.heading),
      data.body_html || null,
      data.image_id || null,
      cleanString(data.image_url),
      cleanString(data.status) || "active",
      data.created_by || null,
      data.updated_by || null,
    ]
  );

  return findById(result.insertId);
}

async function updateById(id, data = {}) {
  const existing = await findById(id);
  if (!existing) throw new Error("Content block not found.");

  const layout = data.layout !== undefined ? cleanLayout(data.layout) : existing.layout;
  const heading = data.heading !== undefined ? cleanString(data.heading) : existing.heading;
  const bodyHtml = data.body_html !== undefined ? data.body_html : existing.body_html;
  const imageId = data.image_id !== undefined ? data.image_id || null : existing.image_id;
  const imageUrl = data.image_url !== undefined ? cleanString(data.image_url) : existing.image_url;
  const status = data.status !== undefined ? cleanString(data.status) || "active" : existing.status;
  const sortOrder =
    data.sort_order !== undefined && Number.isFinite(Number(data.sort_order))
      ? Number(data.sort_order)
      : existing.sort_order;

  await db.query(
    `
    UPDATE product_content_blocks
    SET
      layout = ?,
      heading = ?,
      body_html = ?,
      image_id = ?,
      image_url = ?,
      status = ?,
      sort_order = ?,
      updated_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [layout, heading, bodyHtml, imageId, imageUrl, status, sortOrder, data.updated_by || null, id]
  );

  return findById(id);
}

async function removeById(id) {
  const [result] = await db.query(
    `UPDATE product_content_blocks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return result.affectedRows > 0;
}

// Caller passes an ordered array of block IDs (already-in-desired-order);
// each row's sort_order is set to its index in that array.
async function reorder(productId, orderedIds = []) {
  for (let index = 0; index < orderedIds.length; index += 1) {
    await db.query(
      `UPDATE product_content_blocks SET sort_order = ? WHERE id = ? AND product_id = ? AND deleted_at IS NULL`,
      [index, orderedIds[index], productId]
    );
  }

  return listByProduct(productId, { includeInactive: true });
}

module.exports = {
  listByProduct,
  findById,
  create,
  updateById,
  removeById,
  reorder,
};
