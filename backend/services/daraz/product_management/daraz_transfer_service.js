const fs = require("fs");
const path = require("path");
const axios = require("axios");
const db = require("../../../config/product_management_db/product_management_db");
const productModel = require("../../../models/product_management/product/product_model");
const productPriceModel = require("../../../models/product_management/product/product_price_model.js");
const productInventoryModel = require("../../../models/product_management/product/product_inventory_model.js");
const skuMappingModel = require("../../../models/product_management/sku_mapping/sku_mapping_model");
const tokenService = require("../../marketplace/token_service");
const darazProductApiService = require("../../marketplace/daraz_product_api_service");
const darazCatalogApiService = require("../../marketplace/daraz_catalog_api_service");
const darazProductSyncService = require("./daraz_product_sync_service");
const logModel = require("../../../models/logModel");

// system_logs.message is VARCHAR(500) — MySQL strict mode rejects an
// over-length INSERT outright, which would silently drop the whole log row.
async function safeLogTransfer(payload) {
  try {
    await logModel.createSystemLog({
      ...payload,
      message: payload.message ? String(payload.message).slice(0, 490) : payload.message,
    });
  } catch (error) {
    console.error("[DARAZ_TRANSFER_LOG_FAIL]", error?.message);
  }
}

const SUFFIX_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

async function isSellerSkuTaken(accountId, sellerSku) {
  const [rows] = await db.query(
    `SELECT id FROM daraz_products WHERE account_id = ? AND seller_sku = ? LIMIT 1`,
    [accountId, sellerSku]
  );
  return rows.length > 0;
}

async function generateUniqueSellerSku({ accountId, baseSku }) {
  if (!(await isSellerSkuTaken(accountId, baseSku))) {
    return baseSku;
  }

  for (const first of SUFFIX_LETTERS) {
    for (const second of SUFFIX_LETTERS) {
      const candidate = `${baseSku}_${first}${second}`;
      if (!(await isSellerSkuTaken(accountId, candidate))) {
        return candidate;
      }
    }
  }

  const error = new Error(`Unable to generate a unique seller SKU for "${baseSku}".`);
  error.statusCode = 409;
  throw error;
}

function resolveImageUrl(url, publicBaseUrl) {
  const clean = String(url || "").trim();
  if (!clean) return "";

  if (/^(https?:\/\/|data:|blob:)/i.test(clean)) return clean;
  if (!publicBaseUrl) return clean;

  return `${publicBaseUrl}${clean.startsWith("/") ? "" : "/"}${clean}`;
}

function resolvePhysicalImagePath(rawPath) {
  const clean = String(rawPath || "").trim();
  if (!clean || /^(https?:\/\/|data:|blob:)/i.test(clean)) return null;

  return path.join(process.cwd(), clean.replace(/^\/+/, ""));
}

function getRawImagePaths(images = []) {
  return (images || [])
    .map((image) => (typeof image === "string" ? image : image?.image_url))
    .filter(Boolean);
}

// Daraz's own CDN must host product images — an external/local URL passed
// straight into product/create is frequently unreachable from Daraz's side
// (e.g. a dev machine behind a firewall), so each raw image is uploaded via
// Daraz's own /image/upload API and the returned hosted URL is used instead.
async function uploadImagesToDaraz({ account, credentials, rawPaths = [], publicBaseUrl, cache = new Map() }) {
  const hostedUrls = [];

  for (const rawPath of rawPaths) {
    if (cache.has(rawPath)) {
      const cached = cache.get(rawPath);
      if (cached) hostedUrls.push(cached);
      continue;
    }

    try {
      const physicalPath = resolvePhysicalImagePath(rawPath);
      if (!physicalPath) throw new Error("Image is not a local file.");

      const fileBuffer = await fs.promises.readFile(physicalPath);
      const fileName = path.basename(physicalPath);

      const result = await darazCatalogApiService.uploadDarazImage({
        account,
        credentials,
        fileBuffer,
        fileName,
      });

      const hostedUrl = result?.data?.data?.image?.url || result?.data?.image?.url || null;

      cache.set(rawPath, hostedUrl);
      if (hostedUrl) hostedUrls.push(hostedUrl);
    } catch (error) {
      console.error("[DARAZ_TRANSFER_IMAGE_UPLOAD_ERROR]", {
        rawPath,
        message: error?.message,
      });

      // Last resort: pass a publicly resolved URL through as-is so the
      // transfer can still proceed rather than shipping zero images.
      const fallback = resolveImageUrl(rawPath, publicBaseUrl);
      cache.set(rawPath, fallback || null);
      if (fallback) hostedUrls.push(fallback);
    }
  }

  return hostedUrls;
}

