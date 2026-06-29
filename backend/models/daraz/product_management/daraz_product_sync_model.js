const pool = require("../../../config/product_management_db/product_management_db");

function jsonValue(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function safeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeLimit(value, fallback = 100, max = 500) {
  const limit = Number(value || fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(limit, 1), max);
}

function safeOffset(value) {
  const offset = Number(value || 0);
  if (!Number.isFinite(offset)) return 0;
  return Math.max(offset, 0);
}

function getFirstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return null;
}

function findDeepValue(object, keys = []) {
  if (!object || typeof object !== "object") return null;

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ""
    ) {
      return object[key];
    }
  }

  for (const value of Object.values(object)) {
    if (value && typeof value === "object") {
      const found = findDeepValue(value, keys);
      if (found !== null && found !== undefined && found !== "") {
        return found;
      }
    }
  }

  return null;
}

function darazTimeToMysql(value) {
  if (value === undefined || value === null || value === "") return null;

  let timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;

  if (timestamp > 0 && timestamp < 10000000000) {
    timestamp = timestamp * 1000;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 19).replace("T", " ");
}

function getDarazCreatedTime(product = {}) {
  return findDeepValue(product, [
    "created_time",
    "CreatedTime",
    "createdTime",
    "create_time",
    "CreateTime",
    "createTime",
    "created_at",
    "CreatedAt",
    "createdAt",
    "gmt_create",
    "GmtCreate",
    "gmtCreate",
    "date_created",
    "DateCreated",
  ]);
}

function getDarazUpdatedTime(product = {}) {
  return findDeepValue(product, [
    "updated_time",
    "UpdatedTime",
    "updatedTime",
    "update_time",
    "UpdateTime",
    "updateTime",
    "modified_time",
    "ModifiedTime",
    "modifiedTime",
    "updated_at",
    "UpdatedAt",
    "updatedAt",
    "gmt_modified",
    "GmtModified",
    "gmtModified",
    "date_modified",
    "DateModified",
  ]);
}

function getProductImages(product = {}) {
  const images =
    product.images ||
    product.Images ||
    product.image ||
    product.Image ||
    product.main_image ||
    product.MainImage ||
    product.product_images ||
    product.ProductImages ||
    [];

  if (Array.isArray(images)) return images;
  if (typeof images === "string" && images.trim()) return [images];

  return [];
}

function getMainImage(product = {}) {
  const images = getProductImages(product);
  return images[0] || null;
}

function getProductName(product = {}) {
  return getFirstValue(
    product.name,
    product.Name,
    product.title,
    product.Title,
    product.product_name,
    product.ProductName,
    product.attributes?.name,
    product.Attributes?.name,
    findDeepValue(product, ["name", "Name", "title", "Title"])
  );
}

function getProductStatus(product = {}) {
  return getFirstValue(
    product.status,
    product.Status,
    product.product_status,
    product.ProductStatus,
    product.approval_status,
    product.ApprovalStatus,
    product.skus?.[0]?.Status,
    product.skus?.[0]?.status,
    product.Skus?.[0]?.Status,
    product.Skus?.[0]?.status
  );
}

function getProductSellerSku(product = {}) {
  return getFirstValue(
    product.seller_sku,
    product.SellerSku,
    product.sku,
    product.SKU,
    product.shop_sku,
    product.ShopSku,
    product.skus?.[0]?.SellerSku,
    product.skus?.[0]?.seller_sku,
    product.skus?.[0]?.ShopSku,
    product.skus?.[0]?.shop_sku,
    product.skus?.[0]?.sku,
    product.Skus?.[0]?.SellerSku,
    product.Skus?.[0]?.seller_sku,
    product.Skus?.[0]?.ShopSku,
    product.Skus?.[0]?.shop_sku,
    product.Skus?.[0]?.sku
  );
}

