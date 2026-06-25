import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { productImageApi } from "../../../../../config/sub_api/product_management_api/product/product image_api";

import { imageFromProduct, skuFromProduct } from "../utils/orderFrontendHelpers";
import { keyValue, normalizeList, pick } from "../utils/commonManualOrderUtils";
import { getOrderSku } from "../utils/orderSelectors";

function getChildren(product = {}) {
  const children = [];

  [
    product.children,
    product.variants,
    product.variations,
    product.child_products,
    product.childProducts,
    product.product_variants,
    product.productVariants,
    product.variant_products,
    product.variantProducts,
  ].forEach((list) => {
    if (!Array.isArray(list)) return;

    list.forEach((item) => {
      if (item && typeof item === "object") children.push(item);
    });
  });

  return children;
}

function mergeChildWithParent(child = {}, parent = {}) {
  const parentSku = pick(
    parent.sku,
    parent.product_sku,
    parent.productSku,
    parent.parent_sku,
    parent.product_code
  );

  return {
    ...parent,
    ...child,
    _row_type: "CHILD",
    parent_id: pick(child.parent_id, child.parent_product_id, parent.id, parent.product_id),
    parent_product_id: pick(child.parent_product_id, child.parent_id, parent.id, parent.product_id),
    parent_sku: pick(child.parent_sku, child.parentSku, parentSku),
    product_id: pick(child.product_id, parent.id, parent.product_id),
    variant_id: pick(child.variant_id, child.product_variant_id, child.id),
    sku: pick(
      child.sku,
      child.SKU,
      child.variant_sku,
      child.variantSku,
      child.product_sku,
      child.productSku,
      child.child_sku,
      child.childSku
    ),
    product_name: pick(
      child.product_name,
      child.productName,
      child.product_title,
      child.productTitle,
      child.title,
      child.name,
      parent.product_name,
      parent.productName,
      parent.product_title,
      parent.productTitle,
      parent.title,
      parent.name
    ),
  };
}

function buildSearchableProducts(list = []) {
  const products = [];

  list.forEach((product) => {
    if (!product || typeof product !== "object") return;

    const children = getChildren(product);

    if (children.length) {
      children.forEach((child) => products.push(mergeChildWithParent(child, product)));
      return;
    }

    products.push(product);
  });

  return products;
}

function productSkuValues(product = {}) {
  return [
    skuFromProduct(product),
    product.sku,
    product.SKU,
    product.product_sku,
    product.productSku,
    product.variant_sku,
    product.variantSku,
    product.child_sku,
    product.childSku,
    product.local_sku,
    product.localSku,
    product.model_sku,
    product.modelSku,
  ]
    .map(keyValue)
    .filter(Boolean);
}

function findProductBySku(products = [], sku = "") {
  const targetSku = keyValue(sku);
  if (!targetSku) return null;

  const exact = products.find((product) =>
    productSkuValues(product).includes(targetSku)
  );

  if (exact) return exact;

  return (
    products.find((product) =>
      productSkuValues(product).some((value) => value.includes(targetSku))
    ) || null
  );
}

function isChildProduct(product = {}) {
  return (
    product._row_type === "CHILD" ||
    product.parent_id ||
    product.parent_product_id ||
    product.parent_sku
  );
}

