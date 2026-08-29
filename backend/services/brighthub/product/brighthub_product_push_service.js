const fs = require("fs/promises");
const path = require("path");

const brighthubModel = require("../../../models/marketplace/brighthub/brighthub_model");
const brighthubApi = require("../../marketplace/brighthub/brighthub_api_service");
const brighthubProductModel = require("../../../models/brighthub/product/brighthub_product_model");
const productModel = require("../../../models/product_management/product/product_model");
const categoryModel = require("../../../models/product_management/category/category_model");
const productPriceModel = require("../../../models/product_management/product/product_price_model");
const productInventoryModel = require("../../../models/product_management/product/product_inventory_model");
const db = require("../../../config/product_management_db/product_management_db");

const MIME_BY_EXT = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

// product_images.image_path/image_url are web paths like
// "/uploads/product-images/xxx.webp" - the upload middleware writes files to
// path.join(process.cwd(), "uploads", "product-images", ...), so stripping
// any scheme/host and the leading slash and rejoining onto cwd recovers the
// real file on disk (this service runs in the same backend process/host as
// that upload middleware, so no network fetch is needed).
function localImagePath(image) {
  const rel = image?.image_path || image?.image_url;
  if (!rel) return null;

  const cleaned = String(rel).replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "");
  return path.join(process.cwd(), cleaned);
}

// "local_selling_price" is this catalog's price for its own website
// (mirroring how daraz_price/woo_price are the Daraz/WooCommerce-specific
// prices) - falls back to sale_price (the general selling price) if that
// hasn't been set. Returns null (never 0) so the caller can tell "no price
// yet" apart from "genuinely free", since BrightHub requires price > 0.
function resolvePrice(priceRow) {
  if (!priceRow) return null;

  const local = Number(priceRow.local_selling_price);
  if (Number.isFinite(local) && local > 0) return local;

  const sale = Number(priceRow.sale_price);
  if (Number.isFinite(sale) && sale > 0) return sale;

  return null;
}

// Creates (or, since BrightHub's category endpoint matches by slug, reuses)
// a BrightHub category for every local category not yet linked to one, and
// records the mapping so it's never re-created on later runs.
async function pushUnmappedCategories(credentials) {
  const unmapped = await categoryModel.getUnmappedForBrightHub();
  const result = { total: unmapped.length, success: 0, failed: 0 };

  for (const category of unmapped) {
    try {
      const created = await brighthubApi.createCategory(credentials, {
        name: category.name,
        slug: category.slug,
      });

      if (created?.id) {
        await categoryModel.setBrightHubCategoryId(category.id, created.id);
        result.success += 1;
      } else {
        result.failed += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error(`[BRIGHTHUB_CATEGORY_PUSH_FAILED] "${category.name}":`, error.message);
    }
  }

  return result;
}

async function uploadLocalImages(credentials, images = []) {
  const uploadedUrls = [];

  for (const image of images) {
    const filePath = localImagePath(image);
    if (!filePath) continue;

    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_BY_EXT[ext] || "image/webp";

      const media = await brighthubApi.uploadMedia(credentials, buffer, path.basename(filePath), mimeType);
      if (media?.url) uploadedUrls.push(media.url);
    } catch (error) {
      console.error(`[BRIGHTHUB_IMAGE_PUSH_FAILED] ${filePath}:`, error.message);
    }
  }

  return uploadedUrls;
}

// Local products not yet linked to a brighthub_products row - once a
// product has a link it is never picked up again, regardless of later local
// edits (the whole point: after transfer, further edits happen on
// BrightHub's side, not here).
async function getUnpushedProductIds(accountId) {
  const pushedIds = await brighthubProductModel.getPushedLocalProductIds(accountId);

  const [rows] = await db.query(`SELECT id FROM products WHERE deleted_at IS NULL ORDER BY id ASC`);

  return rows.map((row) => Number(row.id)).filter((id) => !pushedIds.has(id));
}

