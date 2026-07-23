import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

// Same visual language as PageOverlayProvider (purple gradient header,
// centered card) so this reads as "the same popup" the rest of the app
// already uses - just embedding an external Daraz PDF instead of an
// internal app route. Bulk Print AWB can return one PDF per A4 sheet (up
// to 9 labels each), so this shows a Sheet 1/2/3 tab strip when there's
// more than one.
export default function PdfPreviewModal({ urls, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [urls]);

  if (!urls || !urls.length) return null;

  const activeUrl = urls[Math.min(activeIndex, urls.length - 1)];

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#653bb3]/20 bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-[#653bb3]/15 bg-[#653bb3] px-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
            <FileText size={15} />
            AWB Document
            {urls.length > 1 && (
              <span className="ml-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] normal-case text-purple-200">
                Sheet {activeIndex + 1} of {urls.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={activeIndex === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#653bb3]/20 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => Math.min(prev + 1, urls.length - 1))}
                  disabled={activeIndex === urls.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#653bb3]/20 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#653bb3]/20 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {urls.length > 1 && (
          <div className="flex shrink-0 flex-wrap gap-1 border-b border-[#653bb3]/10 bg-slate-950/60 px-3 py-2">
            {urls.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-sm px-2.5 py-1 text-[11px] font-semibold transition ${
                  index === activeIndex
                    ? "bg-purple-500 text-slate-950"
                    : "border border-slate-700 text-slate-300 hover:border-purple-400"
                }`}
              >
                Sheet {index + 1}
              </button>
            ))}
          </div>
        )}

        <iframe title="AWB Document" src={activeUrl} className="h-full w-full flex-1 border-0 bg-white" />
      </div>
    </div>
  );
}
