export default function DarazOrderPagination({ page, totalPages, loading, onChange }) {
  return (
    <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-[#101722] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] font-semibold text-slate-500">
        Page <span className="text-slate-200">{page}</span> of <span className="text-slate-200">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onChange(Math.max(1, page - 1))}
          className="h-8 cursor-pointer rounded-lg bg-[#0b111b] px-3 text-[12px] font-bold text-slate-300 ring-1 ring-white/[0.08] transition hover:bg-[#151d2a] hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onChange(page + 1)}
          className="h-8 cursor-pointer rounded-lg bg-[#0b111b] px-3 text-[12px] font-bold text-slate-300 ring-1 ring-white/[0.08] transition hover:bg-[#151d2a] hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
