import { Image as ImageIcon, X } from "lucide-react";

export default function DarazImagePreview({ image, onClose }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-[#0c111b] shadow-2xl shadow-black/70 ring-1 ring-white/10" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
              <ImageIcon size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">Product Image</h3>
              <p className="truncate text-[11px] font-semibold text-slate-400">
                Order #{image.orderId || "-"}
                {image.sku ? ` • SKU ${image.sku}` : ""}
                {image.darazId ? ` • ID ${image.darazId}` : ""}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Close image preview">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="mx-auto flex max-h-[72vh] max-w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2 ring-1 ring-white/10">
            <img src={image.src} alt={image.title || "Product"} className="max-h-[68vh] max-w-full object-contain" />
          </div>
          <div className="mt-3 rounded-xl bg-white/5 px-2 py-1.5 text-center text-[11px] font-black text-slate-300 ring-1 ring-white/10">
            <span className="break-all">{image.src}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
