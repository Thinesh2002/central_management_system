export const EMPTY_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#0f172a"/>
      <rect x="90" y="120" width="420" height="330" rx="22" fill="#111827" stroke="#334155" stroke-width="4"/>
      <circle cx="215" cy="225" r="42" fill="#334155"/>
      <path d="M130 405L245 300L320 365L370 320L470 405H130Z" fill="#334155"/>
      <text x="300" y="505" text-anchor="middle" fill="#94a3b8" font-size="28" font-family="Arial">
        No Image
      </text>
    </svg>
  `);

export const IMAGE_BASE_URL =
  import.meta.env.VITE_IMAGE_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export const IMAGE_FIELD_KEYS = [
  "image_url",
  "imageUrl",
  "image",
  "url",
  "src",
  "path",
  "file_path",
  "filePath",
  "main_image",
  "mainImage",
  "thumbnail",
  "thumbnail_url",
  "thumbnailUrl",
  "product_image",
  "productImage",
  "variant_image",
  "variantImage",
];

export const PRODUCT_IMAGE_KEYS = [
  "images",
  "product_images",
  "image_rows",
  "all_images",
];

export const VARIANT_IMAGE_KEYS = [
  "images",
  "variant_images",
  "product_images",
  "image_rows",
];