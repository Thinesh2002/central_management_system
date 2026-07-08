import { Download, Filter, Plus, Search } from "lucide-react";

const DATE_OPTIONS = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "7_days", label: "Last 7 Days" },
  { value: "30_days", label: "Last 30 Days" },
  { value: "90_days", label: "Last 90 Days" },
];

function FieldLabel({ children }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
      <span className="h-2 w-2 bg-orange-500" />
      {children}
    </span>
  );
}

function FilterInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-8 w-full border border-slate-600 bg-[#2b3441] px-3 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-orange-400"
    />
  );
}

export default function ProductFilterBar({
  filters,
  setFilters,
  activePopupFilterCount,
  onOpenFilter,
  onClear,
  onOpenExport,
  onAddProduct,
}) {
  function updateFilter(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updatePrice(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value.replace(/[^\d.]/g, ""),
    }));
  }

  function handleSearch(event) {
    event.preventDefault();

    setFilters((prev) => ({
      ...prev,
      search: String(prev.search || "").trim(),
      sku: String(prev.sku || "").trim(),
      min_price: String(prev.min_price || "").trim(),
      max_price: String(prev.max_price || "").trim(),
    }));
  }

  return (
    <section className="overflow-hidden border border-slate-700 bg-[#1b2a3a] shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white">
          <Search size={15} className="text-orange-400" />
          Search & Filter Local Products
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddProduct}
            className="flex h-7 items-center gap-1 rounded-sm border border-slate-600 bg-[#44546b] px-3 text-[11px] font-semibold text-white hover:bg-[#52657f]"
          >
            <Plus size={13} />
            ADD PRODUCT
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="flex h-7 items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-500"
          >
            <Download size={13} />
            EXPORT CSV
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[270px_270px_1fr_150px_150px_auto_auto] xl:items-end">
          <label className="block">
            <FieldLabel>Date Range</FieldLabel>
            <select
              value={filters.date_range || "all"}
              onChange={(event) => updateFilter("date_range", event.target.value)}
              className="h-8 w-full cursor-pointer border border-slate-600 bg-[#2b3441] px-3 text-[12px] font-medium text-white outline-none focus:border-orange-400"
            >
              {DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>SKU</FieldLabel>
            <FilterInput
              value={filters.sku || ""}
              onChange={(event) => updateFilter("sku", event.target.value)}
              placeholder="Enter SKU"
            />
          </label>

          <label className="block">
            <FieldLabel>Search</FieldLabel>
            <FilterInput
              value={filters.search || ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search Local Products"
            />
          </label>

          <label className="block">
            <FieldLabel>Min Price</FieldLabel>
            <FilterInput
              value={filters.min_price || ""}
              onChange={(event) => updatePrice("min_price", event.target.value)}
              placeholder="Min"
            />
          </label>

          <label className="block">
            <FieldLabel>Max Price</FieldLabel>
            <FilterInput
              value={filters.max_price || ""}
              onChange={(event) => updatePrice("max_price", event.target.value)}
              placeholder="Max"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-8 cursor-pointer items-center justify-center bg-orange-500 px-4 text-[12px] font-semibold text-white transition hover:bg-orange-400"
          >
            SEARCH
          </button>

          <button
            type="button"
            onClick={onOpenFilter}
            className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 bg-indigo-500 px-4 text-[12px] font-semibold text-white transition hover:bg-indigo-400"
          >
            <Filter size={14} />
            FILTERS
            {activePopupFilterCount > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 text-[10px]">
                {activePopupFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 cursor-pointer items-center justify-center bg-white px-4 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            CLEAR
          </button>
        </div>
      </form>
    </section>
  );
}