async function buildSkuRows(product) {
  const productImagePaths = getRawImagePaths(product.images);

  const variants =
    Array.isArray(product.variants) && product.variants.length
      ? product.variants
      : [{ variant_sku: product.sku, images: [], colour_name: null }];

  const rows = await Promise.all(
    variants.map(async (variant) => {
      const sku = variant.variant_sku || product.sku;
      const variantImagePaths = getRawImagePaths(variant.images);

      let price = 0;
      let quantity = 0;

      try {
        const priceRow = await productPriceModel.findBySku(sku);
        price = priceRow?.daraz_price ?? priceRow?.sale_price ?? priceRow?.price ?? 0;
      } catch {
        /* no price record yet */
      }

      try {
        const inventoryRow = await productInventoryModel.findBySku(sku);
        quantity = inventoryRow?.available_qty ?? inventoryRow?.stock_qty ?? 0;
      } catch {
        /* no inventory record yet */
      }

      return {
        baseSku: sku,
        price: Number(price || 0),
        quantity: Number(quantity || 0),
        colourName: variant.colour_name || variant.color_name || "",
        imagePaths: variantImagePaths.length ? variantImagePaths : productImagePaths,
      };
    })
  );

  return { rows, productImagePaths };
}

// Daraz's own category-attributes schema mixes real custom attributes with
// its own standard per-SKU fields (seller SKU, price, quantity, package
// dimensions, sale price/dates) — createDarazProduct already has dedicated
// XML slots for those, so routing them through the generic "attributes" bag
// would either duplicate an existing tag or (for seller_sku/price/quantity,
// which this transfer already controls via the SKU row itself) silently
// conflict with the real value. Map known names to their real slot instead.
const SKU_FIELD_ALIASES = {
  package_weight: "packageWeight",
  package_length: "packageLength",
  package_width: "packageWidth",
  package_height: "packageHeight",
  package_content: "packageContent",
  special_price: "salePrice",
  sale_price: "salePrice",
  special_from_date: "saleStartDate",
  special_to_date: "saleEndDate",
};

const SKU_IGNORED_FIELDS = new Set(["seller_sku", "sellersku", "price", "quantity", "qty"]);

function splitSaleAttributes(saleAttributes = {}) {
  let colorFamily;
  let size;
  const mapped = {};
  const attributes = {};

  Object.entries(saleAttributes || {}).forEach(([rawKey, value]) => {
    if (value === undefined || value === null || value === "") return;

    const key = String(rawKey).toLowerCase();
    if (SKU_IGNORED_FIELDS.has(key)) return;

    if (key === "color_family") colorFamily = value;
    else if (key === "size") size = value;
    else if (SKU_FIELD_ALIASES[key]) mapped[SKU_FIELD_ALIASES[key]] = value;
    else attributes[rawKey] = value;
  });

  return { colorFamily, size, mapped, attributes };
}