function getProductIdValues(product = {}) {
  const isChild = isChildProduct(product);

  return [
    product.product_id,
    product.local_product_id,
    product.parent_product_id,
    product.parent_id,
    isChild ? "" : product.id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function getVariantIdValues(product = {}) {
  const isChild = isChildProduct(product);

  return [
    product.variant_id,
    product.product_variant_id,
    product.variation_id,
    isChild ? product.id : "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function productImageSkuValues(image = {}) {
  return [
    image.sku,
    image.SKU,
    image.product_sku,
    image.productSku,
    image.variant_sku,
    image.variantSku,
    image.child_sku,
    image.childSku,
    image.local_sku,
    image.localSku,
    image.model_sku,
    image.modelSku,
  ]
    .map(keyValue)
    .filter(Boolean);
}

function productImageProductIdValues(image = {}) {
  return [
    image.product_id,
    image.local_product_id,
    image.parent_product_id,
    image.parent_id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function productImageVariantIdValues(image = {}) {
  return [
    image.variant_id,
    image.product_variant_id,
    image.variation_id,
    image.child_id,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function imageFromProductImageRow(image = {}) {
  return pick(
    image.full_url,
    image.fullUrl,
    image.image_url,
    image.imageUrl,
    image.product_image_url,
    image.productImageUrl,
    image.main_image,
    image.mainImage,
    image.thumbnail_url,
    image.thumbnailUrl,
    image.thumbnail,
    image.product_image,
    image.productImage,
    image.image,
    image.url,
    image.src,
    image.path,
    image.file_path,
    image.filePath,
    image.image_path,
    image.imagePath
  );
}

function sortProductImages(images = []) {
  return [...images].sort((a, b) => {
    const mainDiff = Number(b?.is_main || 0) - Number(a?.is_main || 0);
    if (mainDiff !== 0) return mainDiff;

    return Number(a?.sort_order || 9999) - Number(b?.sort_order || 9999);
  });
}

function uniqueImages(images = []) {
  const seen = new Set();

  return images.filter((image, index) => {
    if (!image || typeof image !== "object") return false;

    const key = String(
      image.id ||
        image.image_id ||
        image.product_image_id ||
        image.file_path ||
        image.image_url ||
        image.url ||
        `image-${index}`
    );

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function findBestProductImage(images = [], sku = "", product = {}) {
  const targetSku = keyValue(sku);
  const productIds = getProductIdValues(product);
  const variantIds = getVariantIdValues(product);

  const validImages = sortProductImages(
    images.filter((image) => image && typeof image === "object")
  );

  if (!validImages.length) return null;

  return (
    validImages.find((image) => productImageSkuValues(image).includes(targetSku)) ||
    validImages.find((image) =>
      productImageVariantIdValues(image).some((id) => variantIds.includes(id))
    ) ||
    validImages.find((image) =>
      productImageProductIdValues(image).some((id) => productIds.includes(id))
    ) ||
    (validImages.length === 1 ? validImages[0] : null)
  );
}

async function fetchLocalProducts(params = {}) {
  const names = [
    "getProducts",
    "getLocalProducts",
    "getAllProducts",
    "listProducts",
    "list",
    "getAll",
    "get",
  ];

  for (const name of names) {
    if (typeof localProductsApi?.[name] === "function") {
      const response = await localProductsApi[name](params);
      return normalizeList(response);
    }
  }

  return [];
}

async function fetchProductImages(params = {}) {
  const names = ["getAll", "getImages", "getProductImages", "list", "get"];

  for (const name of names) {
    if (typeof productImageApi?.[name] === "function") {
      const response = await productImageApi[name](params);
      return normalizeList(response);
    }
  }

  return [];
}

function buildProductImageQueries(sku = "", product = {}) {
  const queries = [{ search: sku, sku, page: 1, limit: 50 }];

  getProductIdValues(product).forEach((productId) => {
    queries.push({
      product_id: productId,
      local_product_id: productId,
      parent_product_id: productId,
      page: 1,
      limit: 50,
    });
  });

  getVariantIdValues(product).forEach((variantId) => {
    queries.push({
      variant_id: variantId,
      product_variant_id: variantId,
      child_id: variantId,
      page: 1,
      limit: 50,
    });
  });

  return queries;
}

async function findProductManagementDataBySku(sku = "") {
  const cleanSku = String(sku || "").trim();

  if (!cleanSku || cleanSku === "-") return null;

  const productParams = {
    search: cleanSku,
    keyword: cleanSku,
    q: cleanSku,
    sku: cleanSku,
    page: 1,
    limit: 100,
  };

  const localProductRows = await fetchLocalProducts(productParams).catch(() => []);
  const searchableProducts = buildSearchableProducts(localProductRows);
  const matchedProduct = findProductBySku(searchableProducts, cleanSku);

  const allImages = [];

  for (const query of buildProductImageQueries(cleanSku, matchedProduct || {})) {
    const rows = await fetchProductImages(query).catch(() => []);
    allImages.push(...rows);
  }

  const matchedImage = findBestProductImage(
    uniqueImages(allImages),
    cleanSku,
    matchedProduct || {}
  );

  const productImageUrl = matchedImage
    ? imageFromProductImageRow(matchedImage)
    : "";

  const fallbackProductImage = matchedProduct
    ? imageFromProduct(matchedProduct)
    : "";

  return {
    product: matchedProduct || null,
    image: matchedImage || null,
    image_url: pick(productImageUrl, fallbackProductImage),
  };
}

export async function loadProductMapForOrders(orders = []) {
  const skus = Array.from(
    new Set(
      orders
        .map(getOrderSku)
        .map((sku) => String(sku || "").trim())
        .filter((sku) => sku && sku !== "-")
    )
  );

  const entries = await Promise.all(
    skus.map(async (sku) => {
      const data = await findProductManagementDataBySku(sku).catch(() => null);
      return [keyValue(sku), data];
    })
  );

  return Object.fromEntries(entries.filter(([skuKey, data]) => skuKey && data));
}
