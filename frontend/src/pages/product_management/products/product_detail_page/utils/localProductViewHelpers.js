export function unwrapApiData(response) {
  return (
    response?.data?.data?.product ||
    response?.data?.product ||
    response?.data?.data ||
    response?.data?.rows ||
    response?.data?.items ||
    response?.data?.products ||
    response?.data?.images ||
    response?.data?.variants ||
    response?.data?.product_variants ||
    response?.data?.variant_rows ||
    response?.data?.variations ||
    response?.data?.product_variations ||
    response?.data?.variation_rows ||
    response?.data?.attributes ||
    response?.data?.attribute_values ||
    response?.data?.product_attribute_values ||
    response?.data?.inventory ||
    response?.data?.inventories ||
    response?.data?.product_inventory ||
    response?.data ||
    response ||
    []
  );
}

export function normalizeArray(value) {
  const data = unwrapApiData(value);

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.images)) return data.images;

  if (Array.isArray(data?.variants)) return data.variants;
  if (Array.isArray(data?.product_variants)) return data.product_variants;
  if (Array.isArray(data?.variant_rows)) return data.variant_rows;
  if (Array.isArray(data?.variations)) return data.variations;
  if (Array.isArray(data?.product_variations)) return data.product_variations;
  if (Array.isArray(data?.variation_rows)) return data.variation_rows;

  if (Array.isArray(data?.attributes)) return data.attributes;
  if (Array.isArray(data?.attribute_values)) return data.attribute_values;
  if (Array.isArray(data?.product_attribute_values)) {
    return data.product_attribute_values;
  }

  if (Array.isArray(data?.inventory)) return data.inventory;
  if (Array.isArray(data?.inventories)) return data.inventories;
  if (Array.isArray(data?.product_inventory)) return data.product_inventory;

  return data && typeof data === "object" ? [data] : [];
}

export function normalizeObject(value) {
  const data = unwrapApiData(value);

  if (Array.isArray(data)) return data[0] || null;
  if (data && typeof data === "object") return data;

  return null;
}

export function clean(value) {
  return String(value ?? "").trim();
}

export function lower(value) {
  return clean(value).toLowerCase();
}

export function same(valueA, valueB) {
  const a = clean(valueA);
  const b = clean(valueB);

  return a !== "" && b !== "" && a === b;
}

export function sameLoose(valueA, valueB) {
  const a = lower(valueA);
  const b = lower(valueB);

  return a !== "" && b !== "" && a === b;
}

export function valueOf(row = {}, keys = [], fallback = "-") {
  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const key of keyList) {
    const value = row?.[key];

    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    return value;
  }

  return fallback;
}

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function formatNumber(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;

  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return number.toLocaleString();
}

