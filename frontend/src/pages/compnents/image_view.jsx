import { X, ZoomIn } from "lucide-react";

export default function ImageModal({ src, onClose }) {
  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="
        fixed inset-0 z-[100]
        bg-[#020617]/90 backdrop-blur-md
        flex items-center justify-center
        p-4
      "
    >
      {/* MODAL */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl flex flex-col items-center"
      >
        {/* HEADER */}
        <div className="absolute -top-12 right-0 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5
            bg-white/5 border border-white/10 rounded-lg
            text-[10px] font-semibold text-slate-300 uppercase tracking-widest
          ">
            <ZoomIn size={12} />
            Image Preview
          </div>

          <button
            onClick={onClose}
            className="
              w-10 h-10 rounded-lg
              bg-sky-500 text-black
              hover:bg-sky-400
              transition active:scale-95
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* FIXED IMAGE FRAME */}
        <div
          className="
            w-[900px] h-[550px]
            max-w-full
            bg-[#0F172A]
            border border-[#1E293B]
            rounded-2xl
            flex items-center justify-center
            overflow-hidden
          "
        >
          <img
            src={src}
            alt="Preview"
            className="
              max-w-full max-h-full
              object-contain
              select-none
            "
          />
        </div>

        {/* FOOTER TEXT */}
        <p className="mt-4 text-[11px] text-slate-500">
          Click outside the image to close
        </p>
      </div>
    </div>
  );
}
