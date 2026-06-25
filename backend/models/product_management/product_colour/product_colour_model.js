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

async function findByCode(colourCode, excludeId = null) {
  const params = [colourCode];

  let sql = `
    SELECT id, colour_code, name
    FROM product_colours
    WHERE colour_code = ?
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
        colour_code LIKE ?
        OR name LIKE ?
        OR slug LIKE ?
        OR hex_code LIKE ?
      )
    `);

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM product_colours
    ${whereSql}
    `,
    params
  );

  const total = Number(countRows[0]?.total || 0);

  const [rows] = await db.query(
    `
    SELECT
      id,
      colour_code,
      name,
      slug,
      hex_code,
      description,
      deleted_at,
      created_at,
      updated_at
    FROM product_colours
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
    SELECT
      id,
      colour_code,
      name,
      slug,
      hex_code,
      description,
      deleted_at,
      created_at,
      updated_at
    FROM product_colours
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const colourCode = cleanString(data.colour_code);
  const name = cleanString(data.name || data.colour_name);
  const slug = cleanString(data.slug) || slugify(name);
  const hexCode = cleanString(data.hex_code);
  const description = cleanString(data.description);

  if (!colourCode) throw new Error("Colour code is required.");
  if (!name) throw new Error("Colour name is required.");

  const duplicate = await findByCode(colourCode);

  if (duplicate) {
    throw new Error("Colour code already exists.");
  }

  const [result] = await db.query(
    `
    INSERT INTO product_colours (
      colour_code,
      name,
      slug,
      hex_code,
      description
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [colourCode, name, slug, hexCode, description]
  );

  return getById(result.insertId);
}

async function update(id, data) {
  const colourId = Number(id);
  const existing = await getById(colourId);

  if (!existing) {
    throw new Error("Product colour not found.");
  }

  const colourCode =
    cleanString(data.colour_code) !== null
      ? cleanString(data.colour_code)
      : existing.colour_code;

  const name =
    cleanString(data.name || data.colour_name) !== null
      ? cleanString(data.name || data.colour_name)
      : existing.name;

  const slug = cleanString(data.slug) || slugify(name);

  const hexCode =
    data.hex_code !== undefined ? cleanString(data.hex_code) : existing.hex_code;

  const description =
    data.description !== undefined
      ? cleanString(data.description)
      : existing.description;

  if (!colourCode) throw new Error("Colour code is required.");
  if (!name) throw new Error("Colour name is required.");

  const duplicate = await findByCode(colourCode, colourId);

  if (duplicate) {
    throw new Error("Colour code already exists.");
  }

  await db.query(
    `
    UPDATE product_colours
    SET
      colour_code = ?,
      name = ?,
      slug = ?,
      hex_code = ?,
      description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [colourCode, name, slug, hexCode, description, colourId]
  );

  return getById(colourId);
}

async function softDelete(id) {
  const [result] = await db.query(
    `
    UPDATE product_colours
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
    UPDATE product_colours
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
    FROM product_model_colours
    WHERE colour_id = ?
      AND deleted_at IS NULL
    `,
    [id]
  );

  const totalUsed = Number(usedRows[0]?.total || 0);

  if (totalUsed > 0) {
    throw new Error("This colour is assigned to product models. Remove assignment first.");
  }

  const [result] = await db.query(
    `
    DELETE FROM product_colours
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