// A SKU only gets auto-suffixed (SKU_AA, SKU_AB, ...) because it collided
// with one already used on that account — orders synced back from Daraz will
// carry the suffixed seller_sku, which no longer matches local inventory, so
// the mapping needs to exist immediately rather than waiting on the fuzzy
// suggestion tool to notice it later.
async function recordAutoSkuMapping({ wrongSku, correctSku, updatedBy }) {
  if (wrongSku === correctSku) return;

  try {
    await skuMappingModel.create(
      {
        wrong_sku: wrongSku,
        correct_sku: correctSku,
        platform: "DARAZ",
        notes: "Auto-created from Daraz transfer SKU collision",
      },
      { userId: updatedBy }
    );
  } catch (error) {
    // Most common case: this wrong_sku was already mapped by an earlier
    // transfer/suggestion — not a failure worth surfacing to the transfer.
    console.error("[DARAZ_TRANSFER_AUTO_SKU_MAPPING_ERROR]", { wrongSku, correctSku, message: error?.message });
  }
}

async function transferToOneAccount({
  accountId,
  product,
  skuRows,
  productImagePaths,
  categoryId,
  categoryName,
  title,
  brand,
  model,
  shortDescription,
  attributes,
  skuAttributes,
  publicBaseUrl,
  updatedBy,
}) {
  const { account, credentials } = await tokenService.getValidCredentialsForAccount(accountId);
  const accountName = account?.account_name || account?.account_code || `#${accountId}`;

  // Shared across every image lookup below so each unique local file is
  // uploaded to Daraz's CDN at most once per account, not once per SKU.
  const uploadCache = new Map();

  async function hostedUrlsFor(rawPaths) {
    return uploadImagesToDaraz({ account, credentials, rawPaths, publicBaseUrl, cache: uploadCache });
  }

  const productImages = await hostedUrlsFor(productImagePaths);

  const skuMap = {};

  const skus = await Promise.all(
    skuRows.map(async (row) => {
      const finalSku = await generateUniqueSellerSku({ accountId, baseSku: row.baseSku });
      skuMap[row.baseSku] = finalSku;

      if (finalSku !== row.baseSku) {
        await recordAutoSkuMapping({ wrongSku: finalSku, correctSku: row.baseSku, updatedBy });
      }

      const images = await hostedUrlsFor(row.imagePaths);
      const saleAttrs = (skuAttributes && skuAttributes[row.baseSku]) || {};
      const {
        colorFamily,
        size,
        mapped,
        attributes: extraAttributes,
      } = splitSaleAttributes(saleAttrs);

      return {
        sellerSku: finalSku,
        price: row.price,
        quantity: row.quantity,
        colorFamily: colorFamily || row.colourName || undefined,
        size,
        attributes: extraAttributes,
        images,
        ...mapped,
      };
    })
  );

  const createResult = await darazProductApiService.createDarazProduct({
    account,
    credentials,
    primaryCategory: categoryId,
    name: title || product.product_name || product.title || product.name,
    shortDescription: shortDescription || product.description || "",
    brand: brand || "No Brand",
    model: model || "",
    attributes: attributes || {},
    images: productImages,
    skus,
  });

  const newItemId =
    createResult?.data?.data?.item_id || createResult?.data?.item_id || createResult?.item_id;

  if (newItemId) {
    try {
      await darazProductSyncService.syncSingleDarazProductByItemId({
        account,
        credentials,
        item_id: newItemId,
      });
    } catch (mirrorError) {
      console.error("[DARAZ_TRANSFER_MIRROR_SYNC_ERROR]", {
        item_id: newItemId,
        message: mirrorError?.message,
      });
    }
  }

  return {
    accountId: Number(accountId),
    accountName,
    success: true,
    itemId: newItemId || null,
    skuMap,
  };
}

