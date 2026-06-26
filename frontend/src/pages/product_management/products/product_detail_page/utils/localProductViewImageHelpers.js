import {
  EMPTY_IMAGE,
  IMAGE_BASE_URL,
  IMAGE_FIELD_KEYS,
  PRODUCT_IMAGE_KEYS,
  VARIANT_IMAGE_KEYS,
} from "../constants/localProductsDashboardConstants";

function clean(value) {
  return String(value ?? "").trim();
}

function isFullUrl(value) {
  const text = clean(value).toLowerCase();

  return (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.startsWith("data:image") ||
    text.startsWith("blob:")
  );
}

function getApiBaseUrl() {
  return clean(IMAGE_BASE_URL).replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function joinUrl(baseUrl, path) {
  const base = clean(baseUrl).replace(/\/$/, "");
  const cleanPath = clean(path).replace(/^\/+/, "");

  if (!base || !cleanPath) return EMPTY_IMAGE;

  return `${base}/${cleanPath}`;
}

export function extractImageValue(image) {
  if (!image) return "";

  if (typeof image === "string" || typeof image === "number") {
    const value = clean(image);
    return value === "[object Object]" ? "" : value;
  }

  if (Array.isArray(image)) {
    return extractImageValue(image[0]);
  }

  if (typeof image !== "object") return "";

  for (const key of IMAGE_FIELD_KEYS) {
    const value = image?.[key];

    if (!value) continue;

    if (typeof value === "string" || typeof value === "number") {
      const cleaned = clean(value);
      if (cleaned && cleaned !== "[object Object]") return cleaned;
    }

    if (Array.isArray(value)) {
      const nested = extractImageValue(value[0]);
      if (nested) return nested;
    }

    if (typeof value === "object") {
      const nested = extractImageValue(value);
      if (nested) return nested;
    }
  }

  return "";
}

export function resolveImageUrl(image) {
  const rawValue = extractImageValue(image);

  if (!rawValue || rawValue === "[object Object]") return EMPTY_IMAGE;
  if (isFullUrl(rawValue)) return rawValue;

  return joinUrl(getApiBaseUrl(), rawValue);
}

export function normalizeImageRows(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeImageRows(item));
  }

  if (typeof value === "string") {
    const text = clean(value);

    if (!text) return [];

    try {
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => normalizeImageRows(item));
      }

      if (parsed && typeof parsed === "object") return [parsed];

      return [text];
    } catch {
      return [text];
    }
  }

  if (typeof value === "object") return [value];

  return [];
}

export function uniqueImageRows(rows = []) {
  const seen = new Set();

  return normalizeImageRows(rows).filter((row, index) => {
    const url = resolveImageUrl(row);
    const key =
      url ||
      clean(row?.id) ||
      clean(row?.image_id) ||
      clean(row?.product_image_id) ||
      clean(row?.variant_image_id) ||
      `image-${index}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function getProductImageRows(product = {}) {
  const rows = [];

  for (const key of PRODUCT_IMAGE_KEYS) {
    rows.push(...normalizeImageRows(product?.[key]));
  }

  return uniqueImageRows(rows);
}

export function getImageRows(product = {}) {
  return getProductImageRows(product);
}

export function getVariantImageRows(variant = {}) {
  const rows = [];

  for (const key of VARIANT_IMAGE_KEYS) {
    rows.push(...normalizeImageRows(variant?.[key]));
  }

  return uniqueImageRows(rows);
}

export function getMainImageFromRows(rows = []) {
  const imageRows = uniqueImageRows(rows);

  if (imageRows.length === 0) return EMPTY_IMAGE;

  const mainImage =
    imageRows.find(
      (row) =>
        row?.is_main === true ||
        row?.is_primary === true ||
        row?.main === true ||
        row?.image_type === "main" ||
        row?.type === "main" ||
        Number(row?.sort_order) === 0 ||
        Number(row?.position) === 0
    ) || imageRows[0];

  return resolveImageUrl(mainImage);
}

export function getFirstImageFromRows(rows = []) {
  const imageRows = uniqueImageRows(rows);

  if (imageRows.length === 0) return EMPTY_IMAGE;

  return resolveImageUrl(imageRows[0]);
}

export function getMainProductImage(product = {}) {
  return getMainImageFromRows(getProductImageRows(product));
}

export function getFirstProductImage(product = {}) {
  return getFirstImageFromRows(getProductImageRows(product));
}

export function getMainVariantImage(variant = {}) {
  return getMainImageFromRows(getVariantImageRows(variant));
}

export function getFirstVariantImage(variant = {}) {
  return getFirstImageFromRows(getVariantImageRows(variant));
}

export function getVariantSubImageRows(variant = {}) {
  const rows = getVariantImageRows(variant);
  const mainUrl = getMainVariantImage(variant);

  return rows.filter((row) => {
    const url = resolveImageUrl(row);

    if (!url || url === EMPTY_IMAGE) return false;
    if (url === mainUrl) return false;

    return true;
  });
}

export function getImageUrl(image) {
  return resolveImageUrl(image);
}

export function getImageSrc(image) {
  return resolveImageUrl(image);
}

export function getProductImageUrl(image) {
  return resolveImageUrl(image);
}

export function getImageAlt(image = {}, fallback = "Product image") {
  if (!image || typeof image !== "object") return fallback;

  return (
    clean(image.alt) ||
    clean(image.alt_text) ||
    clean(image.title) ||
    clean(image.name) ||
    fallback
  );
}

export function handleImageError(event) {
  if (!event?.currentTarget) return;

  event.currentTarget.onerror = null;
  event.currentTarget.src = EMPTY_IMAGE;
}

export { EMPTY_IMAGE };