import {
  CalendarDays,
  Filter,
  Hash,
  RotateCcw,
  Search,
  ShoppingBag,
} from "lucide-react";

export default function DarazOrderSearchFilter({
  filters,
  loading,
  appliedFilterCount = 0,
  onChange,
  onSearch,
  onOpenFilters,
  onClear,
}) {
  const inputClass =
    "h-8 w-full rounded bg-[#2b3747] px-2 text-[11px] font-semibold text-slate-100 outline-none border-b-2 border-white/10 transition-all duration-300 placeholder:text-slate-500 focus:border-b-[4px] focus:border-orange-500 focus:shadow-[0_10px_18px_-16px_rgba(249,115,22,0.9)]";

  const labelClass =
    "mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-300";

  const glowButtonClass =
    "inline-flex h-8 items-center justify-center gap-1 rounded px-3 text-[10px] font-black transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]";

  return (
    <section className="overflow-hidden rounded-md bg-[#1b2635] ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-orange-500" />
          <h2 className="text-[11px] font-black text-white">
            Search & Filter Daraz Orders
          </h2>
        </div>
      </div>

      <form
        onSubmit={onSearch}
        className="grid grid-cols-1 items-end gap-2 px-3 py-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto]"
      >
        <div>
          <label className={labelClass}>
            <CalendarDays size={12} className="text-orange-500" />
            Date Range
          </label>

          <div className="grid grid-cols-2 gap-1">
            <input
              type="date"
              value={filters.date_from || ""}
              onChange={(event) => onChange("date_from", event.target.value)}
              className={inputClass}
              style={{ colorScheme: "dark" }}
            />

            <input
              type="date"
              value={filters.date_to || ""}
              onChange={(event) => onChange("date_to", event.target.value)}
              className={inputClass}
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            <ShoppingBag size={12} className="text-orange-500" />
            SKU
          </label>

          <input
            value={filters.sku || ""}
            onChange={(event) => onChange("sku", event.target.value)}
            placeholder="Enter SKU"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            <Hash size={12} className="text-orange-500" />
            ID / Order ID
          </label>

          <input
            value={filters.order_id || ""}
            onChange={(event) => onChange("order_id", event.target.value)}
            placeholder="Enter Order ID"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`${glowButtonClass} bg-orange-600 text-white shadow-[0_0_10px_rgba(234,88,12,0.25)] hover:bg-orange-500 hover:shadow-[0_0_18px_rgba(234,88,12,0.65)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none`}
        >
          <Search size={12} />
          {loading ? "SEARCHING" : "SEARCH"}
        </button>

        <button
          type="button"
          onClick={onOpenFilters}
          className={`${glowButtonClass} bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.25)] hover:bg-indigo-400 hover:shadow-[0_0_18px_rgba(99,102,241,0.65)]`}
        >
          <Filter size={12} />
          FILTERS
          {appliedFilterCount > 0 && (
            <span className="rounded bg-white/20 px-1 text-[9px]">
              {appliedFilterCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onClear}
          className={`${glowButtonClass} bg-slate-100 text-slate-700 shadow-[0_0_10px_rgba(255,255,255,0.15)] hover:bg-white hover:shadow-[0_0_18px_rgba(255,255,255,0.45)]`}
        >
          <RotateCcw size={12} />
          CLEAR
        </button>
      </form>
    </section>
  );
}