async function transferLocalProductToDaraz({
  productId,
  accountIds = [],
  categoryId,
  categoryName,
  title,
  brand,
  model,
  shortDescription,
  attributes,
  skuAttributes,
  accountContent,
  updatedBy,
  publicBaseUrl,
}) {
  if (!productId) {
    const error = new Error("productId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(accountIds) || !accountIds.length) {
    const error = new Error("At least one Daraz account must be selected.");
    error.statusCode = 400;
    throw error;
  }

  if (!categoryId) {
    const error = new Error("A Daraz category must be selected.");
    error.statusCode = 400;
    throw error;
  }

  const product = await productModel.findById(productId);

  if (!product) {
    const error = new Error("Local product not found.");
    error.statusCode = 404;
    throw error;
  }

  const { rows: skuRows, productImagePaths } = await buildSkuRows(product);

  const results = [];

  for (const accountId of accountIds) {
    try {
      const override = accountContent && accountContent[accountId];

      const result = await transferToOneAccount({
        accountId,
        product,
        skuRows,
        productImagePaths,
        categoryId,
        categoryName,
        title: override?.title || title,
        brand,
        model,
        shortDescription: override?.shortDescription || shortDescription,
        attributes,
        skuAttributes,
        publicBaseUrl,
        updatedBy,
      });
      results.push(result);

      await safeLogTransfer({
        user_id: updatedBy,
        action: "daraz_transfer_create_product",
        module: "daraz_transfer",
        status: "success",
        message: `Transferred "${product.product_name || product.sku}" (SKU ${product.sku}) to Daraz account ${result.accountName || accountId} — item_id ${result.itemId || "-"}.`,
      });
    } catch (error) {
      // Daraz's own message for /product/create failures is often a bare
      // "E500: Create product failed" with no further detail in `.message` —
      // the real cause (missing mandatory attribute, bad category, etc.) is
      // sometimes only visible in the raw response body, so log and surface
      // that too instead of just the generic top-line message.
      console.error("[DARAZ_TRANSFER_ACCOUNT_ERROR]", {
        accountId,
        message: error?.daraz?.message || error?.message,
        code: error?.daraz?.code || null,
        type: error?.daraz?.type || null,
        raw: error?.daraz?.raw || null,
      });

      await safeLogTransfer({
        user_id: updatedBy,
        action: "daraz_transfer_create_product",
        module: "daraz_transfer",
        status: "failed",
        message: `Failed to transfer "${product.product_name || product.sku}" (SKU ${product.sku}) to Daraz account ${accountId}: ${
          error?.daraz?.message || error?.message || "Transfer failed."
        }${error?.daraz?.raw ? ` | raw: ${JSON.stringify(error.daraz.raw)}` : ""}`,
      });

      results.push({
        accountId: Number(accountId),
        accountName: null,
        success: false,
        error: error?.daraz?.message || error?.message || "Transfer failed.",
        errorDetail: error?.daraz?.raw || null,
      });
    }
  }

  try {
    await productModel.updateById(
      productId,
      {
        daraz_category_id: categoryId,
        daraz_category_name: categoryName || null,
        daraz_brand: brand || null,
        daraz_attributes_json: JSON.stringify(attributes || {}),
      },
      { userId: updatedBy }
    );
  } catch (error) {
    console.error("[DARAZ_TRANSFER_SAVE_ATTRIBUTES_ERROR]", error?.message);
  }

  return { results };
}

// ---------------------------------------------------------------------
// Daraz account -> Daraz account clone
//
// The existing transfer above only ever sources from this app's own local
// product catalog. Some Daraz listings (e.g. everything on BrightHub_Daraz)
// were never pushed from here - they were pulled DOWN by the regular
// product sync into daraz_products, with no local_product_id at all. This
// path sources from that pulled-down snapshot instead, recreating an
// equivalent listing on a different Daraz seller account from the data
// Daraz already gave us (category, attributes, images, per-SKU pricing) -
// no local catalog involvement, and no changes to the source listing.
// ---------------------------------------------------------------------

// Fields on a synced skus_json entry that describe the listing itself
// (Daraz's own SkuId, its live status, current stock/price, image list,
// storefront URL) rather than a real product attribute - everything else
// on the object is a genuine sale attribute (color_family, size, package_*,
// or a category-specific custom field) and must pass through untouched.
const SKU_META_KEYS = new Set([
  "skuid",
  "url",
  "price",
  "images",
  "status",
  "shopsku",
  "quantity",
  "saleprop",
  "available",
  "sellersku",
  "channelinventories",
  "fblwarehouseinventories",
  "multiwarehouseinventories",
]);

function extractSkuSaleAttributes(rawSku = {}) {
  const result = {};

  Object.entries(rawSku).forEach(([key, value]) => {
    if (SKU_META_KEYS.has(String(key).toLowerCase())) return;
    result[key] = value;
  });

  return result;
}

// Counterpart to uploadImagesToDaraz above, which only handles local disk
// files - these images already live on Daraz's own CDN (static-01.daraz.lk),
// just uploaded under a different seller account, so each one is fetched
// over HTTPS first rather than read off this server's filesystem.
async function uploadRemoteImagesToDaraz({ account, credentials, urls = [], cache = new Map() }) {
  const hostedUrls = [];

  for (const url of urls) {
    if (!url) continue;

    if (cache.has(url)) {
      const cached = cache.get(url);
      if (cached) hostedUrls.push(cached);
      continue;
    }

    try {
      const response = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      const fileBuffer = Buffer.from(response.data);
      const fileName = path.basename(new URL(url).pathname) || "image.jpg";

      const result = await darazCatalogApiService.uploadDarazImage({
        account,
        credentials,
        fileBuffer,
        fileName,
      });

      const hostedUrl = result?.data?.data?.image?.url || result?.data?.image?.url || null;

      cache.set(url, hostedUrl);
      if (hostedUrl) hostedUrls.push(hostedUrl);
    } catch (error) {
      console.error("[DARAZ_CLONE_IMAGE_UPLOAD_ERROR]", { url, message: error?.message });

      // Last resort: Daraz's own CDN URLs are typically usable by any
      // listing regardless of which account originally uploaded them, so
      // fall back to passing the original URL through rather than
      // shipping the product with zero images.
      cache.set(url, url);
      hostedUrls.push(url);
    }
  }

  return hostedUrls;
}

async function getDarazProductById(id) {
  const [rows] = await db.query(`SELECT * FROM daraz_products WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function listDarazProductsForAccount(accountId, { limit, offset = 0 } = {}) {
  const params = [accountId];
  let sql = `SELECT * FROM daraz_products WHERE account_id = ? ORDER BY id ASC`;

  if (limit) {
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
  }

  const [rows] = await db.query(sql, params);
  return rows;
}

async function countDarazProductsForAccount(accountId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM daraz_products WHERE account_id = ?`,
    [accountId]
  );
  return Number(rows[0]?.total || 0);
}

function parseJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function cloneOneDarazProduct({ sourceProduct, targetAccountId, updatedBy }) {
  const { account, credentials } = await tokenService.getValidCredentialsForAccount(targetAccountId);
  const accountName = account?.account_name || account?.account_code || `#${targetAccountId}`;

  const attrs = parseJsonColumn(sourceProduct.attributes_json, {});
  const productImageUrls = parseJsonColumn(sourceProduct.images_json, []);
  const rawSkus = parseJsonColumn(sourceProduct.skus_json, []);

  if (!rawSkus.length) {
    const error = new Error("Source listing has no SKUs to clone.");
    error.statusCode = 422;
    throw error;
  }

  const uploadCache = new Map();

  const productImages = await uploadRemoteImagesToDaraz({
    account,
    credentials,
    urls: productImageUrls,
    cache: uploadCache,
  });

  const skuMap = {};

  const skus = await Promise.all(
    rawSkus.map(async (rawSku) => {
      const baseSku = rawSku.SellerSku || rawSku.ShopSku || rawSku.sellerSku;
      const finalSku = await generateUniqueSellerSku({ accountId: targetAccountId, baseSku });
      skuMap[baseSku] = finalSku;

      if (finalSku !== baseSku) {
        await recordAutoSkuMapping({ wrongSku: finalSku, correctSku: baseSku, updatedBy });
      }

      const images = await uploadRemoteImagesToDaraz({
        account,
        credentials,
        urls: rawSku.Images || rawSku.images || [],
        cache: uploadCache,
      });

      const {
        colorFamily,
        size,
        mapped,
        attributes: extraAttributes,
      } = splitSaleAttributes(extractSkuSaleAttributes(rawSku));

      return {
        sellerSku: finalSku,
        price: Number(rawSku.price ?? 0),
        quantity: Number(rawSku.quantity ?? 0),
        colorFamily,
        size,
        attributes: extraAttributes,
        images,
        ...mapped,
      };
    })
  );

  const createResult = await darazProductApiService.createDarazProduct({
    account,
    credentials,
    primaryCategory: sourceProduct.primary_category,
    name: sourceProduct.name || attrs.name,
    shortDescription: attrs.short_description || sourceProduct.short_description || "",
    brand: sourceProduct.brand || attrs.brand || "No Brand",
    model: attrs.model || "",
    attributes: attrs,
    images: productImages,
    skus,
  });

  const newItemId =
    createResult?.data?.data?.item_id || createResult?.data?.item_id || createResult?.item_id;

  if (newItemId) {
    try {
      await darazProductSyncService.syncSingleDarazProductByItemId({
        account,
        credentials,
        item_id: newItemId,
      });
    } catch (mirrorError) {
      console.error("[DARAZ_CLONE_MIRROR_SYNC_ERROR]", {
        item_id: newItemId,
        message: mirrorError?.message,
      });
    }
  }

  return {
    sourceProductId: sourceProduct.id,
    sourceName: sourceProduct.name,
    accountId: Number(targetAccountId),
    accountName,
    success: true,
    itemId: newItemId || null,
    skuMap,
  };
}

// Runs across a slice of one account's synced Daraz listings (limit/offset,
// so a caller can run a small test batch before committing to the rest).
// Every product is processed independently - one failure never stops the
// batch, matching transferLocalProductToDaraz's per-item error isolation.
async function cloneDarazAccountProducts({
  sourceAccountId,
  targetAccountId,
  limit = null,
  offset = 0,
  updatedBy,
}) {
  if (!sourceAccountId || !targetAccountId) {
    const error = new Error("sourceAccountId and targetAccountId are required.");
    error.statusCode = 400;
    throw error;
  }

  if (Number(sourceAccountId) === Number(targetAccountId)) {
    const error = new Error("Source and target account must be different.");
    error.statusCode = 400;
    throw error;
  }

  const sourceProducts = await listDarazProductsForAccount(sourceAccountId, { limit, offset });
  const totalInAccount = await countDarazProductsForAccount(sourceAccountId);

  const results = [];

  for (const sourceProduct of sourceProducts) {
    try {
      const result = await cloneOneDarazProduct({ sourceProduct, targetAccountId, updatedBy });
      results.push(result);

      await safeLogTransfer({
        user_id: updatedBy,
        action: "daraz_clone_account_product",
        module: "daraz_transfer",
        status: "success",
        message: `Cloned "${sourceProduct.name}" from account ${sourceAccountId} to ${result.accountName} — item_id ${result.itemId || "-"}.`,
      });
    } catch (error) {
      console.error("[DARAZ_CLONE_PRODUCT_ERROR]", {
        sourceProductId: sourceProduct.id,
        message: error?.daraz?.message || error?.message,
        raw: error?.daraz?.raw || null,
      });

      await safeLogTransfer({
        user_id: updatedBy,
        action: "daraz_clone_account_product",
        module: "daraz_transfer",
        status: "failed",
        message: `Failed to clone "${sourceProduct.name}" (source id ${sourceProduct.id}) to account ${targetAccountId}: ${
          error?.daraz?.message || error?.message || "Clone failed."
        }`,
      });

      results.push({
        sourceProductId: sourceProduct.id,
        sourceName: sourceProduct.name,
        accountId: Number(targetAccountId),
        success: false,
        error: error?.daraz?.message || error?.message || "Clone failed.",
      });
    }
  }

  return {
    total_in_source_account: totalInAccount,
    processed: results.length,
    succeeded: results.filter((row) => row.success).length,
    failed: results.filter((row) => !row.success).length,
    results,
  };
}

module.exports = {
  generateUniqueSellerSku,
  transferLocalProductToDaraz,
  cloneDarazAccountProducts,
  getDarazProductById,
  countDarazProductsForAccount,
};
