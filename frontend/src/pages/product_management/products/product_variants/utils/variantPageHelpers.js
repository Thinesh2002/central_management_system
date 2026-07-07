import { ALLOWED_IMAGE_TYPES, MAX_EXTRA_IMAGES } from "../constants/variantImageConstants";

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL
).replace(/\/$/, "");

const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

export function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export function cleanNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function getRecordId(record = {}) {
  return (
    record.id ??
    record.variant_id ??
    record.product_variant_id ??
    record.local_variant_id ??
    ""
  );
}

export function rowBelongsToProduct(row, productId) {
  const possibleIds = [
    row?.product_id,
    row?.local_product_id,
    row?.parent_product_id,
    row?.productId,
  ].filter((value) => value !== undefined && value !== null && value !== "");

  if (!possibleIds.length) return true;
  return possibleIds.some((value) => String(value) === String(productId));
}

export function getCategoryId(row) {
  return (
    row?.category_id ??
    row?.product_category_id ??
    row?.categoryId ??
    row?.parent_category_id ??
    ""
  );
}

export function getSubCategoryId(row) {
  return (
    row?.sub_category_id ??
    row?.subcategory_id ??
    row?.subCategoryId ??
    row?.product_sub_category_id ??
    ""
  );
}

export function getModelId(row) {
  return row?.model_id ?? row?.product_model_id ?? row?.modelId ?? "";
}

export function getColourCode(colour) {
  return (
    colour?.colour_code ||
    colour?.color_code ||
    colour?.code ||
    colour?.hex_code ||
    ""
  );
}

export function getVariantSku(variant = {}) {
  return (
    variant.variant_sku ||
    variant.sku ||
    variant.seller_sku ||
    variant.local_sku ||
    variant.child_sku ||
    `VARIANT${getRecordId(variant) || ""}`
  );
}

export function getVariantName(variant = {}) {
  return (
    variant.colour_name ||
    variant.color_name ||
    variant.variant_name ||
    "Variant"
  );
}

export function getVariantPrice(variant = {}) {
  return (
    variant.price ??
    variant.main_price ??
    variant.selling_price ??
    variant.sale_price ??
    0
  );
}

export function getVariantStock(variant = {}) {
  return (
    variant.stock_qty ??
    variant.current_stock ??
    variant.quantity ??
    variant.available_stock ??
    0
  );
}

export function buildImageUrl(value) {
  if (!value) return "";

  const url = String(value).trim();
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${url}`;
  if (url.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${url}`;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;

  return `${BACKEND_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

export function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "string") return buildImageUrl(image);

  return buildImageUrl(
    image.preview ||
      image.image_url ||
      image.imageUrl ||
      image.image_path ||
      image.imagePath ||
      image.file_url ||
      image.fileUrl ||
      image.file_path ||
      image.filePath ||
      image.url ||
      image.path ||
      image.src
  );
}

export function getImageFileName(image) {
  const value =
    image?.image_url ||
    image?.image_path ||
    image?.file_url ||
    image?.file_path ||
    image?.url ||
    image?.path ||
    "";

  if (!value) return "No image selected";

  return String(value).split("/").pop() || String(value);
}

export function imageBelongsToVariant(image = {}, variantId) {
  const imageVariantId =
    image.variant_id || image.product_variant_id || image.sku_id || "";

  return String(imageVariantId) === String(variantId);
}

export function sortImages(images = []) {
  return [...images].sort((a, b) => {
    const sortA = Number(a.sort_order ?? a.position ?? a.display_order ?? 0);
    const sortB = Number(b.sort_order ?? b.position ?? b.display_order ?? 0);

    if (sortA !== sortB) return sortA - sortB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

export function splitImages(images = []) {
  const sorted = sortImages(images);

  const main =
    sorted.find((item) => {
      const type = String(item.image_type || item.type || "").toLowerCase();

      return (
        Number(item.is_main || item.is_primary || item.is_featured || 0) === 1 ||
        type === "main" ||
        type === "primary"
      );
    }) ||
    sorted[0] ||
    null;

  const mainId = main?.id ? String(main.id) : "";

  const extras = sorted.filter((item) => {
    if (!main) return true;
    if (item.id && mainId && String(item.id) === mainId) return false;

    const type = String(item.image_type || item.type || "").toLowerCase();
    if (type === "main" || type === "primary") return false;

    return true;
  });

  return {
    main,
    extras: Array.from(
      { length: MAX_EXTRA_IMAGES },
      (_, index) => extras[index] || null
    ),
    count: sorted.length,
  };
}

export async function validateImage(file) {
  if (!file) throw new Error("Please select an image.");

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Only JPG, JPEG, PNG, GIF and WEBP images are allowed.");
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);

      const pixels = image.width * image.height;

      if (pixels > 10000000) {
        reject(
          new Error(
            `Image is above 10MP. Current: ${image.width} x ${image.height}`
          )
        );
        return;
      }

      resolve({
        width: image.width,
        height: image.height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read selected image."));
    };

    image.src = url;
  });
}
