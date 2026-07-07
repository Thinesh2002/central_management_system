import { BACKEND_BASE_URL } from "../constants/localProductsDashboardConstants";

export function parseMaybeJson(value) {
  if (value === undefined || value === null || value === "") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return "";

  const looksJson =
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"));

  if (!looksJson) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function normalizeArray(value) {
  const parsed = parseMaybeJson(value);

  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") return [parsed];

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return [];

    if (trimmed.includes(",") && !trimmed.startsWith("http")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  return [];
}

export function resolveImageUrl(url) {
  if (!url) return "";

  const cleanUrl = String(url).trim();
  if (!cleanUrl) return "";

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:")
  ) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith("//")) return `https:${cleanUrl}`;

  if (cleanUrl.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${cleanUrl}`;
  if (cleanUrl.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${cleanUrl}`;
  if (cleanUrl.startsWith("/")) return `${BACKEND_BASE_URL}${cleanUrl}`;

  return `${BACKEND_BASE_URL}/${cleanUrl.replace(/^\/+/, "")}`;
}

export function addImageCache(url, cacheKey) {
  if (!url || !cacheKey) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`;
}

export function pickImageUrl(value) {
  if (!value) return "";

  const parsed = parseMaybeJson(value);

  if (typeof parsed === "string") return resolveImageUrl(parsed);
  if (!parsed || typeof parsed !== "object") return "";

  const keys = [
    "url",
    "src",
    "image",
    "image_url",
    "imageUrl",
    "image_path",
    "imagePath",
    "path",
    "file_path",
    "filePath",
    "file_url",
    "fileUrl",
    "cdn_url",
    "cdnUrl",
    "thumbnail",
    "thumbnail_url",
    "thumbnailUrl",
    "main_image",
    "main_image_url",
    "mainImageUrl",
    "primary_image",
    "primary_image_url",
    "primaryImageUrl",
    "featured_image",
    "featured_image_url",
    "product_image",
    "product_image_url",
    "first_image_url",
  ];

  for (const key of keys) {
    if (parsed[key]) {
      if (typeof parsed[key] === "object") return pickImageUrl(parsed[key]);
      return resolveImageUrl(parsed[key]);
    }
  }

  return "";
}

export function getImageRowUrl(row = {}) {
  const url = pickImageUrl(row);
  const cacheKey =
    row.updated_at ||
    row.updatedAt ||
    row.created_at ||
    row.createdAt ||
    row.id ||
    row.image_id ||
    "";

  return addImageCache(url, cacheKey);
}

export function getImageVariantId(row = {}) {
  return row.variant_id ?? row.product_variant_id ?? row.sku_id ?? "";
}

export function imageBelongsToParent(row = {}) {
  const variantId = getImageVariantId(row);
  return !variantId || Number(variantId) === 0;
}

export function imageBelongsToVariant(row = {}, variantId) {
  return String(getImageVariantId(row)) === String(variantId);
}

export function isMainImage(row = {}) {
  const type = String(row.image_type || row.type || "").toLowerCase();

  return (
    Number(row.is_main || row.is_primary || row.is_featured || 0) === 1 ||
    type === "main" ||
    type === "primary"
  );
}

export function sortImageRows(images = []) {
  return [...images].sort((a, b) => {
    const mainA = isMainImage(a) ? 0 : 1;
    const mainB = isMainImage(b) ? 0 : 1;

    if (mainA !== mainB) return mainA - mainB;

    const sortA = Number(a.sort_order ?? a.position ?? a.display_order ?? 0);
    const sortB = Number(b.sort_order ?? b.position ?? b.display_order ?? 0);

    if (sortA !== sortB) return sortA - sortB;

    return Number(b.id || 0) - Number(a.id || 0);
  });
}

export function getProductImageRows(productImages, productId) {
  return sortImageRows(
    productImages.filter(
      (row) => String(row.product_id) === String(productId) && imageBelongsToParent(row)
    )
  );
}

export function getVariantImageRows(productImages, productId, variantId) {
  return sortImageRows(
    productImages.filter(
      (row) =>
        String(row.product_id) === String(productId) &&
        imageBelongsToVariant(row, variantId)
    )
  );
}

export function getMainImageFromRows(rows = []) {
  const mainRow = rows.find(isMainImage) || rows[0] || null;
  return mainRow ? getImageRowUrl(mainRow) : "";
}

// "Attach existing image" (product/variant image pickers) creates one
// product_images row per attachment, all pointing at the same physical
// file — so the flat media library (Images Dashboard, image picker) lists
// the same picture once per product/variant it's attached to. Collapse
// those rows down to one card per unique physical file before rendering.
function libraryDedupeKey(row = {}) {
  const key = row.image_path || row.image_url || row.file_name || "";
  return String(key).trim().toLowerCase();
}

export function dedupeImageLibraryRows(rows = []) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = libraryDedupeKey(row);
    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  });

  return Array.from(groups.values()).map((groupRows) => {
    const representative =
      groupRows.find((row) => row.is_assigned) || groupRows[0];

    return {
      ...representative,
      is_assigned: groupRows.some((row) => row.is_assigned),
      _attachment_count: groupRows.length,
    };
  });
}