function getProductPrice(product = {}) {
  return safeNumber(
    getFirstValue(
      product.price,
      product.Price,
      product.original_price,
      product.OriginalPrice,
      product.skus?.[0]?.price,
      product.skus?.[0]?.Price,
      product.skus?.[0]?.original_price,
      product.skus?.[0]?.OriginalPrice,
      product.Skus?.[0]?.price,
      product.Skus?.[0]?.Price,
      product.Skus?.[0]?.original_price,
      product.Skus?.[0]?.OriginalPrice
    ),
    0
  );
}

function getProductSalePrice(product = {}) {
  return safeNumber(
    getFirstValue(
      product.sale_price,
      product.SalePrice,
      product.special_price,
      product.SpecialPrice,
      product.discount_price,
      product.DiscountPrice,
      product.skus?.[0]?.sale_price,
      product.skus?.[0]?.SalePrice,
      product.skus?.[0]?.special_price,
      product.skus?.[0]?.SpecialPrice,
      product.Skus?.[0]?.sale_price,
      product.Skus?.[0]?.SalePrice,
      product.Skus?.[0]?.special_price,
      product.Skus?.[0]?.SpecialPrice
    ),
    0
  );
}

function getProductQuantity(product = {}) {
  return safeNumber(
    getFirstValue(
      product.quantity,
      product.Quantity,
      product.stock,
      product.Stock,
      product.available,
      product.Available,
      product.skus?.[0]?.quantity,
      product.skus?.[0]?.Quantity,
      product.skus?.[0]?.Available,
      product.skus?.[0]?.available,
      product.skus?.[0]?.stock,
      product.skus?.[0]?.Stock,
      product.Skus?.[0]?.quantity,
      product.Skus?.[0]?.Quantity,
      product.Skus?.[0]?.Available,
      product.Skus?.[0]?.available,
      product.Skus?.[0]?.stock,
      product.Skus?.[0]?.Stock
    ),
    0
  );
}

function getProductBrand(product = {}) {
  return getFirstValue(
    product.brand,
    product.Brand,
    product.brand_name,
    product.BrandName,
    product.attributes?.brand,
    product.Attributes?.brand
  );
}

function getProductCategory(product = {}) {
  const category = getFirstValue(
    product.primary_category,
    product.PrimaryCategory,
    product.primary_category_name,
    product.PrimaryCategoryName,
    product.category_name,
    product.CategoryName,
    product.category,
    product.Category
  );

  return category ? String(category) : null;
}

function getDarazItemId(product = {}) {
  return getFirstValue(
    product.item_id,
    product.ItemId,
    product.itemId,
    product.id,
    product.product_id,
    product.ProductId,
    product.productId,
    findDeepValue(product, ["item_id", "ItemId", "itemId"])
  );
}

function getDarazProductId(product = {}, darazItemId = null) {
  return getFirstValue(
    product.product_id,
    product.ProductId,
    product.productId,
    darazItemId
  );
}

function getProductSkus(product = {}) {
  const skus =
    product.skus ||
    product.Skus ||
    product.variations ||
    product.Variations ||
    product.variants ||
    product.Variants ||
    [];

  return Array.isArray(skus) ? skus : [];
}

function normalizeJsonForCompare(value) {
  if (value === undefined || value === null) return null;

  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return value;
    }
  }

  return jsonValue(value);
}

async function createSyncRun({ account_id, sync_type = "manual" }) {
  const [result] = await pool.query(
    `INSERT INTO daraz_product_sync_runs 
      (account_id, sync_type, status, started_at)
     VALUES (?, ?, 'running', NOW())`,
    [account_id, sync_type]
  );

  return result.insertId;
}

async function finishSyncRun({
  run_id,
  status = "success",
  total_found = 0,
  total_saved = 0,
  total_failed = 0,
  error_message = null,
}) {
  await pool.query(
    `UPDATE daraz_product_sync_runs
     SET status = ?,
         total_found = ?,
         total_saved = ?,
         total_failed = ?,
         error_message = ?,
         finished_at = NOW()
     WHERE id = ?`,
    [
      status,
      total_found,
      total_saved,
      total_failed,
      error_message,
      run_id,
    ]
  );
}

