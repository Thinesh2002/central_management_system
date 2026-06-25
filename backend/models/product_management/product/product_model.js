const db = require("../../../config/product_management_db/product_management_db");

const TABLE_NAME = "products";

const POSSIBLE_VARIANT_TABLES = [
  "product_variants",
  "product_skus",
  "product_variations",
  "local_product_variants",
  "product_variant_skus",
];

const POSSIBLE_IMAGE_TABLES = [
  "product_images",
  "product_image",
  "local_product_images",
];

let tableMetaCache = null;
const metaCache = new Map();
const existingTableCache = new Map();

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function tableExists(tableName) {
  if (existingTableCache.has(tableName)) {
    return existingTableCache.get(tableName);
  }

  try {
    const [rows] = await db.query(`SHOW TABLES LIKE ?`, [tableName]);
    const exists = rows.length > 0;
    existingTableCache.set(tableName, exists);
    return exists;
  } catch {
    existingTableCache.set(tableName, false);
    return false;
  }
}

async function getAnyTableMeta(tableName) {
  if (metaCache.has(tableName)) {
    return metaCache.get(tableName);
  }

  const exists = await tableExists(tableName);

  if (!exists) {
    const emptyMeta = {
      tableName,
      exists: false,
      columns: [],
      columnNames: [],
      columnSet: new Set(),
      primaryKey: "id",
      searchableColumns: [],
    };

    metaCache.set(tableName, emptyMeta);
    return emptyMeta;
  }

  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(tableName)}`);

  const columns = rows.map((row) => ({
    name: row.Field,
    type: String(row.Type || "").toLowerCase(),
    key: row.Key,
  }));

  const meta = {
    tableName,
    exists: true,
    columns,
    columnNames: columns.map((column) => column.name),
    columnSet: new Set(columns.map((column) => column.name)),
    primaryKey: columns.find((column) => column.key === "PRI")?.name || "id",
    searchableColumns: columns
      .filter((column) => /(char|text|json|enum|set)/i.test(column.type))
      .map((column) => column.name),
  };

  metaCache.set(tableName, meta);
  return meta;
}

async function getTableMeta() {
  if (tableMetaCache) return tableMetaCache;

  tableMetaCache = await getAnyTableMeta(TABLE_NAME);
  return tableMetaCache;
}

function hasColumn(meta, columnName) {
  return Boolean(meta?.columnSet?.has(columnName));
}

function normalizeListParams(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 25), 1), 200);
  const offset =
    query.offset !== undefined
      ? Math.max(Number(query.offset || 0), 0)
      : (page - 1) * limit;

  return { page, limit, offset };
}

function normalizeNullableId(value) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;

  return numberValue;
}

function normalizeProductPayload(meta, payload = {}) {
  const normalized = { ...payload };

  if (hasColumn(meta, "category_id")) {
    normalized.category_id = normalizeNullableId(
      payload.category_id ?? payload.product_category_id ?? payload.categoryId
    );
  }

  if (hasColumn(meta, "sub_category_id")) {
    normalized.sub_category_id = normalizeNullableId(
      payload.sub_category_id ??
        payload.product_sub_category_id ??
        payload.subCategoryId ??
        payload.subcategory_id
    );
  }

  if (hasColumn(meta, "model_id")) {
    normalized.model_id = normalizeNullableId(
      payload.model_id ??
        payload.product_model_id ??
        payload.modelId ??
        payload.productModelId ??
        payload.model
    );
  }

  if (hasColumn(meta, "has_variants")) {
    normalized.has_variants = Number(payload.has_variants || 0) ? 1 : 0;
  }

  if (hasColumn(meta, "main_price") && payload.main_price !== undefined) {
    normalized.main_price = Number(payload.main_price || 0);
  }

  if (hasColumn(meta, "cost_price") && payload.cost_price !== undefined) {
    normalized.cost_price = Number(payload.cost_price || 0);
  }

  if (hasColumn(meta, "sale_price") && payload.sale_price !== undefined) {
    normalized.sale_price = Number(payload.sale_price || 0);
  }

  return normalized;
}

function normalizeProductResponse(product = {}) {
  if (!product || typeof product !== "object") return product;

  const modelId =
    product.model_id ??
    product.product_model_id ??
    product.modelId ??
    product.productModelId ??
    null;

  const categoryId =
    product.category_id ??
    product.product_category_id ??
    product.categoryId ??
    null;

  const subCategoryId =
    product.sub_category_id ??
    product.product_sub_category_id ??
    product.subCategoryId ??
    product.subcategory_id ??
    null;

  return {
    ...product,

    category_id: categoryId,
    product_category_id: categoryId,

    sub_category_id: subCategoryId,
    product_sub_category_id: subCategoryId,

    model_id: modelId,
    product_model_id: modelId,
  };
}

function pickAllowedData(meta, payload = {}) {
  const blocked = new Set([
    meta.primaryKey,
    "created_at",
    "updated_at",
    "deleted_at",
    "product_category_id",
    "product_sub_category_id",
    "product_model_id",
    "categoryId",
    "subCategoryId",
    "modelId",
    "productModelId",
  ]);

  const data = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (!meta.columnSet.has(key)) return;
    if (blocked.has(key)) return;
    if (value === undefined) return;
    data[key] = value;
  });

  return data;
}

function addAuditFields(meta, data, mode, userId) {
  const userValue = userId || null;

  if (mode === "create") {
    if (hasColumn(meta, "created_by") && data.created_by === undefined) {
      data.created_by = userValue;
    }

    if (hasColumn(meta, "updated_by") && data.updated_by === undefined) {
      data.updated_by = userValue;
    }
  }

  if (mode === "update") {
    if (hasColumn(meta, "updated_by") && data.updated_by === undefined) {
      data.updated_by = userValue;
    }
  }

  return data;
}

function buildWhere(meta, query = {}) {
  const where = [];
  const values = [];

  if (hasColumn(meta, "deleted_at") && String(query.include_deleted || "") !== "1") {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  Object.entries(query || {}).forEach(([key, value]) => {
    if (
      [
        "page",
        "limit",
        "offset",
        "search",
        "sort_by",
        "sort_dir",
        "include_deleted",
      ].includes(key)
    ) {
      return;
    }

    if (value === undefined || value === null || value === "") return;

    let columnKey = key;

    if (key === "product_category_id") columnKey = "category_id";
    if (key === "product_sub_category_id") columnKey = "sub_category_id";
    if (key === "product_model_id") columnKey = "model_id";

    if (!meta.columnSet.has(columnKey)) return;

    where.push(`${qid(columnKey)} = ?`);
    values.push(value);
  });

  const search = String(query.search || "").trim();

  if (search && meta.searchableColumns.length) {
    const columns = meta.searchableColumns.slice(0, 12);

    where.push(
      `(${columns.map((column) => `${qid(column)} LIKE ?`).join(" OR ")})`
    );

    columns.forEach(() => values.push(`%${search}%`));
  }

  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

function firstExistingColumn(meta, columns = []) {
  return columns.find((column) => hasColumn(meta, column)) || null;
}

async function resolveVariantTable() {
  for (const tableName of POSSIBLE_VARIANT_TABLES) {
    const meta = await getAnyTableMeta(tableName);

    if (meta.exists && hasColumn(meta, "product_id")) {
      return meta;
    }
  }

  return null;
}

async function resolveImageTable() {
  for (const tableName of POSSIBLE_IMAGE_TABLES) {
    const meta = await getAnyTableMeta(tableName);

    if (meta.exists && hasColumn(meta, "product_id")) {
      return meta;
    }
  }

  return null;
}

function parseMaybeJson(value) {
  if (value === undefined || value === null || value === "") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (!trimmed) return "";

  const looksJson =
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"));

  if (!looksJson) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeImageRow(image = {}) {
  const parsed = parseMaybeJson(image);

  if (typeof parsed === "string") {
    return {
      image_url: parsed,
      url: parsed,
    };
  }

  const row = parsed && typeof parsed === "object" ? parsed : image;

  const imageUrl =
    row.image_url ||
    row.imageUrl ||
    row.image_path ||
    row.imagePath ||
    row.file_url ||
    row.fileUrl ||
    row.file_path ||
    row.filePath ||
    row.url ||
    row.src ||
    row.path ||
    row.thumbnail ||
    row.thumbnail_url ||
    row.main_image_url ||
    row.primary_image_url ||
    "";

  return {
    ...row,
    image_url: imageUrl,
    url: imageUrl,
  };
}

function groupBy(rows = [], keyName) {
  const map = new Map();

  rows.forEach((row) => {
    const key = String(row[keyName] ?? "");

    if (!key) return;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(row);
  });

  return map;
}

function splitMainAndSubImages(images = []) {
  const normalized = images.map(normalizeImageRow).filter((image) => image.image_url);

  const mainImage =
    normalized.find((image) => {
      const imageType = String(image.image_type || image.type || "").toLowerCase();

      return (
        Number(
          image.is_main ||
            image.is_primary ||
            image.is_featured ||
            image.main ||
            image.primary ||
            0
        ) === 1 ||
        imageType === "main" ||
        imageType === "primary" ||
        imageType === "featured"
      );
    }) ||
    normalized[0] ||
    null;

  const mainImageId = mainImage?.id ? String(mainImage.id) : "";

  const subImages = normalized.filter((image) => {
    if (!mainImage) return true;

    if (image.id && mainImageId && String(image.id) === mainImageId) {
      return false;
    }

    const imageType = String(image.image_type || image.type || "").toLowerCase();

    if (
      imageType === "main" ||
      imageType === "primary" ||
      imageType === "featured"
    ) {
      return false;
    }

    return true;
  });

  return {
    main_image: mainImage,
    main_image_url: mainImage?.image_url || "",
    sub_images: subImages,
    images: normalized,
  };
}

function getImageOrderBy(imageMeta, alias = "") {
  const prefix = alias ? `${alias}.` : "";

  const sortColumns = ["sort_order", "position", "display_order", "priority", "id"]
    .filter((column) => hasColumn(imageMeta, column))
    .map((column) => `${prefix}${qid(column)} ASC`);

  return sortColumns.length
    ? sortColumns.join(", ")
    : `${prefix}${qid(imageMeta.primaryKey)} ASC`;
}

function buildDeletedWhere(meta, alias = "") {
  if (!hasColumn(meta, "deleted_at")) return "";

  const prefix = alias ? `${alias}.` : "";

  return `AND ${prefix}${qid("deleted_at")} IS NULL`;
}

async function attachProductImages(products = []) {
  const imageMeta = await resolveImageTable();

  if (!imageMeta || !imageMeta.exists) {
    return products.map((product) => ({
      ...product,
      ...splitMainAndSubImages([]),
    }));
  }

  const productIds = products.map((product) => product.id).filter(Boolean);

  if (!productIds.length) {
    return products;
  }

  const placeholders = productIds.map(() => "?").join(",");
  const orderBy = getImageOrderBy(imageMeta);

  let rows = [];

  try {
    const variantColumn = hasColumn(imageMeta, "variant_id") ? "variant_id" : null;

    const productOnlyCondition = variantColumn
      ? `AND (${qid(variantColumn)} IS NULL OR ${qid(variantColumn)} = 0)`
      : "";

    const [imageRows] = await db.query(
      `
      SELECT *
      FROM ${qid(imageMeta.tableName)}
      WHERE ${qid("product_id")} IN (${placeholders})
        ${productOnlyCondition}
        ${buildDeletedWhere(imageMeta)}
      ORDER BY ${qid("product_id")} ASC, ${orderBy}
      `,
      productIds
    );

    rows = imageRows;
  } catch (error) {
    console.warn("[PRODUCT_IMAGES_ATTACH_WARNING]", error.message);
    rows = [];
  }

  const imageMap = groupBy(rows, "product_id");

  return products.map((product) => ({
    ...product,
    ...splitMainAndSubImages(imageMap.get(String(product.id)) || []),
  }));
}

async function attachVariantsAndVariantImages(products = []) {
  const variantMeta = await resolveVariantTable();

  if (!variantMeta || !variantMeta.exists) {
    return products.map((product) => ({
      ...product,
      variants: [],
      variant_count: Number(product.variant_count || product.variants_count || 0),
      has_variants: Number(product.has_variants || product.has_variant || 0),
    }));
  }

  const productIds = products.map((product) => product.id).filter(Boolean);

  if (!productIds.length) {
    return products;
  }

  const placeholders = productIds.map(() => "?").join(",");

  const variantSortColumn = firstExistingColumn(variantMeta, [
    "sort_order",
    "position",
    "display_order",
    "id",
  ]);

  let variants = [];

  try {
    const [variantRows] = await db.query(
      `
      SELECT *
      FROM ${qid(variantMeta.tableName)}
      WHERE ${qid("product_id")} IN (${placeholders})
        ${buildDeletedWhere(variantMeta)}
      ORDER BY ${qid("product_id")} ASC, ${qid(variantSortColumn || variantMeta.primaryKey)} ASC
      `,
      productIds
    );

    variants = variantRows;
  } catch (error) {
    console.warn("[PRODUCT_VARIANTS_ATTACH_WARNING]", error.message);
    variants = [];
  }

  const imageMeta = await resolveImageTable();
  let variantImages = [];

  if (imageMeta && imageMeta.exists && hasColumn(imageMeta, "variant_id") && variants.length) {
    const variantIds = variants.map((variant) => variant.id).filter(Boolean);

    if (variantIds.length) {
      const variantPlaceholders = variantIds.map(() => "?").join(",");
      const imageOrderBy = getImageOrderBy(imageMeta);

      try {
        const [imageRows] = await db.query(
          `
          SELECT *
          FROM ${qid(imageMeta.tableName)}
          WHERE ${qid("variant_id")} IN (${variantPlaceholders})
            ${buildDeletedWhere(imageMeta)}
          ORDER BY ${qid("variant_id")} ASC, ${imageOrderBy}
          `,
          variantIds
        );

        variantImages = imageRows;
      } catch (error) {
        console.warn("[VARIANT_IMAGES_ATTACH_WARNING]", error.message);
        variantImages = [];
      }
    }
  }

  const variantImageMap = groupBy(variantImages, "variant_id");

  const variantsWithImages = variants.map((variant) => ({
    ...variant,
    ...splitMainAndSubImages(variantImageMap.get(String(variant.id)) || []),
  }));

  const variantMap = groupBy(variantsWithImages, "product_id");

  return products.map((product) => {
    const productVariants = variantMap.get(String(product.id)) || [];

    const existingCount = Number(
      product.variant_count ||
        product.variants_count ||
        product.sku_count ||
        product.variation_count ||
        0
    );

    const existingHasVariants = Number(
      product.has_variants || product.has_variant || product.is_variable || 0
    );

    return {
      ...product,
      variants: productVariants,
      variant_count: productVariants.length || existingCount,
      has_variants:
        productVariants.length > 0 || existingHasVariants === 1 || existingCount > 0
          ? 1
          : 0,
    };
  });
}

async function attachRelations(products = []) {
  if (!Array.isArray(products) || !products.length) return products;

  let output = products;

  output = await attachProductImages(output);
  output = await attachVariantsAndVariantImages(output);

  return output.map(normalizeProductResponse);
}

async function list(params = {}) {
  const meta = await getTableMeta();
  const { page, limit, offset } = normalizeListParams(params);
  const where = buildWhere(meta, params);

  const preferredSort = ["updated_at", "created_at", meta.primaryKey].find((column) =>
    hasColumn(meta, column)
  );

  const requestedSort = String(params.sort_by || "").trim();
  const sortBy = hasColumn(meta, requestedSort) ? requestedSort : preferredSort;
  const sortDir =
    String(params.sort_dir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} ${where.clause} ORDER BY ${qid(sortBy)} ${sortDir} LIMIT ? OFFSET ?`,
    [...where.values, limit, offset]
  );

  const rowsWithRelations = await attachRelations(rows);

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM ${qid(TABLE_NAME)} ${where.clause}`,
    where.values
  );

  const total = Number(countRows?.[0]?.total || 0);

  return {
    data: rowsWithRelations,
    pagination: {
      page,
      limit,
      offset,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

async function findById(id) {
  const meta = await getTableMeta();
  const where = [`${qid(meta.primaryKey)} = ?`];
  const values = [id];

  if (hasColumn(meta, "deleted_at")) where.push(`${qid("deleted_at")} IS NULL`);

  const [rows] = await db.query(
    `SELECT * FROM ${qid(TABLE_NAME)} WHERE ${where.join(" AND ")} LIMIT 1`,
    values
  );

  const product = rows[0] || null;

  if (!product) return null;

  const [productWithRelations] = await attachRelations([product]);

  return normalizeProductResponse(productWithRelations || product);
}

async function create(payload = {}, options = {}) {
  const meta = await getTableMeta();
  const normalizedPayload = normalizeProductPayload(meta, payload);

  const data = addAuditFields(
    meta,
    pickAllowedData(meta, normalizedPayload),
    "create",
    options.userId
  );

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)} (${columns.map(qid).join(", ")}) VALUES (${columns
      .map(() => "?")
      .join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : normalizeProductResponse(data);
}

async function updateById(id, payload = {}, options = {}) {
  const meta = await getTableMeta();
  const normalizedPayload = normalizeProductPayload(meta, payload);

  const data = addAuditFields(
    meta,
    pickAllowedData(meta, normalizedPayload),
    "update",
    options.userId
  );

  if (!Object.keys(data).length) {
    const error = new Error(`No valid columns supplied for ${TABLE_NAME}.`);
    error.statusCode = 400;
    throw error;
  }

  const assignments = Object.keys(data)
    .map((column) => `${qid(column)} = ?`)
    .join(", ");

  const [result] = await db.query(
    `UPDATE ${qid(TABLE_NAME)} SET ${assignments} WHERE ${qid(meta.primaryKey)} = ?`,
    [...Object.values(data), id]
  );

  if (!result.affectedRows) return null;

  return findById(id);
}

async function removeById(id, options = {}) {
  const meta = await getTableMeta();
  const existing = await findById(id);

  if (!existing) return null;

  if (hasColumn(meta, "deleted_at")) {
    const data = { deleted_at: new Date() };

    if (hasColumn(meta, "updated_by")) {
      data.updated_by = options.userId || null;
    }

    const assignments = Object.keys(data)
      .map((column) => `${qid(column)} = ?`)
      .join(", ");

    await db.query(
      `UPDATE ${qid(TABLE_NAME)} SET ${assignments} WHERE ${qid(meta.primaryKey)} = ?`,
      [...Object.values(data), id]
    );
  } else {
    await db.query(`DELETE FROM ${qid(TABLE_NAME)} WHERE ${qid(meta.primaryKey)} = ?`, [
      id,
    ]);
  }

  return existing;
}

async function insertMatching(payload = {}) {
  const meta = await getTableMeta();
  const normalizedPayload = normalizeProductPayload(meta, payload);
  const data = pickAllowedData(meta, normalizedPayload);

  if (!Object.keys(data).length) return null;

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `INSERT INTO ${qid(TABLE_NAME)} (${columns.map(qid).join(", ")}) VALUES (${columns
      .map(() => "?")
      .join(", ")})`,
    values
  );

  return result.insertId ? findById(result.insertId) : normalizeProductResponse(data);
}

module.exports = {
  tableName: TABLE_NAME,
  list,
  findById,
  create,
  updateById,
  removeById,
  insertMatching,
};