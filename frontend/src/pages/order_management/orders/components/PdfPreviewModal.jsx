import { FileText, X } from "lucide-react";

// Same visual language as PageOverlayProvider (purple gradient header,
// centered card) so this reads as "the same popup" the rest of the app
// already uses - just embedding an external Daraz PDF instead of an
// internal app route.
export default function PdfPreviewModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-purple-500/30 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
            <FileText size={15} />
            AWB Document
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <iframe title="AWB Document" src={url} className="h-full w-full flex-1 border-0 bg-white" />
      </div>
    </div>
  );
}