async function upsertDarazProduct({ account_id, product }) {
  const darazItemId = getDarazItemId(product);

  if (!darazItemId) {
    throw new Error("Daraz item_id missing");
  }

  const sellerSku = getProductSellerSku(product);
  const name = getProductName(product);
  const status = getProductStatus(product);
  const price = getProductPrice(product);
  const salePrice = getProductSalePrice(product);
  const quantity = getProductQuantity(product);
  const images = getProductImages(product);
  const mainImage = getMainImage(product);
  const brand = getProductBrand(product);
  const category = getProductCategory(product);
  const currency = getFirstValue(product.currency, product.Currency, "LKR");
  const skus = getProductSkus(product);
  const rawJson = jsonValue(product);

  const rawDarazCreatedTime = getDarazCreatedTime(product);
  const rawDarazUpdatedTime = getDarazUpdatedTime(product);

  const darazCreatedAt = darazTimeToMysql(rawDarazCreatedTime);
  const darazUpdatedAt = darazTimeToMysql(rawDarazUpdatedTime);

  console.log("[DARAZ_PRODUCT_TIME_DEBUG]", {
    account_id,
    item_id: darazItemId,
    raw_created_time: rawDarazCreatedTime,
    raw_updated_time: rawDarazUpdatedTime,
    daraz_created_at: darazCreatedAt,
    daraz_updated_at: darazUpdatedAt,
  });

  const [existingRows] = await pool.query(
    `SELECT id, raw_json
     FROM daraz_products
     WHERE account_id = ?
       AND daraz_item_id = ?
     LIMIT 1`,
    [account_id, String(darazItemId)]
  );

  const existingProduct = existingRows[0] || null;

  let syncAction = "new_synced";

  if (existingProduct) {
    const oldRawJson = normalizeJsonForCompare(existingProduct.raw_json);
    const newRawJson = normalizeJsonForCompare(rawJson);

    syncAction = oldRawJson === newRawJson ? "already_synced" : "updated_synced";
  }

  const [result] = await pool.query(
    `INSERT INTO daraz_products
      (
        account_id,
        daraz_item_id,
        daraz_product_id,
        daraz_created_at,
        daraz_updated_at,
        seller_sku,
        name,
        status,
        primary_category,
        brand,
        price,
        sale_price,
        quantity,
        currency,
        main_image,
        images_json,
        attributes_json,
        skus_json,
        raw_json,
        sync_status,
        last_synced_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
        daraz_product_id = VALUES(daraz_product_id),
        daraz_created_at = COALESCE(VALUES(daraz_created_at), daraz_created_at),
        daraz_updated_at = COALESCE(VALUES(daraz_updated_at), daraz_updated_at),
        seller_sku = VALUES(seller_sku),
        name = VALUES(name),
        status = VALUES(status),
        primary_category = VALUES(primary_category),
        brand = VALUES(brand),
        price = VALUES(price),
        sale_price = VALUES(sale_price),
        quantity = VALUES(quantity),
        currency = VALUES(currency),
        main_image = VALUES(main_image),
        images_json = VALUES(images_json),
        attributes_json = VALUES(attributes_json),
        skus_json = VALUES(skus_json),
        raw_json = VALUES(raw_json),
        sync_status = VALUES(sync_status),
        last_synced_at = NOW(),
        updated_at = CURRENT_TIMESTAMP`,
    [
      account_id,
      String(darazItemId),
      String(getDarazProductId(product, darazItemId)),
      darazCreatedAt,
      darazUpdatedAt,
      sellerSku,
      name,
      status,
      category,
      brand,
      price,
      salePrice,
      quantity,
      currency,
      mainImage,
      jsonValue(images),
      jsonValue(product.attributes || product.Attributes || {}),
      jsonValue(skus),
      rawJson,
      syncAction,
    ]
  );

  return {
    result,
    sync_action: syncAction,
  };
}

