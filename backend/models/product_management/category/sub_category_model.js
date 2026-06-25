const db = require("../../../config/product_management_db/product_management_db");

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

async function generateSubCategoryCode() {
  const [rows] = await db.query(
    `
    SELECT sub_category_code
    FROM sub_categories
    WHERE sub_category_code LIKE 'SUB%'
    ORDER BY id DESC
    LIMIT 1
    `
  );

  if (!rows.length || !rows[0].sub_category_code) {
    return "SUB001";
  }

  const lastCode = rows[0].sub_category_code;
  const numberOnly = Number(String(lastCode).replace("SUB", ""));

  if (!Number.isFinite(numberOnly)) {
    return `SUB${Date.now()}`;
  }

  return `SUB${String(numberOnly + 1).padStart(3, "0")}`;
}

async function getAll({
  search = "",
  category_code = "",
  page = 1,
  limit = 20,
  includeDeleted = false,
}) {
  page = Math.max(Number(page) || 1, 1);
  limit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (!includeDeleted) {
    where.push("sc.deleted_at IS NULL");
  }

  if (category_code) {
    where.push("sc.category_code = ?");
    params.push(category_code);
  }

  if (search) {
    where.push(
      `(
        sc.sub_category_code LIKE ? OR
        sc.category_code LIKE ? OR
        sc.name LIKE ? OR
        sc.slug LIKE ? OR
        sc.description LIKE ?
      )`
    );

    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `
    SELECT 
      sc.id,
      sc.category_code,
      sc.sub_category_code,
      sc.name,
      sc.slug,
      sc.description,
      sc.deleted_at,
      sc.created_at,
      sc.updated_at,
      c.name AS category_name
    FROM sub_categories sc
    LEFT JOIN categories c 
      ON c.category_code = sc.category_code
    ${whereSql}
    ORDER BY sc.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const [count] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM sub_categories sc
    LEFT JOIN categories c 
      ON c.category_code = sc.category_code
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
  const where = ["sc.id = ?"];
  const params = [id];

  if (!includeDeleted) {
    where.push("sc.deleted_at IS NULL");
  }

  const [rows] = await db.query(
    `
    SELECT 
      sc.id,
      sc.category_code,
      sc.sub_category_code,
      sc.name,
      sc.slug,
      sc.description,
      sc.deleted_at,
      sc.created_at,
      sc.updated_at,
      c.name AS category_name
    FROM sub_categories sc
    LEFT JOIN categories c 
      ON c.category_code = sc.category_code
    WHERE ${where.join(" AND ")}
    LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function getByCode(subCategoryCode, includeDeleted = false) {
  const where = ["sc.sub_category_code = ?"];
  const params = [subCategoryCode];

  if (!includeDeleted) {
    where.push("sc.deleted_at IS NULL");
  }

  const [rows] = await db.query(
    `
    SELECT 
      sc.id,
      sc.category_code,
      sc.sub_category_code,
      sc.name,
      sc.slug,
      sc.description,
      sc.deleted_at,
      sc.created_at,
      sc.updated_at,
      c.name AS category_name
    FROM sub_categories sc
    LEFT JOIN categories c 
      ON c.category_code = sc.category_code
    WHERE ${where.join(" AND ")}
    LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function checkCategoryExists(categoryCode) {
  const [rows] = await db.query(
    `
    SELECT category_code
    FROM categories
    WHERE category_code = ? AND deleted_at IS NULL
    LIMIT 1
    `,
    [categoryCode]
  );

  return rows.length > 0;
}

async function create(data) {
  const categoryCode = cleanText(data.category_code);
  const name = cleanText(data.name);

  if (!categoryCode) {
    const error = new Error("Category is required");
    error.statusCode = 400;
    throw error;
  }

  if (!name) {
    const error = new Error("Sub category name is required");
    error.statusCode = 400;
    throw error;
  }

  const categoryExists = await checkCategoryExists(categoryCode);

  if (!categoryExists) {
    const error = new Error("Selected category does not exist");
    error.statusCode = 400;
    throw error;
  }

  const subCategoryCode =
    cleanText(data.sub_category_code) || (await generateSubCategoryCode());

  const slug = cleanText(data.slug) || slugify(name);
  const description = cleanText(data.description);

  const [result] = await db.query(
    `
    INSERT INTO sub_categories 
      (category_code, sub_category_code, name, slug, description)
    VALUES 
      (?, ?, ?, ?, ?)
    `,
    [categoryCode, subCategoryCode, name, slug, description]
  );

  return getById(result.insertId, true);
}

async function update(id, data) {
  const existing = await getById(id, true);
  if (!existing) return null;

  const categoryCode =
    data.category_code !== undefined
      ? cleanText(data.category_code)
      : existing.category_code;

  const name =
    data.name !== undefined
      ? cleanText(data.name)
      : existing.name;

  if (!categoryCode) {
    const error = new Error("Category is required");
    error.statusCode = 400;
    throw error;
  }

  if (!name) {
    const error = new Error("Sub category name is required");
    error.statusCode = 400;
    throw error;
  }

  const categoryExists = await checkCategoryExists(categoryCode);

  if (!categoryExists) {
    const error = new Error("Selected category does not exist");
    error.statusCode = 400;
    throw error;
  }

  const subCategoryCode =
    data.sub_category_code !== undefined
      ? cleanText(data.sub_category_code)
      : existing.sub_category_code;

  const slug =
    data.slug !== undefined
      ? cleanText(data.slug) || slugify(name)
      : existing.slug;

  const description =
    data.description !== undefined
      ? cleanText(data.description)
      : existing.description;

  await db.query(
    `
    UPDATE sub_categories
    SET 
      category_code = ?,
      sub_category_code = ?,
      name = ?,
      slug = ?,
      description = ?
    WHERE id = ?
    `,
    [categoryCode, subCategoryCode, name, slug, description, id]
  );

  return getById(id, true);
}

async function remove(id) {
  await db.query(
    `
    UPDATE sub_categories
    SET deleted_at = NOW()
    WHERE id = ? AND deleted_at IS NULL
    `,
    [id]
  );

  return getById(id, true);
}

async function restore(id) {
  await db.query(
    `
    UPDATE sub_categories
    SET deleted_at = NULL
    WHERE id = ?
    `,
    [id]
  );

  return getById(id, false);
}

module.exports = {
  getAll,
  getById,
  getByCode,
  create,
  update,
  remove,
  restore,
};