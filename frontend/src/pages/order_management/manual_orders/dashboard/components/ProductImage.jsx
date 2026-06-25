import { Image as ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";

function getApiOrigin() {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  return String(apiBase)
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

function normalizeImageUrl(src = "") {
  const value = String(src || "").trim();

  if (!value || value === "null" || value === "undefined") return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("data:")) return value;

  const origin = getApiOrigin();
  const cleanPath = value.startsWith("/") ? value : `/${value}`;

  return `${origin}${cleanPath}`;
}

const SIZE_CLASS = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

export default function ProductImage({
  src,
  alt = "Product image",
  size = "md",
  className = "",
}) {
  const [failed, setFailed] = useState(false);

  const imageUrl = useMemo(() => normalizeImageUrl(src), [src]);
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;

  if (!imageUrl || failed) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center bg-slate-950 text-slate-600 ${className}`}
      >
        <ImageIcon size={20} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${sizeClass} object-cover ${className}`}
    />
  );
}
