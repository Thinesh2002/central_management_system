import { Image as ImageIcon, X } from "lucide-react";

function getApiOrigin() {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL;

  return String(apiBase)
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

function normalizeImageUrl(src) {
  if (!src) return "";

  const value = String(src).trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;

  const origin = getApiOrigin();

  if (value.startsWith("/uploads/")) return `${origin}${value}`;
  if (value.startsWith("uploads/")) return `${origin}/${value}`;
  if (value.startsWith("product-images/")) return `${origin}/uploads/${value}`;

  return value;
}

export default function ProductImagePopup({ image, onClose }) {
  const imageUrl = normalizeImageUrl(image?.src);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[720px] cursor-default overflow-hidden rounded-xl bg-[#20344d] shadow-2xl shadow-black/70 ring-1 ring-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#6f3cc3] px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <ImageIcon size={18} />
            Product Image
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Close image popup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center overflow-hidden rounded-xl bg-white ring-2 ring-violet-500 shadow-[0_0_30px_rgba(124,58,237,0.35)]">
            <img
              src={imageUrl}
              alt={image?.title || "Product"}
              className="max-h-full max-w-full cursor-zoom-in object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div className="mt-4 rounded-lg bg-white/10 px-4 py-3 text-center text-[11px] font-black text-slate-100 ring-1 ring-white/20">
            <span className="break-all">{imageUrl}</span>
          </div>

          {(image?.orderId || image?.sku || image?.title) && (
            <div className="mt-3 line-clamp-1 text-center text-[11px] font-semibold text-slate-300">
              {image?.orderId ? `Order ID: ${image.orderId}` : ""}
              {image?.sku ? ` • SKU: ${image.sku}` : ""}
              {image?.title ? ` • ${image.title}` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}