function pickFirst(item, keys = []) {
  for (const key of keys) {
    const value = item?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

export function getName(item, type = "") {
  if (!item) return "";

  const typeNameKeys = {
    category: ["category_name", "name", "title", "label"],
    subCategory: [
      "sub_category_name",
      "subcategory_name",
      "subCategoryName",
      "name",
      "title",
      "label",
    ],
    model: ["model_name", "product_model_name", "name", "title", "label"],
    colour: ["colour_name", "color_name", "name", "title", "label"],
    size: ["size_name", "name", "title", "label"],
  };

  return (
    pickFirst(item, typeNameKeys[type] || []) ||
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
    item.size_name ||
    item.attribute_name ||
    item.value ||
    item.label ||
    ""
  );
}

export function getCode(item, type = "") {
  if (!item) return "";

  const typeCodeKeys = {
    category: ["category_code", "code"],
    subCategory: [
      "sub_category_code",
      "subcategory_code",
      "subCategoryCode",
      "code",
    ],
    model: ["model_code", "product_model_code", "code"],
    colour: ["colour_code", "color_code", "hex_code", "code"],
    size: ["size_code", "code"],
  };

  return (
    pickFirst(item, typeCodeKeys[type] || []) ||
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
    item.size_code ||
    item.sku_code ||
    getName(item, type)
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
  const cat = makeCode(
    getCode(category, "category") || getName(category, "category")
  );

  const sub = makeCode(
    getCode(subCategory, "subCategory") ||
      getName(subCategory, "subCategory")
  );

  const mod = makeCode(getCode(model, "model") || getName(model, "model"));

  return `${cat}${sub}${mod}`;
}

export function generateVariantSku({ category, subCategory, model, colour, size }) {
  const cat = makeCode(
    getCode(category, "category") || getName(category, "category")
  );

  const sub = makeCode(
    getCode(subCategory, "subCategory") ||
      getName(subCategory, "subCategory")
  );

  const mod = makeCode(getCode(model, "model") || getName(model, "model"));

  const col = makeCode(
    getCode(colour, "colour") || getName(colour, "colour")
  );

  const siz = size ? makeCode(getCode(size, "size") || getName(size, "size")) : "";

  return `${cat}${sub}${mod}${col}${siz}`;
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
  if (Array.isArray(response?.data?.sub_categories)) {
    return response.data.sub_categories;
  }

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