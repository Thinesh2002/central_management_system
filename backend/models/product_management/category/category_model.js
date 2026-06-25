const db = require("../../../config/product_management_db/product_management_db");

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

async function generateCategoryCode() {
  const [rows] = await db.query(`SELECT MAX(id) AS maxId FROM categories`);
  const nextId = Number(rows[0]?.maxId || 0) + 1;
  return `CAT${String(nextId).padStart(4, "0")}`;
}

async function getAll({
  search = "",
  name = "",
  category_name = "",
  category_code = "",
  slug = "",
  page = 1,
  limit = 20,
  includeDeleted = false,
} = {}) {
  page = Math.max(Number(page) || 1, 1);
  limit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  const showDeleted = normalizeBool(includeDeleted);

  if (!showDeleted) {
    where.push("deleted_at IS NULL");
  }

  if (search) {
    where.push(
      "(category_code LIKE ? OR name LIKE ? OR slug LIKE ? OR description LIKE ?)"
    );
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  const filterName = name || category_name;

  if (filterName) {
    where.push("name LIKE ?");
    params.push(`%${filterName}%`);
  }

  if (category_code) {
    where.push("category_code LIKE ?");
    params.push(`%${category_code}%`);
  }

  if (slug) {
    where.push("slug LIKE ?");
    params.push(`%${slug}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `
    SELECT
      id,
      category_code,
      name,
      slug,
      description,
      created_at,
      updated_at,
      deleted_at
    FROM categories
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const [count] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM categories
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
  const where = ["id = ?"];
  const params = [id];

  const showDeleted = normalizeBool(includeDeleted);

  if (!showDeleted) {
    where.push("deleted_at IS NULL");
  }

  const [rows] = await db.query(
    `
    SELECT
      id,
      category_code,
      name,
      slug,
      description,
      created_at,
      updated_at,
      deleted_at
    FROM categories
    WHERE ${where.join(" AND ")}
    LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function create(data) {
  const name = cleanText(data.name || data.category_name);
  const categoryCode = cleanText(data.category_code) || (await generateCategoryCode());
  const slug = cleanText(data.slug) || slugify(name);
  const description = cleanText(data.description) || null;

  if (!name) {
    const error = new Error("Category name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!categoryCode) {
    const error = new Error("Category code is required.");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await db.query(
    `
    INSERT INTO categories 
      (category_code, name, slug, description)
    VALUES 
      (?, ?, ?, ?)
    `,
    [categoryCode, name, slug, description]
  );

  return getById(result.insertId, true);
}

async function update(id, data) {
  const existing = await getById(id, true);

  if (!existing) {
    return null;
  }

  const name =
    data.name !== undefined || data.category_name !== undefined
      ? cleanText(data.name || data.category_name)
      : existing.name;

  const categoryCode =
    data.category_code !== undefined
      ? cleanText(data.category_code)
      : existing.category_code;

  const slug =
    data.slug !== undefined
      ? cleanText(data.slug) || slugify(name)
      : existing.slug;

  const description =
    data.description !== undefined
      ? cleanText(data.description) || null
      : existing.description;

  if (!name) {
    const error = new Error("Category name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!categoryCode) {
    const error = new Error("Category code is required.");
    error.statusCode = 400;
    throw error;
  }

  await db.query(
    `
    UPDATE categories
    SET 
      category_code = ?,
      name = ?,
      slug = ?,
      description = ?,
      updated_at = NOW()
    WHERE id = ?
    `,
    [categoryCode, name, slug, description, id]
  );

  return getById(id, true);
}

async function remove(id) {
  await db.query(
    `
    UPDATE categories
    SET 
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = ? 
      AND deleted_at IS NULL
    `,
    [id]
  );

  return getById(id, true);
}

async function restore(id) {
  await db.query(
    `
    UPDATE categories
    SET 
      deleted_at = NULL,
      updated_at = NOW()
    WHERE id = ?
    `,
    [id]
  );

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