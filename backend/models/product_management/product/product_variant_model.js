const db = require("../../../config/product_management_db/product_management_db");

const TABLE_NAME = "product_variants";
let tableMetaCache = null;

const REMOVED_PRICE_FIELDS = new Set([
  "price",
  "main_price",
  "cost_price",
  "sale_price",
  "regular_price",
  "selling_price",
  "product_price",
  "unit_price",
  "currency",
]);

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function getTableMeta() {
  if (tableMetaCache) return tableMetaCache;

  const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(TABLE_NAME)}`);
  const columns = rows.map((row) => ({
    name: row.Field,
    type: String(row.Type || "").toLowerCase(),
    key: row.Key,
  }));

  tableMetaCache = {
    columns,
    columnNames: columns.map((column) => column.name),
    columnSet: new Set(columns.map((column) => column.name)),
    primaryKey: columns.find((column) => column.key === "PRI")?.name || "id",
    searchableColumns: columns
      .filter((column) => /(char|text|json|enum|set)/i.test(column.type))
      .map((column) => column.name),
  };

  return tableMetaCache;
}

function hasColumn(meta, columnName) {
  return meta.columnSet.has(columnName);
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

function pickAllowedData(meta, payload = {}) {
  const blocked = new Set([
    meta.primaryKey,
    "created_at",
    "updated_at",
    "deleted_at",
    ...REMOVED_PRICE_FIELDS,
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

  if (
    hasColumn(meta, "deleted_at") &&
    String(query.include_deleted || "") !== "1"
  ) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  Object.entries(query || {}).forEach(([key, value]) => {
    if (
      [
        "page",
        "limit",
        "offset",
        "search",
        "keyword",
        "q",
        "sku",
        "sort_by",
        "sort_dir",
        "include_deleted",
      ].includes(key)
    ) {
      return;
    }

    if (REMOVED_PRICE_FIELDS.has(key)) return;
    if (value === undefined || value === null || value === "") return;
    if (!meta.columnSet.has(key)) return;

    where.push(`${qid(key)} = ?`);
    values.push(value);
  });

  const search = String(
    query.search || query.keyword || query.q || query.sku || ""
  ).trim();

  if (search && meta.searchableColumns.length) {
    const columns = meta.searchableColumns
      .filter((column) => !REMOVED_PRICE_FIELDS.has(column))
      .slice(0, 20);

    if (columns.length) {
      where.push(
        `(${columns.map((column) => `${qid(column)} LIKE ?`).join(" OR ")})`
      );

      columns.forEach(() => values.push(`%${search}%`));
    }
  }

  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

function coalesceColumn(meta, names = [], fallback = "NULL") {
  const existing = names.filter(
    (name) => hasColumn(meta, name) && !REMOVED_PRICE_FIELDS.has(name)
  );

  if (!existing.length) return fallback;

  return `COALESCE(${existing.map((name) => qid(name)).join(", ")}, ${fallback})`;
}

async function list(params = {}) {
  const meta = await getTableMeta();
  const { page, limit, offset } = normalizeListParams(params);
  const where = buildWhere(meta, params);

  const preferredSort = ["updated_at", "created_at", meta.primaryKey].find(
    (column) => hasColumn(meta, column)
  );

  const requestedSort = String(params.sort_by || "").trim();
  const sortBy = hasColumn(meta, requestedSort)
    ? requestedSort
    : preferredSort || meta.primaryKey;

  const sortDir =
    String(params.sort_dir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const [rows] = await db.query(
    `
    SELECT *
    FROM ${qid(TABLE_NAME)}
    ${where.clause}
    ORDER BY ${qid(sortBy)} ${sortDir}
    LIMIT ? OFFSET ?
    `,
    [...where.values, limit, offset]
  );

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM ${qid(TABLE_NAME)}
    ${where.clause}
    `,
    where.values
  );

  const total = Number(countRows?.[0]?.total || 0);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      offset,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

