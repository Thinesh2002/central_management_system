const db = require("../../../config/product_management_db/product_management_db");

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

async function findByCode(sizeCode, excludeId = null) {
  const params = [sizeCode];

  let sql = `
    SELECT id, size_code, name
    FROM product_sizes
    WHERE size_code = ?
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
  const limit = Math.min(toPositiveInt(filters.limit, 20), 100);
  const offset = (page - 1) * limit;

  const search = cleanString(filters.search);
  const includeDeleted = String(filters.include_deleted || "") === "true";

  const where = [];
  const params = [];

  if (!includeDeleted) {
    where.push("deleted_at IS NULL");
  }

  if (search) {
    where.push(`
      (
        size_code LIKE ?
        OR name LIKE ?
        OR slug LIKE ?
      )
    `);

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM product_sizes
    ${whereSql}
    `,
    params
  );

  const total = Number(countRows[0]?.total || 0);

  const [rows] = await db.query(
    `
    SELECT
      id,
      size_code,
      name,
      slug,
      sort_order,
      description,
      deleted_at,
      created_at,
      updated_at
    FROM product_sizes
    ${whereSql}
    ORDER BY sort_order ASC, id ASC
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
    SELECT
      id,
      size_code,
      name,
      slug,
      sort_order,
      description,
      deleted_at,
      created_at,
      updated_at
    FROM product_sizes
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const sizeCode = cleanString(data.size_code);
  const name = cleanString(data.name || data.size_name);
  const slug = cleanString(data.slug) || slugify(name);
  const sortOrder = Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0;
  const description = cleanString(data.description);

  if (!sizeCode) throw new Error("Size code is required.");
  if (!name) throw new Error("Size name is required.");

  const duplicate = await findByCode(sizeCode);

  if (duplicate) {
    throw new Error("Size code already exists.");
  }

  const [result] = await db.query(
    `
    INSERT INTO product_sizes (
      size_code,
      name,
      slug,
      sort_order,
      description
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [sizeCode, name, slug, sortOrder, description]
  );

  return getById(result.insertId);
}

async function update(id, data) {
  const sizeId = Number(id);
  const existing = await getById(sizeId);

  if (!existing) {
    throw new Error("Product size not found.");
  }

  const sizeCode =
    cleanString(data.size_code) !== null ? cleanString(data.size_code) : existing.size_code;

  const name =
    cleanString(data.name || data.size_name) !== null
      ? cleanString(data.name || data.size_name)
      : existing.name;

  const slug = cleanString(data.slug) || slugify(name);

  const sortOrder =
    data.sort_order !== undefined && Number.isFinite(Number(data.sort_order))
      ? Number(data.sort_order)
      : existing.sort_order;

  const description =
    data.description !== undefined ? cleanString(data.description) : existing.description;

  if (!sizeCode) throw new Error("Size code is required.");
  if (!name) throw new Error("Size name is required.");

  const duplicate = await findByCode(sizeCode, sizeId);

  if (duplicate) {
    throw new Error("Size code already exists.");
  }

  await db.query(
    `
    UPDATE product_sizes
    SET
      size_code = ?,
      name = ?,
      slug = ?,
      sort_order = ?,
      description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [sizeCode, name, slug, sortOrder, description, sizeId]
  );

  return getById(sizeId);
}

async function softDelete(id) {
  const [result] = await db.query(
    `
    UPDATE product_sizes
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND deleted_at IS NULL
    `,
    [id]
  );

  return result.affectedRows > 0;
}

async function restore(id) {
  const [result] = await db.query(
    `
    UPDATE product_sizes
    SET deleted_at = NULL
    WHERE id = ?
      AND deleted_at IS NOT NULL
    `,
    [id]
  );

  return result.affectedRows > 0;
}

async function forceDelete(id) {
  const [usedRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM product_variants
    WHERE size_id = ?
      AND deleted_at IS NULL
    `,
    [id]
  );

  const totalUsed = Number(usedRows[0]?.total || 0);

  if (totalUsed > 0) {
    throw new Error("This size is assigned to product variants. Remove assignment first.");
  }

  const [result] = await db.query(
    `
    DELETE FROM product_sizes
    WHERE id = ?
    `,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  list,
  getById,
  create,
  update,
  softDelete,
  restore,
  forceDelete,
};
