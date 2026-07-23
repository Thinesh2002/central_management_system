import { LayoutGrid, Printer, X } from "lucide-react";

// Same purple-header popup language as PdfPreviewModal - shown before a
// bulk Print AWB so the user can choose Daraz's own label sheet ("Normal")
// vs our own 3x3-per-A4-page composed sheet ("A4 Print").
export default function PrintLayoutChoiceModal({ open, onClose, onChoose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#653bb3]/20 bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 items-center justify-between gap-3 border-b border-[#653bb3]/15 bg-[#653bb3] px-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
            <Printer size={15} />
            Print AWB
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#653bb3]/20 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2 p-4">
          <p className="text-[11px] text-slate-400">Choose how to print the selected labels.</p>

          <button
            type="button"
            onClick={() => onChoose("normal")}
            className="flex w-full items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-left transition hover:border-yellow-400"
          >
            <Printer size={18} className="shrink-0 text-yellow-400" />
            <span>
              <span className="block text-[12px] font-semibold text-slate-100">Normal Print</span>
              <span className="block text-[11px] text-slate-400">Daraz's own label sheet, as returned.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChoose("a4_grid")}
            className="flex w-full items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-3 py-3 text-left transition hover:border-yellow-400"
          >
            <LayoutGrid size={18} className="shrink-0 text-yellow-400" />
            <span>
              <span className="block text-[12px] font-semibold text-slate-100">A4 Print</span>
              <span className="block text-[11px] text-slate-400">9 labels per A4 sheet, 3 columns x 3 rows.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
