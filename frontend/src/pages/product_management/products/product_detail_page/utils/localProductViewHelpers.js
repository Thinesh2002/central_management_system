export function unwrapApiData(response) {
  return (
    response?.data?.data?.product ||
    response?.data?.product ||
    response?.data?.data ||
    response?.data ||
    response ||
    null
  );
}

export function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || "";
}

export function valueOf(product = {}, keys = [], fallback = "-") {
  for (const key of keys) {
    const value = product?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return fallback;
}

export function nestedName(value, fallback = "-") {
  if (!value) return fallback;

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return (
    value.name ||
    value.title ||
    value.category_name ||
    value.sub_category_name ||
    value.subcategory_name ||
    value.model_name ||
    value.product_model_name ||
    value.label ||
    fallback
  );
}

export function getCategoryName(product = {}) {
  return (
    nestedName(product.category, "") ||
    valueOf(product, ["category_name", "product_category_name"], "-")
  );
}

export function getSubCategoryName(product = {}) {
  return (
    nestedName(product.sub_category, "") ||
    nestedName(product.subCategory, "") ||
    valueOf(product, ["sub_category_name", "subcategory_name", "product_sub_category_name"], "-")
  );
}

export function getModelName(product = {}) {
  return (
    nestedName(product.model, "") ||
    nestedName(product.product_model, "") ||
    valueOf(product, ["model_name", "product_model_name"], "-")
  );
}

export function formatMoney(value, currency = "LKR") {
  const amount = Number(value || 0);

  return `${currency || "LKR"} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function yesNo(value) {
  return Number(value) === 1 || value === true || value === "yes" ? "Yes" : "No";
}

export function getStatus(product = {}) {
  const rawStatus = valueOf(product, ["status", "active_status", "product_status"], "Active");
  const status = String(rawStatus).trim();

  if (!status || status === "-") return "Active";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getMainImage(product = {}) {
  const image =
    product.main_image ||
    product.image_url ||
    product.product_image ||
    product.thumbnail ||
    product.image ||
    product.images?.[0]?.image_url ||
    product.images?.[0]?.url ||
    product.images?.[0];

  return typeof image === "string" ? image : image?.image_url || image?.url || "";
}

export async function fetchLocalProductById(localProductsApi, productId) {
  const apiMethods = [
    "getProductById",
    "getById",
    "getProduct",
    "viewProduct",
    "showProduct",
  ];

  for (const methodName of apiMethods) {
    if (typeof localProductsApi?.[methodName] === "function") {
      return localProductsApi[methodName](productId);
    }
  }

  throw new Error(
    "No product view API method found. Add getProductById(id) or getById(id) in local_products_api."
  );
}