export function formatPrice(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;

  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return number.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateTime(value, fallback = "-") {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getName(row = {}) {
  if (!row) return "";

  if (typeof row === "string" || typeof row === "number") {
    return String(row);
  }

  return clean(
    row.name ||
      row.title ||
      row.category_name ||
      row.sub_category_name ||
      row.subcategory_name ||
      row.subCategoryName ||
      row.model_name ||
      row.product_model_name ||
      row.colour_name ||
      row.color_name ||
      row.attribute_name ||
      row.label ||
      ""
  );
}

export function getProductId(row = {}) {
  return valueOf(
    row,
    ["product_id", "local_product_id", "localProductId", "productId", "id"],
    ""
  );
}

export function getProductSku(row = {}) {
  return valueOf(
    row,
    ["sku", "product_sku", "local_sku", "seller_sku", "item_sku"],
    "-"
  );
}

export function getProductTitle(row = {}) {
  return valueOf(
    row,
    ["title", "name", "product_name", "product_title"],
    "Untitled Product"
  );
}

export function getProductModel(row = {}) {
  return valueOf(
    row,
    ["product_model_name", "model_name", "product_model", "model"],
    "-"
  );
}

export function getCategoryName(row = {}) {
  return valueOf(
    row,
    ["category_name", "category", "main_category_name"],
    "-"
  );
}

export function getSubCategoryName(row = {}) {
  return valueOf(
    row,
    [
      "sub_category_name",
      "subcategory_name",
      "subCategoryName",
      "sub_category",
    ],
    "-"
  );
}

export function getBrandName(row = {}) {
  return valueOf(row, ["brand_name", "brand"], "-");
}

export function getDescription(row = {}) {
  return valueOf(
    row,
    ["description", "product_description", "short_description"],
    ""
  );
}

export function getStatus(row = {}) {
  return valueOf(row, ["status", "active_status", "product_status"], "-");
}

export function isActiveStatus(value) {
  const status = lower(value);

  return ["active", "1", "yes", "enabled", "published"].includes(status);
}

export function getVariantId(row = {}) {
  return valueOf(
    row,
    [
      "product_variant_id",
      "variant_id",
      "local_variant_id",
      "productVariantId",
      "variantId",
      "id",
    ],
    ""
  );
}

export function getVariantOnlyId(row = {}) {
  return valueOf(
    row,
    [
      "product_variant_id",
      "variant_id",
      "local_variant_id",
      "productVariantId",
      "variantId",
    ],
    ""
  );
}

export function getVariantSku(row = {}) {
  return valueOf(
    row,
    ["variant_sku", "sku", "product_sku", "item_sku", "seller_sku"],
    ""
  );
}

export function getVariantName(row = {}, index = 0) {
  return valueOf(
    row,
    [
      "variant_name",
      "name",
      "title",
      "colour_name",
      "color_name",
      "colour",
      "color",
    ],
    `Variation ${index + 1}`
  );
}

export function getColourId(row = {}) {
  return valueOf(row, ["colour_id", "color_id", "colourId", "colorId"], "");
}

export function getColourName(row = {}) {
  return valueOf(
    row,
    ["colour_name", "color_name", "colour", "color", "colourName", "colorName"],
    ""
  );
}

export function sameProduct(row = {}, productId) {
  const id = clean(productId);

  if (!id) return true;

  const relatedIds = [
    row.product_id,
    row.local_product_id,
    row.productId,
    row.localProductId,
  ]
    .filter((value) => clean(value) !== "")
    .map((value) => clean(value));

  if (relatedIds.length === 0) return true;

  return relatedIds.includes(id);
}

export function imageBelongsToVariant(image = {}, variant = {}) {
  const imageVariantId = getVariantOnlyId(image);
  const variantId = getVariantId(variant);

  if (same(imageVariantId, variantId)) return true;

  const imageSku = getVariantSku(image);
  const variantSku = getVariantSku(variant);

  if (sameLoose(imageSku, variantSku)) return true;

  const imageColourId = getColourId(image);
  const variantColourId = getColourId(variant);

  if (same(imageColourId, variantColourId)) return true;

  const imageColour = getColourName(image);
  const variantColour = getColourName(variant);

  if (sameLoose(imageColour, variantColour)) return true;

  return false;
}

export function isProductOnlyImage(image = {}) {
  return ![
    image.product_variant_id,
    image.variant_id,
    image.local_variant_id,
    image.productVariantId,
    image.variantId,
    image.variant_sku,
    image.sku,
  ].some((value) => clean(value) !== "");
}

export function findMasterName(list = [], idKeys = [], currentValue = "") {
  const current = clean(currentValue);

  if (current && Number.isNaN(Number(current))) return current;

  const found = list.find((row) =>
    idKeys.some((key) => same(row?.[key], current))
  );

  return getName(found) || current || "-";
}

export function getStockQty(row = {}) {
  return toNumber(
    valueOf(
      row,
      [
        "stock_qty",
        "stock",
        "quantity",
        "qty",
        "current_stock",
        "total_stock",
        "inventory_qty",
        "on_hand",
      ],
      0
    ),
    0
  );
}

export function getReservedQty(row = {}) {
  return toNumber(
    valueOf(
      row,
      [
        "reserved_qty",
        "reserved_stock",
        "allocated_qty",
        "hold_qty",
        "blocked_qty",
      ],
      0
    ),
    0
  );
}

export function getAvailableQty(row = {}) {
  const available = valueOf(
    row,
    ["available_qty", "available_stock", "available", "sellable_qty"],
    ""
  );

  if (clean(available) !== "") {
    return toNumber(available, 0);
  }

  return Math.max(getStockQty(row) - getReservedQty(row), 0);
}

export function getInventorySummary(rows = []) {
  const stockQty = rows.reduce((sum, row) => sum + getStockQty(row), 0);
  const reservedQty = rows.reduce((sum, row) => sum + getReservedQty(row), 0);
  const availableQty = rows.reduce((sum, row) => sum + getAvailableQty(row), 0);

  return {
    stock_qty: stockQty,
    reserved_qty: reservedQty,
    available_qty: availableQty,
    is_out_of_stock: availableQty <= 0,
    stock_status: availableQty > 0 ? "In Stock" : "Out of Stock",
  };
}

export function inventoryBelongsToVariant(inventory = {}, variant = {}) {
  const inventoryVariantId = getVariantOnlyId(inventory);
  const variantId = getVariantId(variant);

  if (same(inventoryVariantId, variantId)) return true;

  const inventorySku = getVariantSku(inventory);
  const variantSku = getVariantSku(variant);

  if (sameLoose(inventorySku, variantSku)) return true;

  const inventoryColourId = getColourId(inventory);
  const variantColourId = getColourId(variant);

  if (same(inventoryColourId, variantColourId)) return true;

  const inventoryColour = getColourName(inventory);
  const variantColour = getColourName(variant);

  if (sameLoose(inventoryColour, variantColour)) return true;

  return false;
}

export function getProductVariants(product = {}) {
  const possibleValues = [
    product?.variants,
    product?.product_variants,
    product?.variant_rows,
    product?.variations,
    product?.product_variations,
    product?.variation_rows,
  ];

  for (const value of possibleValues) {
    const rows = normalizeArray(value);
    if (rows.length > 0) return rows;
  }

  return [];
}

export function getProductImages(product = {}) {
  const possibleValues = [
    product?.images,
    product?.product_images,
    product?.image_rows,
    product?.all_images,
  ];

  for (const value of possibleValues) {
    const rows = normalizeArray(value);
    if (rows.length > 0) return rows;
  }

  return [];
}

export function getProductSpecifications(product = {}) {
  const possibleValues = [
    product?.specifications,
    product?.attribute_values,
    product?.product_attribute_values,
    product?.attributes,
  ];

  for (const value of possibleValues) {
    const rows = normalizeArray(value);
    if (rows.length > 0) return rows;
  }

  return [];
}

export function uniqueRows(rows = [], keyGetter) {
  const seen = new Set();

  return rows.filter((row, index) => {
    const rawKey =
      typeof keyGetter === "function"
        ? keyGetter(row, index)
        : row?.id || row?.product_variant_id || row?.variant_id || index;

    const key = clean(rawKey || index);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function getProductType(product = {}) {
  return String(
    valueOf(
      product,
      [
        "product_type",
        "type",
        "productType",
        "item_type",
        "product_kind",
        "mode",
      ],
      ""
    )
  )
    .trim()
    .toLowerCase();
}

export function isSingleProduct(product = {}) {
  const type = getProductType(product);

  return [
    "single",
    "simple",
    "normal",
    "standard",
    "without_variant",
    "without_variation",
    "no_variant",
  ].includes(type);
}

export function isParentProduct(product = {}) {
  const type = getProductType(product);

  if (isSingleProduct(product)) return false;

  if (
    [
      "parent",
      "variable",
      "variant",
      "variation",
      "with_variant",
      "with_variation",
      "configurable",
    ].includes(type)
  ) {
    return true;
  }

  const hasVariantsFlag = valueOf(
    product,
    ["has_variants", "hasVariants", "is_parent", "isParent"],
    ""
  );

  if (
    hasVariantsFlag === true ||
    hasVariantsFlag === 1 ||
    hasVariantsFlag === "1" ||
    String(hasVariantsFlag).toLowerCase() === "true"
  ) {
    return true;
  }

  return getProductVariants(product).length > 0;
}

export function shouldShowProductVariations(product = {}) {
  return isParentProduct(product) && getProductVariants(product).length > 0;
}

export function shouldShowProductStockCard(product = {}) {
  return !shouldShowProductVariations(product);
}