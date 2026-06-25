import { normalizeArray } from "./localProductsImageHelpers";
import { getMainImageFromRows, getProductImageRows } from "./localProductsImageHelpers";

export function normalizeProductList(response) {
  const parsed = response?.data ?? response;

  if (Array.isArray(parsed)) return parsed;

  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.products)) return parsed.products;
  if (Array.isArray(parsed?.rows)) return parsed.rows;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.result)) return parsed.result;

  if (Array.isArray(parsed?.data?.products)) return parsed.data.products;
  if (Array.isArray(parsed?.data?.rows)) return parsed.data.rows;
  if (Array.isArray(parsed?.data?.items)) return parsed.data.items;
  if (Array.isArray(parsed?.data?.result)) return parsed.data.result;

  if (Array.isArray(parsed?.result?.products)) return parsed.result.products;
  if (Array.isArray(parsed?.result?.rows)) return parsed.result.rows;
  if (Array.isArray(parsed?.result?.items)) return parsed.result.items;

  return [];
}

export function getProductVariants(product = {}) {
  const variantSources = [
    product.variants,
    product.variant,
    product.variation,
    product.variations,
    product.product_variants,
    product.productVariants,
    product.variant_list,
    product.variantList,
    product.skus,
    product.sku_list,
    product.skuList,
    product.sku_variants,
    product.skuVariants,
    product.children,
    product.items,
    product.options,
  ];

  for (const source of variantSources) {
    const list = normalizeArray(source).filter(
      (item) => item && typeof item === "object"
    );

    if (list.length) return list;
  }

  return [];
}

export function hasProductVariants(product = {}) {
  const variants = getProductVariants(product);

  const variantCount = Number(
    product.variant_count ??
      product.variants_count ??
      product.sku_count ??
      product.variation_count ??
      product.variations_count ??
      product.option_count ??
      0
  );

  const hasVariantValue = Number(
    product.has_variants ?? product.has_variant ?? product.is_variable ?? 0
  );

  const typeText = String(
    product.product_type ||
      product.type ||
      product.product_kind ||
      product.variant_type ||
      ""
  ).toLowerCase();

  return (
    variants.length > 0 ||
    variantCount > 0 ||
    hasVariantValue === 1 ||
    typeText.includes("variant") ||
    typeText.includes("variation") ||
    typeText.includes("variable") ||
    typeText.includes("multiple")
  );
}

export function formatPrice(record = {}) {
  const currency = record.currency || "LKR";

  const price =
    record.main_price ??
    record.sale_price ??
    record.price ??
    record.regular_price ??
    record.variant_price ??
    record.selling_price ??
    "0.00";

  return `${currency} ${price}`;
}

export function getVariantName(variant = {}) {
  return (
    variant.variant_name ||
    variant.name ||
    variant.title ||
    variant.colour_name ||
    variant.color_name ||
    variant.colour ||
    variant.color ||
    variant.size ||
    variant.option_name ||
    "Variant"
  );
}

export function getVariantSku(variant = {}) {
  return (
    variant.sku ||
    variant.seller_sku ||
    variant.variant_sku ||
    variant.local_sku ||
    "-"
  );
}

export function getVariantId(variant = {}) {
  return (
    variant.id ||
    variant.variant_id ||
    variant.product_variant_id ||
    variant.local_variant_id ||
    variant.sku_id ||
    ""
  );
}

export function getStockValue(record = {}) {
  return (
    record.stock_qty ??
    record.quantity ??
    record.qty ??
    record.stock ??
    record.available_stock ??
    "-"
  );
}

export function getProductStatus(product = {}) {
  const rawStatus = String(
    product.status ??
      product.active_status ??
      product.product_status ??
      product.is_active ??
      product.enabled ??
      "current"
  ).toLowerCase();

  if (["0", "false", "inactive", "disabled", "deleted", "draft"].includes(rawStatus)) {
    return "inactive";
  }

  return "current";
}

export function getStableProductKey(product = {}, index = 0) {
  return (
    product.id ||
    product.product_id ||
    product.local_product_id ||
    product.sku ||
    product.product_sku ||
    product.slug ||
    `local-product-${index}`
  );
}

export function getStableVariantKey(variant = {}, productKey = "product", index = 0) {
  return (
    variant.id ||
    variant.variant_id ||
    variant.product_variant_id ||
    variant.sku ||
    variant.seller_sku ||
    variant.variant_sku ||
    `${productKey}-variant-${index}`
  );
}

export function applyTextAndPopupFilters(list, filters, imageRows) {
  const search = filters.search.trim().toLowerCase();

  return list.filter((product) => {
    const productId = product.id || product.product_id || product.local_product_id;
    const variants = getProductVariants(product);
    const mainImage = getMainImageFromRows(getProductImageRows(imageRows, productId));
    const productStatus = getProductStatus(product);

    const text = [
      product.sku,
      product.product_sku,
      product.local_sku,
      product.title,
      product.name,
      ...variants.flatMap((variant) => [
        variant.sku,
        variant.seller_sku,
        variant.variant_sku,
        variant.local_sku,
        variant.title,
        variant.name,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const categoryOk =
      !filters.category_id ||
      String(product.category_id) === String(filters.category_id);

    const subCategoryOk =
      !filters.sub_category_id ||
      String(product.sub_category_id) === String(filters.sub_category_id);

    const modelOk =
      !filters.model_id || String(product.model_id) === String(filters.model_id);

    const imageOk =
      !filters.image_status ||
      (filters.image_status === "with_image" && Boolean(mainImage)) ||
      (filters.image_status === "no_image" && !mainImage);

    const statusOk = !filters.status || filters.status === productStatus;

    return (
      (!search || text.includes(search)) &&
      categoryOk &&
      subCategoryOk &&
      modelOk &&
      imageOk &&
      statusOk
    );
  });
}

export function applyViewFilter(list, view) {
  if (view === "single") return list.filter((product) => !hasProductVariants(product));
  if (view === "variant") return list.filter((product) => hasProductVariants(product));
  if (view === "current") return list.filter((product) => getProductStatus(product) === "current");
  return list;
}
