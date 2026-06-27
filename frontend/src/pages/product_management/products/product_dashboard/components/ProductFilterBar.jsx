import { Filter, Search } from "lucide-react";

const DATE_OPTIONS = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "7_days", label: "Last 7 Days" },
  { value: "30_days", label: "Last 30 Days" },
  { value: "90_days", label: "Last 90 Days" },
];

function FieldLabel({ children }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-white">
      <span className="h-2 w-2 bg-orange-500" />
      {children}
    </span>
  );
}

function FilterInput({ value, onChange, placeholder }) {
  return <input value={value} onChange={onChange} placeholder={placeholder} className="h-8 w-full rounded border border-slate-600 bg-[#2b3441] px-3 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-orange-400" />;
}

export default function ProductFilterBar({ filters, setFilters, filteredCount, totalCount, activePopupFilterCount, onOpenFilter, onClear }) {
  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-[12px] font-black text-white">
            <Search size={15} className="text-orange-400" />
            Local Products
          </h3>
          <p className="text-[11px] text-slate-400">Showing {filteredCount || 0} / {totalCount || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[210px_250px_1fr_auto_auto] xl:items-end">
        <label className="block">
          <FieldLabel>Date Range</FieldLabel>
          <select value={filters.date_range || "all"} onChange={(event) => updateFilter("date_range", event.target.value)} className="h-8 w-full cursor-pointer rounded border border-slate-600 bg-[#2b3441] px-3 text-[12px] font-medium text-white outline-none focus:border-orange-400">
            {DATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label className="block">
          <FieldLabel>SKU</FieldLabel>
          <FilterInput value={filters.sku || ""} onChange={(event) => updateFilter("sku", event.target.value)} placeholder="Search SKU" />
        </label>

        <label className="block">
          <FieldLabel>Search</FieldLabel>
          <FilterInput value={filters.search || ""} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search product name / model" />
        </label>

        <button type="button" onClick={onOpenFilter} className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded bg-indigo-500 px-4 text-[12px] font-black text-white transition hover:bg-indigo-400">
          <Filter size={14} />
          FILTERS
          {activePopupFilterCount > 0 && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">{activePopupFilterCount}</span>}
        </button>

        <button type="button" onClick={onClear} className="inline-flex h-8 cursor-pointer items-center justify-center rounded bg-white px-4 text-[12px] font-black text-slate-700 transition hover:bg-slate-100">
          CLEAR
        </button>
      </div>
    </section>
  );
}