async function pushOneProduct(accountId, credentials, jobId, id) {
  const product = await productModel.findById(id);
  if (!product) return { status: "skipped" };

  const priceRow = product.sku ? await productPriceModel.findBySku(product.sku) : null;
  const price = resolvePrice(priceRow);

  if (!price) {
    await brighthubProductModel.addSyncItem({
      jobId,
      accountId,
      itemType: "product",
      localReference: String(id),
      sku: product.sku || null,
      status: "skipped",
      message: "No local selling price set yet - will be transferred once priced.",
    });
    return { status: "skipped" };
  }

  const inventoryRow = product.sku ? await productInventoryModel.findBySku(product.sku) : null;
  const stockQuantity = inventoryRow ? Math.max(Number(inventoryRow.available_qty) || 0, 0) : 0;

  let categoryId = null;
  if (product.category_id) {
    const category = await categoryModel.getById(product.category_id);
    categoryId = category?.brighthub_category_id || null;
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const uploadedUrls = await uploadLocalImages(credentials, images);

  const payload = {
    name: product.name || product.product_name,
    description: product.description || undefined,
    price,
    sku: product.sku || undefined,
    category_id: categoryId || undefined,
    stock_quantity: stockQuantity,
    status: product.status || "active",
    image_main_url: uploadedUrls[0] || undefined,
    images: uploadedUrls,
  };

  const created = await brighthubApi.createProduct(credentials, payload);

  if (!created?.bhid) {
    throw new Error("BrightHub did not return a product id.");
  }

  await brighthubProductModel.recordPushedBrightHubProduct(accountId, id, created);

  await brighthubProductModel.addSyncItem({
    jobId,
    accountId,
    itemType: "product",
    localReference: String(id),
    marketplaceReference: created.bhid,
    sku: product.sku || null,
    status: "success",
    message: "Product pushed to BrightHub.",
  });

  return { status: "success" };
}

async function pushLocalProductsForAccount(accountId, options = {}) {
  const triggeredByType = options.triggered_by_type || "user";
  const credentials = await brighthubModel.getBrightHubCredentials(accountId);

  const categoryResult = await pushUnmappedCategories(credentials);
  const jobId = await brighthubProductModel.createPushSyncJob(accountId, triggeredByType);

  const summary = {
    job_id: jobId,
    account_id: Number(accountId),
    status: "running",
    total_records: 0,
    success_records: 0,
    failed_records: 0,
    skipped_records: 0,
    categories_created: categoryResult.success,
  };

  try {
    const productIds = await getUnpushedProductIds(accountId);

    for (const id of productIds) {
      summary.total_records += 1;

      try {
        const { status } = await pushOneProduct(accountId, credentials, jobId, id);
        if (status === "success") summary.success_records += 1;
        else summary.skipped_records += 1;
      } catch (error) {
        summary.failed_records += 1;

        await brighthubProductModel.addSyncItem({
          jobId,
          accountId,
          itemType: "product",
          localReference: String(id),
          status: "failed",
          message: "Product push failed",
          errorCode: "PRODUCT_PUSH_FAILED",
          errorDetails: error.message,
        }).catch(() => {});

        console.error(`[BRIGHTHUB_PRODUCT_PUSH_FAILED] local product #${id}:`, error.message);
      }
    }

    const finalStatus = await brighthubProductModel.finishPushSyncJob(jobId, {
      ...summary,
      message: `BrightHub local catalog push completed. Pushed: ${summary.success_records}, skipped: ${summary.skipped_records}, failed: ${summary.failed_records}.`,
    });

    summary.status = finalStatus;

    return summary;
  } catch (error) {
    summary.status = "failed";
    summary.error_details = error.message;

    await brighthubProductModel.finishPushSyncJob(jobId, summary);

    throw error;
  }
}

async function pushDueBrightHubAccounts() {
  const accounts = await brighthubModel.listActiveBrightHubAccounts();
  const results = [];

  for (const account of accounts) {
    try {
      const result = await pushLocalProductsForAccount(account.id, { triggered_by_type: "system" });
      results.push({ account_id: account.id, success: true, result });
    } catch (error) {
      results.push({ account_id: account.id, success: false, error: error.message });
    }
  }

  return { checked_accounts: accounts.length, results };
}

module.exports = {
  pushLocalProductsForAccount,
  pushDueBrightHubAccounts,
};
