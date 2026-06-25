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

async function checkCategoryAndSubCategory(categoryId, subCategoryId) {
  const [rows] = await db.query(
    `
    SELECT 
      c.id AS category_id,
      c.category_code,
      c.name AS category_name,
      sc.id AS sub_category_id,
      sc.sub_category_code,
      sc.name AS sub_category_name
    FROM categories c
    INNER JOIN sub_categories sc
      ON sc.category_code = c.category_code
    WHERE c.id = ?
      AND sc.id = ?
      AND c.deleted_at IS NULL
      AND sc.deleted_at IS NULL
    LIMIT 1
    `,
    [categoryId, subCategoryId]
  );

  return rows[0] || null;
}

async function findByCode(modelCode, excludeId = null) {
  const params = [modelCode];

  let sql = `
    SELECT id, model_code, name
    FROM product_models
    WHERE model_code = ?
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
  const categoryId = cleanString(filters.category_id);
  const subCategoryId = cleanString(filters.sub_category_id);
  const includeDeleted = String(filters.include_deleted || "") === "true";

  const where = [];
  const params = [];

  if (!includeDeleted) {
    where.push("pm.deleted_at IS NULL");
  }

  if (search) {
    where.push(`
      (
        pm.model_code LIKE ?
        OR pm.name LIKE ?
        OR pm.slug LIKE ?
        OR pm.description LIKE ?
        OR c.name LIKE ?
        OR sc.name LIKE ?
        OR sc.sub_category_code LIKE ?
      )
    `);

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  if (categoryId) {
    where.push("pm.category_id = ?");
    params.push(categoryId);
  }

  if (subCategoryId) {
    where.push("pm.sub_category_id = ?");
    params.push(subCategoryId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM product_models pm
    LEFT JOIN categories c ON c.id = pm.category_id
    LEFT JOIN sub_categories sc ON sc.id = pm.sub_category_id
    ${whereSql}
    `,
    params
  );

  const total = Number(countRows[0]?.total || 0);

  const [rows] = await db.query(
    `
    SELECT
      pm.id,
      pm.category_id,
      pm.sub_category_id,
      pm.model_code,
      pm.name,
      pm.slug,
      pm.description,
      pm.deleted_at,
      pm.created_at,
      pm.updated_at,

      c.category_code,
      c.name AS category_name,

      sc.sub_category_code,
      sc.name AS sub_category_name
    FROM product_models pm
    LEFT JOIN categories c ON c.id = pm.category_id
    LEFT JOIN sub_categories sc ON sc.id = pm.sub_category_id
    ${whereSql}
    ORDER BY pm.id DESC
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
      pm.id,
      pm.category_id,
      pm.sub_category_id,
      pm.model_code,
      pm.name,
      pm.slug,
      pm.description,
      pm.deleted_at,
      pm.created_at,
      pm.updated_at,

      c.category_code,
      c.name AS category_name,

      sc.sub_category_code,
      sc.name AS sub_category_name
    FROM product_models pm
    LEFT JOIN categories c ON c.id = pm.category_id
    LEFT JOIN sub_categories sc ON sc.id = pm.sub_category_id
    WHERE pm.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function create(data) {
  const categoryId = Number(data.category_id);
  const subCategoryId = Number(data.sub_category_id);
  const modelCode = cleanString(data.model_code);
  const name = cleanString(data.name || data.model_name);
  const slug = cleanString(data.slug) || slugify(name);
  const description = cleanString(data.description);

  if (!categoryId) throw new Error("Category is required.");
  if (!subCategoryId) throw new Error("Sub category is required.");
  if (!modelCode) throw new Error("Model code is required.");
  if (!name) throw new Error("Model name is required.");

  const relation = await checkCategoryAndSubCategory(categoryId, subCategoryId);

  if (!relation) {
    throw new Error("Invalid category and sub category relation.");
  }

  const duplicate = await findByCode(modelCode);

  if (duplicate) {
    throw new Error("Model code already exists.");
  }

  const [result] = await db.query(
    `
    INSERT INTO product_models (
      category_id,
      sub_category_id,
      model_code,
      name,
      slug,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [categoryId, subCategoryId, modelCode, name, slug, description]
  );

  return getById(result.insertId);
}

async function update(id, data) {
  const modelId = Number(id);
  const existing = await getById(modelId);

  if (!existing) {
    throw new Error("Product model not found.");
  }

  const categoryId =
    data.category_id !== undefined ? Number(data.category_id) : existing.category_id;

  const subCategoryId =
    data.sub_category_id !== undefined
      ? Number(data.sub_category_id)
      : existing.sub_category_id;

  const modelCode =
    cleanString(data.model_code) !== null
      ? cleanString(data.model_code)
      : existing.model_code;

  const name =
    cleanString(data.name || data.model_name) !== null
      ? cleanString(data.name || data.model_name)
      : existing.name;

  const slug = cleanString(data.slug) || slugify(name);

  const description =
    data.description !== undefined ? cleanString(data.description) : existing.description;

  if (!categoryId) throw new Error("Category is required.");
  if (!subCategoryId) throw new Error("Sub category is required.");
  if (!modelCode) throw new Error("Model code is required.");
  if (!name) throw new Error("Model name is required.");

  const relation = await checkCategoryAndSubCategory(categoryId, subCategoryId);

  if (!relation) {
    throw new Error("Invalid category and sub category relation.");
  }

  const duplicate = await findByCode(modelCode, modelId);

  if (duplicate) {
    throw new Error("Model code already exists.");
  }

  await db.query(
    `
    UPDATE product_models
    SET
      category_id = ?,
      sub_category_id = ?,
      model_code = ?,
      name = ?,
      slug = ?,
      description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [categoryId, subCategoryId, modelCode, name, slug, description, modelId]
  );

  return getById(modelId);
}

async function softDelete(id) {
  const [result] = await db.query(
    `
    UPDATE product_models
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
    UPDATE product_models
    SET deleted_at = NULL
    WHERE id = ?
      AND deleted_at IS NOT NULL
    `,
    [id]
  );

  return result.affectedRows > 0;
}

async function forceDelete(id) {
  const [result] = await db.query(
    `
    DELETE FROM product_models
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