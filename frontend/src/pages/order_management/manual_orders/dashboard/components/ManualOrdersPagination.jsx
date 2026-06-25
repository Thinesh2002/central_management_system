import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES } from "../utils/orderFrontendHelpers";

export default function ManualOrdersPagination({
  filters,
  setFilters,
  pagination,
  loading,
}) {
  function changeLimit(event) {
    setFilters((prev) => ({
      ...prev,
      limit: Number(event.target.value),
      page: 1,
    }));
  }

  function prevPage() {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(1, Number(prev.page || 1) - 1),
    }));
  }

  function nextPage() {
    setFilters((prev) => ({
      ...prev,
      page: Number(prev.page || 1) + 1,
    }));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-4 text-sm text-slate-400">
      <div className="flex items-center gap-2">
        <span>Rows</span>

        <select
          value={filters.limit}
          onChange={changeLimit}
          className="bg-[#020617] px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-orange-500"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div>
        Page <span className="font-bold text-white">{pagination.page}</span> of{" "}
        <span className="font-bold text-white">{pagination.total_pages}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pagination.page <= 1 || loading}
          onClick={prevPage}
          className="inline-flex items-center gap-2 bg-slate-950 px-4 py-2 font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        <button
          type="button"
          disabled={pagination.page >= pagination.total_pages || loading}
          onClick={nextPage}
          className="inline-flex items-center gap-2 bg-slate-950 px-4 py-2 font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
