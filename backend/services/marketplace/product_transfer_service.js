const productModel = require('../../models/product_management/product/product_model');
const accountModel = require('../../models/marketplace/account_model');
const credentialModel = require('../../models/marketplace/credential_model');
const skuMappingModel = require('../../models/marketplace/sku_mapping_model');
const transferLogModel = require('../../models/marketplace/transfer_log_model');
const { callDarazApi } = require('./daraz_api_service');
const wooApi = require('./woo/woo_api_service');
const { resolveMarketplaceSku } = require('./sku_duplicate_service');

function clean(value) {
  return String(value ?? '').trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || null;
}

function getProductSku(product = {}) {
  return clean(product.sku || product.product_sku || product.local_sku || product.parent_sku || product.main_sku || `PRODUCT-${getProductId(product) || Date.now()}`);
}

function getVariantSku(variant = {}, fallback = '') {
  return clean(variant.sku || variant.variant_sku || variant.product_sku || variant.local_sku || fallback);
}

function getTitle(product = {}) {
  return clean(product.title || product.product_title || product.name || product.product_name || 'Local Product');
}

function getDescription(product = {}) {
  return clean(product.description || product.product_description || product.short_description || product.details || '');
}

function getPrice(row = {}, product = {}) {
  return String(number(row.daraz_price ?? row.woo_price ?? row.selling_price ?? row.sale_price ?? row.regular_price ?? row.price ?? product.selling_price ?? product.sale_price ?? product.price, 0));
}

function getStock(row = {}, product = {}) {
  return number(row.stock_qty ?? row.quantity ?? row.stock_quantity ?? row.available_qty ?? product.stock_qty ?? product.quantity ?? product.stock_quantity, 0);
}

function getImageUrls(product = {}, variant = null) {
  const rows = [
    ...(asArray(variant?.images)),
    ...(asArray(variant?.sub_images)),
    ...(variant?.main_image_url ? [variant.main_image_url] : []),
    ...(asArray(product.images)),
    ...(asArray(product.sub_images)),
    ...(product.main_image_url ? [product.main_image_url] : []),
  ];

  return rows.map((image) => clean(image?.image_url || image?.url || image?.src || image)).filter(Boolean);
}

function selectedVariants(product = {}, variantIds = []) {
  const all = asArray(product.variants || product.product_variants || product.variations);
  const selected = new Set(asArray(variantIds).map((id) => String(id)));
  if (!all.length) return [];
  if (!selected.size) return all;
  return all.filter((variant) => selected.has(String(variant.id || variant.variant_id || variant.local_variant_id || getVariantSku(variant))));
}

function buildDarazSkuPayload({ product, variant, marketplaceSku, attributes = {} }) {
  return {
    SellerSku: marketplaceSku,
    quantity: getStock(variant || product, product),
    price: getPrice(variant || product, product),
    package_length: attributes.package_length || attributes.length || '10',
    package_width: attributes.package_width || attributes.width || '10',
    package_height: attributes.package_height || attributes.height || '10',
    package_weight: attributes.package_weight || attributes.weight || '0.5',
    color_family: attributes.color_family || variant?.color || variant?.colour || attributes.color || undefined,
    size: attributes.size || variant?.size || undefined,
    Images: getImageUrls(product, variant),
  };
}

function buildDarazPayload({ product, categoryId, attributes = {}, variants = [], skuRows = [], rawPayload = null }) {
  if (rawPayload && typeof rawPayload === 'object' && Object.keys(rawPayload).length) return rawPayload;

  const payload = {
    PrimaryCategory: categoryId || attributes.PrimaryCategory || attributes.primary_category,
    SPUId: attributes.SPUId || attributes.spu_id || undefined,
    AssociatedSku: attributes.AssociatedSku || undefined,
    Attributes: {
      name: attributes.name || getTitle(product),
      short_description: attributes.short_description || getDescription(product),
      brand: attributes.brand || product.brand || 'No Brand',
      ...attributes,
    },
    Skus: skuRows,
  };

  if (!variants.length && !skuRows.length) {
    payload.Skus = [buildDarazSkuPayload({ product, variant: null, marketplaceSku: getProductSku(product), attributes })];
  }

  return payload;
}

