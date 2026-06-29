const crypto = require("crypto");
const marketplacePool = require("../../../config/marketplace_management_db/cm_marketplace_management");
const productPool = require("../../../config/product_management_db/product_management_db");

function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function json(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch (_) {
    return null;
  }
}

function decimalOrNull(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return number;
}

function intOrNull(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return Math.trunc(number);
}

function boolToInt(value) {
  return value ? 1 : 0;
}

function dateOrNull(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

async function upsertWooProduct(accountId, product) {
  const productId = product?.id;

  if (!productId) {
    throw new Error("Woo product ID missing.");
  }

  await productPool.query(
    `INSERT INTO woo_products
      (
        account_id,
        woo_product_id,
        sku,
        name,
        slug,
        permalink,
        product_type,
        status,
        catalog_visibility,
        description,
        short_description,
        regular_price,
        sale_price,
        price,
        purchasable,
        on_sale,
        virtual_product,
        downloadable,
        manage_stock,
        stock_quantity,
        stock_status,
        weight,
        dimensions_json,
        categories_json,
        tags_json,
        attributes_json,
        images_json,
        date_created,
        date_modified,
        raw_json,
        last_synced_at
      )
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
        sku = VALUES(sku),
        name = VALUES(name),
        slug = VALUES(slug),
        permalink = VALUES(permalink),
        product_type = VALUES(product_type),
        status = VALUES(status),
        catalog_visibility = VALUES(catalog_visibility),
        description = VALUES(description),
        short_description = VALUES(short_description),
        regular_price = VALUES(regular_price),
        sale_price = VALUES(sale_price),
        price = VALUES(price),
        purchasable = VALUES(purchasable),
        on_sale = VALUES(on_sale),
        virtual_product = VALUES(virtual_product),
        downloadable = VALUES(downloadable),
        manage_stock = VALUES(manage_stock),
        stock_quantity = VALUES(stock_quantity),
        stock_status = VALUES(stock_status),
        weight = VALUES(weight),
        dimensions_json = VALUES(dimensions_json),
        categories_json = VALUES(categories_json),
        tags_json = VALUES(tags_json),
        attributes_json = VALUES(attributes_json),
        images_json = VALUES(images_json),
        date_created = VALUES(date_created),
        date_modified = VALUES(date_modified),
        raw_json = VALUES(raw_json),
        last_synced_at = NOW(),
        updated_at = NOW()`,
    [
      accountId,
      product.id,
      product.sku || null,
      product.name || null,
      product.slug || null,
      product.permalink || null,
      product.type || null,
      product.status || null,
      product.catalog_visibility || null,
      product.description || null,
      product.short_description || null,
      decimalOrNull(product.regular_price),
      decimalOrNull(product.sale_price),
      decimalOrNull(product.price),
      boolToInt(product.purchasable),
      boolToInt(product.on_sale),
      boolToInt(product.virtual),
      boolToInt(product.downloadable),
      boolToInt(product.manage_stock),
      intOrNull(product.stock_quantity),
      product.stock_status || null,
      product.weight || null,
      json(product.dimensions),
      json(product.categories),
      json(product.tags),
      json(product.attributes),
      json(product.images),
      dateOrNull(product.date_created),
      dateOrNull(product.date_modified),
      json(product),
    ]
  );

  await syncWooProductImages(accountId, product);
}

async function syncWooProductImages(accountId, product) {
  const productId = product?.id;

  if (!productId) return;

  await productPool.query(
    `DELETE FROM woo_product_images
     WHERE account_id = ?
       AND woo_product_id = ?`,
    [accountId, productId]
  );

  const images = Array.isArray(product.images) ? product.images : [];

  for (const image of images) {
    await productPool.query(
      `INSERT INTO woo_product_images
        (
          account_id,
          woo_product_id,
          woo_image_id,
          image_position,
          image_name,
          image_alt,
          image_src,
          raw_json
        )
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        productId,
        image.id || null,
        intOrNull(image.position) || 0,
        image.name || null,
        image.alt || null,
        image.src || null,
        json(image),
      ]
    );
  }
}

async function upsertWooVariation(accountId, productId, variation) {
  if (!variation?.id) {
    throw new Error("Woo variation ID missing.");
  }

  await productPool.query(
    `INSERT INTO woo_product_variants
      (
        account_id,
        woo_product_id,
        woo_variation_id,
        sku,
        regular_price,
        sale_price,
        price,
        manage_stock,
        stock_quantity,
        stock_status,
        weight,
        dimensions_json,
        attributes_json,
        image_json,
        date_created,
        date_modified,
        raw_json,
        last_synced_at
      )
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
        woo_product_id = VALUES(woo_product_id),
        sku = VALUES(sku),
        regular_price = VALUES(regular_price),
        sale_price = VALUES(sale_price),
        price = VALUES(price),
        manage_stock = VALUES(manage_stock),
        stock_quantity = VALUES(stock_quantity),
        stock_status = VALUES(stock_status),
        weight = VALUES(weight),
        dimensions_json = VALUES(dimensions_json),
        attributes_json = VALUES(attributes_json),
        image_json = VALUES(image_json),
        date_created = VALUES(date_created),
        date_modified = VALUES(date_modified),
        raw_json = VALUES(raw_json),
        last_synced_at = NOW(),
        updated_at = NOW()`,
    [
      accountId,
      productId,
      variation.id,
      variation.sku || null,
      decimalOrNull(variation.regular_price),
      decimalOrNull(variation.sale_price),
      decimalOrNull(variation.price),
      boolToInt(variation.manage_stock),
      intOrNull(variation.stock_quantity),
      variation.stock_status || null,
      variation.weight || null,
      json(variation.dimensions),
      json(variation.attributes),
      json(variation.image),
      dateOrNull(variation.date_created),
      dateOrNull(variation.date_modified),
      json(variation),
    ]
  );
}

async function createSyncJob(accountId, triggeredByType = "manual") {
  const [result] = await marketplacePool.query(
    `INSERT INTO sync_jobs
      (
        job_uid,
        account_id,
        platform_code,
        sync_type,
        direction,
        status,
        triggered_by_type,
        started_at,
        message,
        created_at,
        updated_at
      )
     VALUES
      (?, ?, 'woocommerce', 'products', 'pull', 'running', ?, NOW(), 'WooCommerce product sync started', NOW(), NOW())`,
    [uid("woo_product_sync"), accountId, triggeredByType]
  );

  return result.insertId;
}

async function addSyncItem({
  jobId,
  accountId,
  itemType,
  localReference = null,
  marketplaceReference = null,
  sku = null,
  status = "success",
  message = null,
  errorCode = null,
  errorDetails = null,
}) {
  await marketplacePool.query(
    `INSERT INTO sync_job_items
      (
        job_id,
        account_id,
        item_type,
        local_reference,
        marketplace_reference,
        sku,
        status,
        message,
        error_code,
        error_details,
        created_at
      )
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      jobId,
      accountId,
      itemType,
      localReference,
      marketplaceReference,
      sku,
      status,
      message,
      errorCode,
      errorDetails,
    ]
  );
}

async function finishSyncJob(jobId, summary) {
  const total = Number(summary.total_records || 0);
  const success = Number(summary.success_records || 0);
  const failed = Number(summary.failed_records || 0);
  const skipped = Number(summary.skipped_records || 0);

  let status = "success";

  if (failed > 0 && success > 0) status = "partial_success";
  if (failed > 0 && success === 0) status = "failed";

  await marketplacePool.query(
    `UPDATE sync_jobs
     SET status = ?,
         total_records = ?,
         success_records = ?,
         failed_records = ?,
         skipped_records = ?,
         finished_at = NOW(),
         message = ?,
         error_details = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      status,
      total,
      success,
      failed,
      skipped,
      summary.message || "WooCommerce product sync completed",
      summary.error_details || null,
      jobId,
    ]
  );

  return status;
}

async function markAccountProductSync(accountId, success, errorMessage = null) {
  await marketplacePool.query(
    `UPDATE accounts
     SET last_sync_at = NOW(),
         last_error = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [success ? null : errorMessage, accountId]
  );

  await marketplacePool.query(
    `INSERT INTO account_health
      (
        account_id,
        platform_code,
        connection_status,
        token_status,
        last_product_sync_at,
        error_count_today,
        success_count_today,
        last_error,
        last_checked_at,
        created_at,
        updated_at
      )
     VALUES
      (?, 'woocommerce', ?, 'not_required', NOW(), ?, ?, ?, NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE
        connection_status = VALUES(connection_status),
        token_status = 'not_required',
        last_product_sync_at = IF(? = 1, NOW(), last_product_sync_at),
        error_count_today = error_count_today + VALUES(error_count_today),
        success_count_today = success_count_today + VALUES(success_count_today),
        last_error = VALUES(last_error),
        last_checked_at = NOW(),
        updated_at = NOW()`,
    [
      accountId,
      success ? "connected" : "failed",
      success ? 0 : 1,
      success ? 1 : 0,
      success ? null : errorMessage,
      success ? 1 : 0,
    ]
  );
}

async function getDueWooAccounts() {
  const [rows] = await marketplacePool.query(
    `SELECT
        a.id AS account_id,
        a.account_name,
        a.account_code,
        a.store_url,
        COALESCE(s.product_sync_interval_minutes, 15) AS product_sync_interval_minutes,
        h.last_product_sync_at
     FROM accounts a
     INNER JOIN platforms p ON p.id = a.platform_id
     LEFT JOIN account_sync_settings s ON s.account_id = a.id
     LEFT JOIN account_health h ON h.account_id = a.id
     WHERE LOWER(p.platform_code) IN ('woocommerce', 'woo')
       AND a.status = 'active'
       AND a.connection_status = 'connected'
       AND COALESCE(s.sync_products_enabled, 1) = 1
       AND (
          h.last_product_sync_at IS NULL
          OR h.last_product_sync_at <= DATE_SUB(
            NOW(),
            INTERVAL COALESCE(s.product_sync_interval_minutes, 15) MINUTE
          )
       )
     ORDER BY h.last_product_sync_at ASC, a.id ASC`
  );

  return rows;
}

async function listSyncedWooProducts(
  accountId,
  { page = 1, limit = 50, search = "" } = {}
) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const values = [accountId];
  let where = `WHERE account_id = ?`;

  if (search) {
    where += ` AND (name LIKE ? OR sku LIKE ? OR CAST(woo_product_id AS CHAR) LIKE ?)`;
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countRows] = await productPool.query(
    `SELECT COUNT(*) AS total
     FROM woo_products
     ${where}`,
    values
  );

  const [rows] = await productPool.query(
    `SELECT
        id,
        account_id,
        woo_product_id,
        sku,
        name,
        product_type,
        status,
        regular_price,
        sale_price,
        price,
        manage_stock,
        stock_quantity,
        stock_status,
        permalink,
        last_synced_at,
        updated_at
     FROM woo_products
     ${where}
     ORDER BY last_synced_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, safeLimit, offset]
  );

  return {
    total: Number(countRows[0]?.total || 0),
    page: safePage,
    limit: safeLimit,
    data: rows,
  };
}

async function getSyncedWooProductDetail(accountId, wooProductId) {
  const [products] = await productPool.query(
    `SELECT *
     FROM woo_products
     WHERE account_id = ?
       AND woo_product_id = ?
     LIMIT 1`,
    [accountId, wooProductId]
  );

  if (!products.length) {
    return null;
  }

  const product = products[0];

  const [variants] = await productPool.query(
    `SELECT *
     FROM woo_product_variants
     WHERE account_id = ?
       AND woo_product_id = ?
     ORDER BY id ASC`,
    [accountId, wooProductId]
  );

  const [images] = await productPool.query(
    `SELECT *
     FROM woo_product_images
     WHERE account_id = ?
       AND woo_product_id = ?
     ORDER BY image_position ASC, id ASC`,
    [accountId, wooProductId]
  );

  return {
    product,
    variants,
    images,
  };
}

module.exports = {
  upsertWooProduct,
  upsertWooVariation,
  createSyncJob,
  addSyncItem,
  finishSyncJob,
  markAccountProductSync,
  getDueWooAccounts,
  listSyncedWooProducts,
  getSyncedWooProductDetail,
};