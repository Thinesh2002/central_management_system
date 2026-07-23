import { X } from "lucide-react";

export default function ImagePreviewModal({ image, onClose }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#653bb3] px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">{image.orderNo}</p>
            <p className="truncate text-[11px] text-purple-200/80">{image.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-center bg-slate-100 p-4">
          <img src={image.url} alt={image.title || "Product"} className="max-h-[60vh] w-full object-contain" />
        </div>
      </div>
    </div>
  );
}
