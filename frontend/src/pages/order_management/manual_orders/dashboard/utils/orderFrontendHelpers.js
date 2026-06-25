export const PAGE_SIZES = [10, 25, 50, 100];

export function unwrapApiResponse(response) {
  if (!response) return null;

  const data = response?.data ?? response;

  if (data?.success !== undefined && data?.data !== undefined) {
    return data.data;
  }

  return data;
}

export function normalizeError(error, fallbackMessage = "Something went wrong") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
}

export function money(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function moneyNumber(value) {
  const number = Number(value || 0);
  return Number.isNaN(number) ? 0 : number;
}

export function dateOnly(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).split("T")[0] || "-";
  }

  return date.toLocaleDateString("en-GB");
}

export function cleanString(value) {
  return String(value || "").trim();
}

export function pickFirst(...values) {
  return values.find((value) => {
    const cleanValue = cleanString(value);

    return (
      cleanValue &&
      cleanValue !== "null" &&
      cleanValue !== "undefined" &&
      cleanValue !== "[object Object]"
    );
  });
}

export function skuFromProduct(product = {}) {
  return (
    pickFirst(
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
      product.product_code,
      product.productCode
    ) || "-"
  );
}

export function titleFromProduct(product = {}) {
  return (
    pickFirst(
      product.product_name,
      product.productName,
      product.product_title,
      product.productTitle,
      product.title,
      product.name,
      product.model_name,
      product.modelName
    ) || "Product"
  );
}

export function imageFromProduct(product = {}) {
  return (
    pickFirst(
      product.full_url,
      product.fullUrl,
      product.image_url,
      product.imageUrl,
      product.product_image_url,
      product.productImageUrl,
      product.main_image,
      product.mainImage,
      product.thumbnail_url,
      product.thumbnailUrl,
      product.thumbnail,
      product.product_image,
      product.productImage,
      product.image,
      product.url,
      product.src,
      product.path,
      product.file_path,
      product.filePath,
      product.image_path,
      product.imagePath
    ) || ""
  );
}

export function recalcItem(item = {}) {
  const quantity = Math.max(1, moneyNumber(item.quantity || 1));
  const unitPrice = moneyNumber(item.unit_price || item.price || 0);

  return {
    ...item,
    quantity,
    unit_price: unitPrice,
    item_total: quantity * unitPrice,
  };
}
