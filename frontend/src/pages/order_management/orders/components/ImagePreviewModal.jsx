import { X } from "lucide-react";

export default function ImagePreviewModal({ image, onClose }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">{image.orderNo}</p>
            <p className="truncate text-[11px] text-slate-500">{image.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
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