function buildWooPayload({ product, categoryId, productType, attributes = [], variants = [], skuRows = [], rawPayload = null }) {
  if (rawPayload && typeof rawPayload === 'object' && Object.keys(rawPayload).length) return rawPayload;

  const images = getImageUrls(product).map((src) => ({ src }));
  const categories = categoryId ? [{ id: Number(categoryId) }] : [];
  const type = productType || (variants.length ? 'variable' : 'simple');

  return {
    name: getTitle(product),
    type,
    status: product.status || 'draft',
    sku: !variants.length ? getProductSku(product) : undefined,
    regular_price: !variants.length ? getPrice(product, product) : undefined,
    manage_stock: !variants.length,
    stock_quantity: !variants.length ? getStock(product, product) : undefined,
    description: getDescription(product),
    short_description: clean(product.short_description || product.summary || ''),
    categories,
    images,
    attributes,
    variations_payload: skuRows,
  };
}

async function getAccount(accountId, platform) {
  const account = await accountModel.getAccountById(accountId);
  if (!account) throw new Error('Marketplace account not found.');
  const code = clean(account.platform_code || account.platform).toUpperCase();
  const allowed = platform === 'WOO' ? ['WOO', 'WOOCOMMERCE', 'WOO_COMMERCE'] : [platform];
  if (platform && !allowed.includes(code)) throw new Error(`Selected account is not ${platform}.`);
  return account;
}

async function createMapping({ platform, account, product, variant, marketplaceSku, marketplaceItemId, marketplaceProductId, skuId }) {
  const localSku = getVariantSku(variant, getProductSku(product));
  return skuMappingModel.upsert({
    platform,
    account_id: account.id || account.account_id,
    account_code: account.account_code,
    local_product_id: getProductId(product),
    local_variant_id: variant?.id || variant?.variant_id || null,
    local_sku: localSku,
    marketplace_sku: marketplaceSku,
    marketplace_item_id: marketplaceItemId || skuId || null,
    marketplace_product_id: marketplaceProductId || marketplaceItemId || null,
    status: 'ACTIVE',
  });
}

async function transferLocalToDaraz({ productId, payload = {}, userId = null }) {
  const product = await productModel.findById(productId);
  if (!product) throw new Error('Local product not found.');

  const accountIds = asArray(payload.account_ids || payload.account_id).filter(Boolean);
  if (!accountIds.length) throw new Error('At least one Daraz account is required.');

  const variants = selectedVariants(product, payload.variant_ids);
  const rows = variants.length ? variants : [null];
  const results = [];

  for (const accountId of accountIds) {
    const account = await getAccount(accountId, 'DARAZ');
    const credentials = await credentialModel.findByAccountId(account.id);
    if (!credentials?.access_token) throw new Error(`Daraz access token missing for ${account.account_code || account.id}.`);

    const skuRows = [];
    for (const variant of rows) {
      const localSku = getVariantSku(variant, getProductSku(product));
      const resolved = await resolveMarketplaceSku({
        platform: 'DARAZ',
        account,
        baseSku: localSku,
        method: payload.duplicate_method || payload.sku_duplicate_method,
        customSuffix: payload.custom_suffix,
      });

      if (resolved.duplicate && clean(payload.duplicate_action || 'create_duplicate') === 'skip') continue;

      skuRows.push(buildDarazSkuPayload({
        product,
        variant,
        marketplaceSku: resolved.sku,
        attributes: payload.attributes || {},
      }));
    }

    const requestPayload = buildDarazPayload({
      product,
      categoryId: payload.category_id,
      attributes: payload.attributes || {},
      variants,
      skuRows,
      rawPayload: payload.raw_payload,
    });

    const apiPath = payload.item_id ? (process.env.DARAZ_PRODUCT_UPDATE_ENDPOINT || '/product/update') : (process.env.DARAZ_PRODUCT_CREATE_ENDPOINT || '/product/create');
    const response = await callDarazApi({
      account,
      credentials,
      apiPath,
      method: 'POST',
      requestType: payload.item_id ? 'daraz_product_update' : 'daraz_product_create',
      body: requestPayload,
    });

    const data = response?.data?.data || response?.data?.result || response?.data || {};
    const itemId = payload.item_id || data.item_id || data.ItemId || data.itemId || data.product_id || data.ProductId || null;

    for (const sku of skuRows) {
      await createMapping({
        platform: 'DARAZ',
        account,
        product,
        variant: rows.find((row) => getVariantSku(row, getProductSku(product)) && sku.SellerSku?.startsWith(getVariantSku(row, getProductSku(product)))) || null,
        marketplaceSku: sku.SellerSku,
        marketplaceItemId: itemId,
        marketplaceProductId: itemId,
        skuId: sku.sku_id || sku.SkuId || null,
      });
    }

    await transferLogModel.create({
      platform: 'DARAZ',
      account_id: account.id,
      account_code: account.account_code,
      local_product_id: getProductId(product),
      local_sku: getProductSku(product),
      marketplace_sku: skuRows.map((sku) => sku.SellerSku).join(','),
      action_type: payload.item_id ? 'UPDATE' : 'TRANSFER',
      status: 'SUCCESS',
      message: 'Local product transferred to Daraz.',
      request_payload: requestPayload,
      response_payload: response,
      created_by: userId,
    });

    results.push({ account_id: account.id, account_code: account.account_code, item_id: itemId, sku_count: skuRows.length, response });
  }

  return { product_id: productId, results };
}

