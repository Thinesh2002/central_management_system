import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

function getApiOrigin() {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;

  return String(apiBase)
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

function firstValid(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim() !== "null" &&
      String(value).trim() !== "undefined"
  );
}

function extractImageValue(input) {
  if (!input) return "";

  // When src comes as array
  if (Array.isArray(input)) {
    for (const item of input) {
      const value = extractImageValue(item);
      if (value) return value;
    }
    return "";
  }

  // When src comes as object
  if (typeof input === "object") {
    return (
      firstValid(
        input.image_url,
        input.imageUrl,
        input.image_path,
        input.imagePath,
        input.file_path,
        input.filePath,
        input.thumbnail_url,
        input.thumbnailUrl,
        input.main_image,
        input.mainImage,
        input.product_image,
        input.productImage,
        input.url,
        input.src,
        input.path
      ) || ""
    );
  }

  let value = String(input).trim();

  if (
    !value ||
    value === "null" ||
    value === "undefined" ||
    value === "[object Object]"
  ) {
    return "";
  }

  // Backend sends JSON array/object as string
  try {
    if (
      (value.startsWith("[") && value.endsWith("]")) ||
      (value.startsWith("{") && value.endsWith("}"))
    ) {
      const parsed = JSON.parse(value);
      const parsedValue = extractImageValue(parsed);
      if (parsedValue) return parsedValue;
    }
  } catch {
    // ignore invalid JSON
  }

  return value;
}

function safeLocalPath(pathValue) {
  return encodeURI(pathValue).replace(/#/g, "%23");
}

function normalizeImageUrl(src) {
  let value = extractImageValue(src);

  if (!value) return "";

  value = String(value).trim();

  // data/blob images
  if (/^(data:image\/|blob:)/i.test(value)) return value;

  // Already full URL
  if (/^https?:\/\//i.test(value)) return value;

  // Fix Windows path
  value = value.replace(/\\/g, "/");

  // Remove accidental local backend path before uploads
  const uploadIndex = value.toLowerCase().lastIndexOf("/uploads/");
  if (uploadIndex >= 0) {
    value = value.slice(uploadIndex);
  }

  // Fix common wrong paths
  value = value
    .replace(/^\/api\/uploads\//i, "/uploads/")
    .replace(/^api\/uploads\//i, "uploads/")
    .replace(/^\/public\/uploads\//i, "/uploads/")
    .replace(/^public\/uploads\//i, "uploads/")
    .replace(/^\/storage\/uploads\//i, "/uploads/")
    .replace(/^storage\/uploads\//i, "uploads/");

  // uploads/products/a.jpg
  if (value.startsWith("uploads/")) {
    value = `/${value}`;
  }

  // /uploads/products/a.jpg
  if (value.startsWith("/uploads/")) {
    return `${getApiOrigin()}${safeLocalPath(value)}`;
  }

  // fallback: only filename or products/a.jpg
  return `${getApiOrigin()}/uploads/${safeLocalPath(value.replace(/^\/+/, ""))}`;
}

export default function ProductImage({
  src,
  alt,
  size = "md",
  className = "",
}) {
  const [failed, setFailed] = useState(false);

  const imageUrl = useMemo(() => normalizeImageUrl(src), [src]);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const sizeClass =
    size === "sm"
      ? "h-12 w-12"
      : size === "lg"
      ? "h-24 w-24"
      : "h-16 w-16";

  if (!imageUrl || failed) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-500 ${className}`}
        title="No Image"
      >
        <ImageIcon size={18} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || "Product"}
      loading="lazy"
      className={`${sizeClass} shrink-0 rounded-xl border border-slate-700 bg-slate-950 object-cover ${className}`}
      onError={() => {
        setFailed(true);

      }}
    />
  );
}