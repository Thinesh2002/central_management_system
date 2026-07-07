const fs = require("fs");
const path = require("path");
const db = require("../../../config/product_management_db/product_management_db");
const productModel = require("../../../models/product_management/product/product_model");
const productPriceModel = require("../../../models/product_management/product/product_price_model.js");
const productInventoryModel = require("../../../models/product_management/product/product_inventory_model.js");
const tokenService = require("../../marketplace/token_service");
const darazProductApiService = require("../../marketplace/daraz_product_api_service");
const darazCatalogApiService = require("../../marketplace/daraz_catalog_api_service");
const darazProductSyncService = require("./daraz_product_sync_service");

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

async function transferToOneAccount({
  accountId,
  product,
  skuRows,
  productImagePaths,
  categoryId,
  categoryName,
  brand,
  model,
  shortDescription,
  attributes,
  skuAttributes,
  publicBaseUrl,
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
    name: product.product_name || product.title || product.name,
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
  brand,
  model,
  shortDescription,
  attributes,
  skuAttributes,
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
      const result = await transferToOneAccount({
        accountId,
        product,
        skuRows,
        productImagePaths,
        categoryId,
        categoryName,
        brand,
        model,
        shortDescription,
        attributes,
        skuAttributes,
        publicBaseUrl,
      });
      results.push(result);
    } catch (error) {
      results.push({
        accountId: Number(accountId),
        accountName: null,
        success: false,
        error: error?.daraz?.message || error?.message || "Transfer failed.",
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

module.exports = {
  generateUniqueSellerSku,
  transferLocalProductToDaraz,
};