async function listForOrderPicker(params = {}) {
  const meta = await getTableMeta();

  const { page, limit, offset } = normalizeListParams({
    ...params,
    limit: params.limit || 50,
  });

  const where = [];
  const values = [];

  if (hasColumn(meta, "deleted_at")) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  if (hasColumn(meta, "status")) {
    where.push(
      `(${qid("status")} IS NULL OR LOWER(${qid(
        "status"
      )}) NOT IN ('deleted', 'inactive', 'draft'))`
    );
  }

  if (hasColumn(meta, "product_status")) {
    where.push(
      `(${qid("product_status")} IS NULL OR LOWER(${qid(
        "product_status"
      )}) NOT IN ('deleted', 'inactive', 'draft'))`
    );
  }

  const search = String(
    params.search || params.keyword || params.q || params.sku || ""
  ).trim();

  if (search) {
    const searchColumns = [
      "sku",
      "variant_sku",
      "child_sku",
      "product_sku",
      "local_sku",
      "model_sku",
      "barcode",
      "product_name",
      "variant_name",
      "name",
      "title",
      "product_title",
      "colour_name",
      "color_name",
      "model_name",
    ].filter((column) => hasColumn(meta, column));

    if (searchColumns.length) {
      where.push(
        `(${searchColumns
          .map((column) => `${qid(column)} LIKE ?`)
          .join(" OR ")})`
      );

      searchColumns.forEach(() => values.push(`%${search}%`));
    }
  }

  const skuExpr = coalesceColumn(
    meta,
    [
      "sku",
      "variant_sku",
      "child_sku",
      "product_sku",
      "local_sku",
      "model_sku",
    ],
    "''"
  );

  const nameExpr = coalesceColumn(
    meta,
    [
      "product_name",
      "variant_name",
      "name",
      "title",
      "product_title",
      "colour_name",
      "color_name",
      "model_name",
    ],
    "''"
  );

  const imageExpr = coalesceColumn(
    meta,
    [
      "image_url",
      "variant_image_url",
      "product_image_url",
      "main_image_url",
      "thumbnail_url",
      "image",
      "variant_image",
      "product_image",
      "main_image",
      "thumbnail",
    ],
    "''"
  );

  const descriptionExpr = coalesceColumn(
    meta,
    ["description", "short_description", "variant_description"],
    "''"
  );

  const stockExpr = coalesceColumn(
    meta,
    ["stock", "qty", "quantity", "available_stock", "variant_stock"],
    "0"
  );

  const preferredSort = ["updated_at", "created_at", meta.primaryKey].find(
    (column) => hasColumn(meta, column)
  );

  const sortBy = preferredSort || meta.primaryKey;
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(
    `
    SELECT
      *,
      ${skuExpr} AS picker_sku,
      ${nameExpr} AS picker_product_name,
      ${imageExpr} AS picker_image_url,
      ${descriptionExpr} AS picker_description,
      ${stockExpr} AS picker_stock
    FROM ${qid(TABLE_NAME)}
    ${whereClause}
    ORDER BY ${qid(sortBy)} DESC
    LIMIT ? OFFSET ?
    `,
    [...values, limit, offset]
  );

  const data = rows.map((row) => ({
    ...row,
    sku: row.picker_sku || row.sku || row.variant_sku || row.child_sku || "",
    product_name:
      row.picker_product_name ||
      row.product_name ||
      row.variant_name ||
      row.name ||
      row.title ||
      "",
    image_url:
      row.picker_image_url ||
      row.image_url ||
      row.variant_image_url ||
      row.product_image_url ||
      "",
    description:
      row.picker_description ||
      row.description ||
      row.short_description ||
      row.variant_description ||
      "",
    stock: row.picker_stock || row.stock || row.qty || row.quantity || 0,
  }));

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM ${qid(TABLE_NAME)}
    ${whereClause}
    `,
    values
  );

  const total = Number(countRows?.[0]?.total || 0);

  return {
    data,
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

  if (hasColumn(meta, "deleted_at")) {
    where.push(`${qid("deleted_at")} IS NULL`);
  }

  const [rows] = await db.query(
    `
    SELECT *
    FROM ${qid(TABLE_NAME)}
    WHERE ${where.join(" AND ")}
    LIMIT 1
    `,
    values
  );

  return rows[0] || null;
}

async function create(payload = {}, options = {}) {
  const meta = await getTableMeta();

  const data = addAuditFields(
    meta,
    pickAllowedData(meta, payload),
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
    `
    INSERT INTO ${qid(TABLE_NAME)}
    (${columns.map(qid).join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    `,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

async function updateById(id, payload = {}, options = {}) {
  const meta = await getTableMeta();

  const data = addAuditFields(
    meta,
    pickAllowedData(meta, payload),
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
    `
    UPDATE ${qid(TABLE_NAME)}
    SET ${assignments}
    WHERE ${qid(meta.primaryKey)} = ?
    `,
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
      `
      UPDATE ${qid(TABLE_NAME)}
      SET ${assignments}
      WHERE ${qid(meta.primaryKey)} = ?
      `,
      [...Object.values(data), id]
    );
  } else {
    await db.query(
      `
      DELETE FROM ${qid(TABLE_NAME)}
      WHERE ${qid(meta.primaryKey)} = ?
      `,
      [id]
    );
  }

  return existing;
}

async function insertMatching(payload = {}) {
  const meta = await getTableMeta();
  const data = pickAllowedData(meta, payload);

  if (!Object.keys(data).length) return null;

  const columns = Object.keys(data);
  const values = Object.values(data);

  const [result] = await db.query(
    `
    INSERT INTO ${qid(TABLE_NAME)}
    (${columns.map(qid).join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
    `,
    values
  );

  return result.insertId ? findById(result.insertId) : data;
}

module.exports = {
  tableName: TABLE_NAME,
  list,
  listForOrderPicker,
  findById,
  create,
  updateById,
  removeById,
  insertMatching,
};