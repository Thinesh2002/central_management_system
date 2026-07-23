import { Image as ImageIcon, X } from "lucide-react";
import { EMPTY_IMAGE } from "../constants/localProductsDashboardConstants";

export default function ImagePreviewModal({ imagePreview, onClose }) {
  if (!imagePreview) return null;

  const imageUrl = imagePreview.image || EMPTY_IMAGE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[720px] flex-col overflow-hidden border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-[#653bb3] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <ImageIcon size={20} />
            <div>
              <h3 className="text-base font-black">Product Image</h3>
              <p className="text-xs font-semibold text-purple-200/80">
                Fixed size main image preview
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center bg-[#0b1220] px-5 py-5">
          <div className="flex h-[540px] w-[540px] max-h-[65vh] max-w-full items-center justify-center overflow-hidden border border-slate-700 bg-white">
            <img
              src={imageUrl}
              alt={imagePreview.title || "Product"}
              className="h-full w-full object-contain p-4"
              draggable={false}
              onError={(event) => {
                event.currentTarget.src = EMPTY_IMAGE;
              }}
            />
          </div>
        </div>

        {/* Image URL - no background, no border */}
        <div className="px-5 pb-5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Image URL
          </p>

          <p
            title={imageUrl}
            className="break-all text-xs font-medium leading-5 text-slate-400"
          >
            {imageUrl}
          </p>
        </div>
      </div>
    </div>
  );
}