async function upsertDarazVariants({ account_id, daraz_item_id, product }) {
  const skus = getProductSkus(product);

  if (!Array.isArray(skus) || skus.length === 0) return 0;

  let saved = 0;

  for (const sku of skus) {
    const sellerSku = getFirstValue(
      sku.seller_sku,
      sku.SellerSku,
      sku.sku,
      sku.SKU,
      sku.ShopSku,
      sku.shop_sku
    );

    if (!sellerSku) continue;

    const darazSkuId = getFirstValue(
      sku.sku_id,
      sku.SkuId,
      sku.daraz_sku_id,
      sku.DarazSkuId
    );

    const price = safeNumber(
      getFirstValue(sku.price, sku.Price, sku.original_price, sku.OriginalPrice),
      0
    );

    const salePrice = safeNumber(
      getFirstValue(
        sku.sale_price,
        sku.SalePrice,
        sku.special_price,
        sku.SpecialPrice,
        sku.discount_price,
        sku.DiscountPrice
      ),
      0
    );

    const quantity = safeNumber(
      getFirstValue(
        sku.quantity,
        sku.Quantity,
        sku.Available,
        sku.available,
        sku.stock,
        sku.Stock
      ),
      0
    );

    const status = getFirstValue(sku.status, sku.Status);

    const name = getFirstValue(
      sku.name,
      sku.Name,
      product.attributes?.name,
      product.Attributes?.name,
      product.name,
      product.Name
    );

    await pool.query(
      `INSERT INTO daraz_product_variants
        (
          account_id,
          daraz_item_id,
          daraz_sku_id,
          seller_sku,
          name,
          price,
          sale_price,
          quantity,
          status,
          variant_json,
          last_synced_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
          daraz_item_id = VALUES(daraz_item_id),
          daraz_sku_id = VALUES(daraz_sku_id),
          name = VALUES(name),
          price = VALUES(price),
          sale_price = VALUES(sale_price),
          quantity = VALUES(quantity),
          status = VALUES(status),
          variant_json = VALUES(variant_json),
          last_synced_at = NOW(),
          updated_at = CURRENT_TIMESTAMP`,
      [
        account_id,
        String(daraz_item_id),
        darazSkuId ? String(darazSkuId) : null,
        sellerSku,
        name,
        price,
        salePrice,
        quantity,
        status,
        jsonValue(sku),
      ]
    );

    saved += 1;
  }

  return saved;
}