async function transferLocalToWoo({ productId, payload = {}, userId = null }) {
  const product = await productModel.findById(productId);
  if (!product) throw new Error('Local product not found.');

  const accountIds = asArray(payload.account_ids || payload.account_id).filter(Boolean);
  if (!accountIds.length) throw new Error('At least one Woo account is required.');

  const variants = selectedVariants(product, payload.variant_ids);
  const rows = variants.length ? variants : [null];
  const results = [];

  for (const accountId of accountIds) {
    const account = await getAccount(accountId, 'WOO');
    const wooCredentials = await require('../../models/marketplace/woo/woo_model').getWooCredentials(account.id);

    const skuRows = [];
    for (const variant of rows) {
      const localSku = getVariantSku(variant, getProductSku(product));
      const resolved = await resolveMarketplaceSku({
        platform: 'WOO',
        account,
        baseSku: localSku,
        method: payload.duplicate_method || payload.sku_duplicate_method,
        customSuffix: payload.custom_suffix,
      });
      if (resolved.duplicate && clean(payload.duplicate_action || 'create_duplicate') === 'skip') continue;
      skuRows.push({
        sku: resolved.sku,
        regular_price: getPrice(variant || product, product),
        manage_stock: true,
        stock_quantity: getStock(variant || product, product),
        image: getImageUrls(product, variant)[0] ? { src: getImageUrls(product, variant)[0] } : undefined,
        attributes: [
          variant?.color || variant?.colour ? { name: 'Color', option: variant.color || variant.colour } : null,
          variant?.size ? { name: 'Size', option: variant.size } : null,
        ].filter(Boolean),
        local_variant_id: variant?.id || variant?.variant_id || null,
        local_sku: localSku,
      });
    }

    const requestPayload = buildWooPayload({
      product,
      categoryId: payload.category_id,
      productType: payload.product_type,
      attributes: payload.attributes || [],
      variants,
      skuRows,
      rawPayload: payload.raw_payload,
    });

    const createResult = payload.woo_product_id
      ? await wooApi.updateProduct(wooCredentials, payload.woo_product_id, requestPayload)
      : await wooApi.createProduct(wooCredentials, requestPayload);

    const wooProduct = createResult.data || createResult;
    const wooProductId = wooProduct.id || payload.woo_product_id;

    if ((requestPayload.type || payload.product_type) === 'variable') {
      for (const row of skuRows) {
        const variationPayload = {
          regular_price: row.regular_price,
          sku: row.sku,
          manage_stock: true,
          stock_quantity: row.stock_quantity,
          image: row.image,
          attributes: row.attributes,
        };
        const variation = await wooApi.createVariation(wooCredentials, wooProductId, variationPayload);
        const variationData = variation.data || variation;
        await createMapping({
          platform: 'WOO',
          account,
          product,
          variant: variants.find((item) => String(item.id || item.variant_id || '') === String(row.local_variant_id)) || null,
          marketplaceSku: row.sku,
          marketplaceItemId: variationData.id,
          marketplaceProductId: wooProductId,
        });
      }
    } else if (skuRows[0]) {
      await createMapping({
        platform: 'WOO',
        account,
        product,
        variant: null,
        marketplaceSku: skuRows[0].sku,
        marketplaceItemId: wooProductId,
        marketplaceProductId: wooProductId,
      });
    }

    await transferLogModel.create({
      platform: 'WOO',
      account_id: account.id,
      account_code: account.account_code,
      local_product_id: getProductId(product),
      local_sku: getProductSku(product),
      marketplace_sku: skuRows.map((sku) => sku.sku).join(','),
      action_type: payload.woo_product_id ? 'UPDATE' : 'TRANSFER',
      status: 'SUCCESS',
      message: 'Local product transferred to WooCommerce.',
      request_payload: requestPayload,
      response_payload: wooProduct,
      created_by: userId,
    });

    results.push({ account_id: account.id, account_code: account.account_code, woo_product_id: wooProductId, sku_count: skuRows.length, response: wooProduct });
  }

  return { product_id: productId, results };
}

module.exports = {
  buildDarazPayload,
  buildWooPayload,
  transferLocalToDaraz,
  transferLocalToWoo,
};
