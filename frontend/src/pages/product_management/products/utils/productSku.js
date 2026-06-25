export function getName(item) {
  if (!item) return "";

  return (
    item.name ||
    item.title ||
    item.category_name ||
    item.sub_category_name ||
    item.subcategory_name ||
    item.subCategoryName ||
    item.model_name ||
    item.product_model_name ||
    item.colour_name ||
    item.color_name ||
    item.attribute_name ||
    item.value ||
    item.label ||
    ""
  );
}

export function getCode(item) {
  if (!item) return "";

  return (
    item.code ||
    item.category_code ||
    item.sub_category_code ||
    item.subcategory_code ||
    item.subCategoryCode ||
    item.model_code ||
    item.product_model_code ||
    item.colour_code ||
    item.color_code ||
    item.hex_code ||
    item.sku_code ||
    getName(item)
  );
}

export function makeCode(value) {
  const cleaned = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

  return cleaned || "NA";
}

export function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateProductSku({ category, subCategory, model }) {
  const cat = makeCode(getCode(category) || getName(category));
  const sub = makeCode(getCode(subCategory) || getName(subCategory));
  const mod = makeCode(getCode(model) || getName(model));

  return `${cat}${sub}${mod}`;
}

export function generateVariantSku({ category, subCategory, model, colour }) {
  const cat = makeCode(getCode(category) || getName(category));
  const sub = makeCode(getCode(subCategory) || getName(subCategory));
  const mod = makeCode(getCode(model) || getName(model));
  const col = makeCode(getCode(colour) || getName(colour));

  return `${cat}${sub}${mod}${col}`;
}

export function normalizeList(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.rows)) return response.data.rows;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.result)) return response.data.result;
  if (Array.isArray(response?.data?.records)) return response.data.records;
  if (Array.isArray(response?.data?.list)) return response.data.list;
  if (Array.isArray(response?.data?.products)) return response.data.products;
  if (Array.isArray(response?.data?.models)) return response.data.models;
  if (Array.isArray(response?.data?.categories)) return response.data.categories;
  if (Array.isArray(response?.data?.sub_categories)) return response.data.sub_categories;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.records)) return response.records;
  if (Array.isArray(response?.list)) return response.list;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.models)) return response.models;
  if (Array.isArray(response?.categories)) return response.categories;
  if (Array.isArray(response?.sub_categories)) return response.sub_categories;

  return [];
}

export function getErrorMessage(error, fallback = "Something went wrong.") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.details ||
    error?.friendlyMessage ||
    error?.message ||
    fallback
  );
}

export function buildImageUrl(path) {
  if (!path) return "";

  const raw = String(path).trim();
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const apiBase = String(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
  ).replace(/\/$/, "");

  return `${apiBase}${raw.startsWith("/") ? raw : `/${raw}`}`;
}