async function listPreview({
  account_id,
  search = "",
  status = "",
  sync_status = "",
  min_price = "",
  max_price = "",
  stock = "",
  limit = 100,
  offset = 0,
  with_count = false,
} = {}) {
  const safeLimitValue = safeLimit(limit);
  const safeOffsetValue = safeOffset(offset);

  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  if (search) {
    where += ` AND (
      seller_sku LIKE ? 
      OR name LIKE ? 
      OR daraz_item_id LIKE ?
      OR daraz_product_id LIKE ?
      OR primary_category LIKE ?
    )`;
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  if (status) {
    where += ` AND status = ?`;
    params.push(status);
  }

  if (sync_status) {
    where += ` AND sync_status = ?`;
    params.push(sync_status);
  }

  if (min_price !== "" && min_price !== null && min_price !== undefined) {
    where += ` AND price >= ?`;
    params.push(Number(min_price));
  }

  if (max_price !== "" && max_price !== null && max_price !== undefined) {
    where += ` AND price <= ?`;
    params.push(Number(max_price));
  }

  if (stock === "in_stock") {
    where += ` AND quantity > 0`;
  }

  if (stock === "out_of_stock") {
    where += ` AND quantity <= 0`;
  }

  const [rows] = await pool.query(
    `SELECT 
        id,
        account_id,
        daraz_item_id,
        daraz_product_id,
        daraz_created_at,
        daraz_updated_at,
        seller_sku,
        name,
        status,
        primary_category,
        brand,
        price,
        sale_price,
        quantity,
        currency,
        main_image,
        images_json,
        attributes_json,
        skus_json,
        sync_status,
        last_synced_at,
        created_at,
        updated_at
     FROM daraz_products
     ${where}
     ORDER BY last_synced_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimitValue, safeOffsetValue]
  );

  if (!with_count) return rows;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM daraz_products
     ${where}`,
    params
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
    limit: safeLimitValue,
    offset: safeOffsetValue,
  };
}

async function listRuns({ account_id, status = "", limit = 50 } = {}) {
  const safeLimitValue = safeLimit(limit, 50, 200);

  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  if (status) {
    where += ` AND status = ?`;
    params.push(status);
  }

  const [rows] = await pool.query(
    `SELECT *
     FROM daraz_product_sync_runs
     ${where}
     ORDER BY started_at DESC
     LIMIT ?`,
    [...params, safeLimitValue]
  );

  return rows;
}

async function getPreviewById(id) {
  const [rows] = await pool.query(
    `SELECT *
     FROM daraz_products
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function getPreviewByDarazItemId({ account_id, daraz_item_id }) {
  const [rows] = await pool.query(
    `SELECT *
     FROM daraz_products
     WHERE account_id = ?
       AND daraz_item_id = ?
     LIMIT 1`,
    [account_id, String(daraz_item_id)]
  );

  return rows[0] || null;
}

async function getVariantsByProduct({ account_id, daraz_item_id }) {
  const [rows] = await pool.query(
    `SELECT *
     FROM daraz_product_variants
     WHERE account_id = ?
       AND daraz_item_id = ?
     ORDER BY id ASC`,
    [account_id, String(daraz_item_id)]
  );

  return rows;
}

async function getProductRawJson(id) {
  const [rows] = await pool.query(
    `SELECT 
        id,
        account_id,
        daraz_item_id,
        daraz_created_at,
        daraz_updated_at,
        raw_json,
        attributes_json,
        skus_json,
        images_json
     FROM daraz_products
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function getLatestRun({ account_id } = {}) {
  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  const [rows] = await pool.query(
    `SELECT *
     FROM daraz_product_sync_runs
     ${where}
     ORDER BY started_at DESC
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

async function getProductStats({ account_id } = {}) {
  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  const [rows] = await pool.query(
    `SELECT
        COUNT(*) AS total_products,
        COUNT(DISTINCT seller_sku) AS unique_skus,
        SUM(CASE WHEN quantity > 0 THEN 1 ELSE 0 END) AS in_stock_products,
        SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock_products,
        SUM(CASE WHEN LOWER(status) = 'active' OR LOWER(status) = 'live' THEN 1 ELSE 0 END) AS active_products,
        SUM(CASE WHEN LOWER(status) = 'inactive' THEN 1 ELSE 0 END) AS inactive_products,
        SUM(CASE WHEN LOWER(status) = 'draft' THEN 1 ELSE 0 END) AS draft_products,
        SUM(CASE WHEN LOWER(status) LIKE '%pending%' THEN 1 ELSE 0 END) AS pending_products,
        SUM(CASE WHEN LOWER(status) LIKE '%violation%' THEN 1 ELSE 0 END) AS violation_products,
        SUM(CASE WHEN LOWER(status) = 'deleted' THEN 1 ELSE 0 END) AS deleted_products,
        COALESCE(SUM(quantity), 0) AS total_stock,
        COALESCE(MIN(price), 0) AS min_price,
        COALESCE(MAX(price), 0) AS max_price,
        COALESCE(AVG(price), 0) AS avg_price,
        MAX(last_synced_at) AS last_synced_at,
        MIN(daraz_created_at) AS oldest_daraz_created_at,
        MAX(daraz_updated_at) AS latest_daraz_updated_at
     FROM daraz_products
     ${where}`,
    params
  );

  return rows[0] || {
    total_products: 0,
    unique_skus: 0,
    in_stock_products: 0,
    out_of_stock_products: 0,
    active_products: 0,
    inactive_products: 0,
    draft_products: 0,
    pending_products: 0,
    violation_products: 0,
    deleted_products: 0,
    total_stock: 0,
    min_price: 0,
    max_price: 0,
    avg_price: 0,
    last_synced_at: null,
    oldest_daraz_created_at: null,
    latest_daraz_updated_at: null,
  };
}

async function getStatusSummary({ account_id } = {}) {
  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  const [rows] = await pool.query(
    `SELECT
        COALESCE(status, 'unknown') AS status,
        COUNT(*) AS total
     FROM daraz_products
     ${where}
     GROUP BY COALESCE(status, 'unknown')
     ORDER BY total DESC`,
    params
  );

  return rows;
}

async function getCategorySummary({ account_id, limit = 20 } = {}) {
  const safeLimitValue = safeLimit(limit, 20, 100);

  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  const [rows] = await pool.query(
    `SELECT
        COALESCE(primary_category, 'unknown') AS primary_category,
        COUNT(*) AS total
     FROM daraz_products
     ${where}
     GROUP BY COALESCE(primary_category, 'unknown')
     ORDER BY total DESC
     LIMIT ?`,
    [...params, safeLimitValue]
  );

  return rows;
}

async function updateProductSyncStatus({ id, sync_status }) {
  await pool.query(
    `UPDATE daraz_products
     SET sync_status = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [sync_status, id]
  );
}

async function updateProductLocalLink({
  id,
  local_product_id = null,
  local_variant_id = null,
} = {}) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM daraz_products`);

  const columnNames = columns.map((column) => column.Field);

  if (
    !columnNames.includes("local_product_id") &&
    !columnNames.includes("local_variant_id")
  ) {
    return {
      skipped: true,
      reason: "local_product_id/local_variant_id columns not found",
    };
  }

  const updates = [];
  const params = [];

  if (columnNames.includes("local_product_id")) {
    updates.push("local_product_id = ?");
    params.push(local_product_id);
  }

  if (columnNames.includes("local_variant_id")) {
    updates.push("local_variant_id = ?");
    params.push(local_variant_id);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  await pool.query(
    `UPDATE daraz_products
     SET ${updates.join(", ")}
     WHERE id = ?`,
    params
  );

  return {
    skipped: false,
  };
}

async function deletePreviewProduct(id) {
  const product = await getPreviewById(id);

  if (!product) {
    return {
      deleted: false,
      reason: "Product not found",
    };
  }

  await pool.query(
    `DELETE FROM daraz_product_variants
     WHERE account_id = ?
       AND daraz_item_id = ?`,
    [product.account_id, product.daraz_item_id]
  );

  await pool.query(
    `DELETE FROM daraz_products
     WHERE id = ?`,
    [id]
  );

  return {
    deleted: true,
  };
}

async function bulkDeleteByAccount(account_id) {
  await pool.query(
    `DELETE FROM daraz_product_variants
     WHERE account_id = ?`,
    [account_id]
  );

  const [result] = await pool.query(
    `DELETE FROM daraz_products
     WHERE account_id = ?`,
    [account_id]
  );

  return result.affectedRows || 0;
}

async function countProducts({ account_id } = {}) {
  const params = [];
  let where = `WHERE 1=1`;

  if (account_id) {
    where += ` AND account_id = ?`;
    params.push(account_id);
  }

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM daraz_products
     ${where}`,
    params
  );

  return Number(rows[0]?.total || 0);
}

/**
 * Daraz order list page-ku required.
 * This attaches all rows from daraz_order_items for each order.
 */
async function listOrderItemsForOrders() {
  // Order management is intentionally removed from this project.
  // Keep this compatibility function so old callers do not crash, but do not query order tables.
  return [];
}

module.exports = {
  createSyncRun,
  finishSyncRun,
  upsertDarazProduct,
  upsertDarazVariants,
  listPreview,
  listRuns,
  getPreviewById,
  getPreviewByDarazItemId,
  getVariantsByProduct,
  getProductRawJson,
  getLatestRun,
  getProductStats,
  getStatusSummary,
  getCategorySummary,
  updateProductSyncStatus,
  updateLocalLink: updateProductLocalLink,
  updateProductLocalLink,
  deletePreviewProduct,
  bulkDeleteByAccount,
  countProducts,
  listOrderItemsForOrders,
};