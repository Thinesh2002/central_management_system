import { CalendarDays, Filter, Hash, RotateCcw, Search, ShoppingBag } from "lucide-react";

const defaultIcons = {
  date: CalendarDays,
  sku: ShoppingBag,
  id: Hash,
  search: Search,
  select: Filter,
};

function FilterLabel({ icon: Icon, children }) {
  return (
    <label className="cms-filter-label">
      {Icon ? <Icon size={12} className="text-orange-500" /> : <span className="h-2 w-2 rounded-sm bg-orange-500" />}
      {children}
    </label>
  );
}

export function FilterSection({
  title = "Search & Filter",
  children,
  onSearch,
  onClear,
  onOpenFilters,
  filterCount = 0,
  loading = false,
  searchLabel = "SEARCH",
  showSearchButton = true,
  showFilterButton = true,
  showClearButton = true,
  className = "",
}) {
  const content = (
    <>
      <div className="border-b border-white/5 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-orange-500" />
            <h2 className="text-[11px] font-black text-white">{title}</h2>
          </div>
        </div>
      </div>

      <div className="cms-filter-grid px-3 py-2">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {children}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {showSearchButton && (
            <button type="submit" disabled={loading} className="cms-filter-btn cms-filter-btn-search">
              <Search size={12} />
              {loading ? "SEARCHING" : searchLabel}
            </button>
          )}
          {showFilterButton && (
            <button type="button" onClick={onOpenFilters} className="cms-filter-btn cms-filter-btn-filter">
              <Filter size={12} />
              FILTERS
              {Number(filterCount || 0) > 0 && <span className="rounded bg-white/20 px-1 text-[9px]">{filterCount}</span>}
            </button>
          )}
          {showClearButton && (
            <button type="button" onClick={onClear} className="cms-filter-btn cms-filter-btn-clear">
              <RotateCcw size={12} />
              CLEAR
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (onSearch) {
    return (
      <form onSubmit={onSearch} className={`cms-filter-section ${className}`}>
        {content}
      </form>
    );
  }

  return <section className={`cms-filter-section ${className}`}>{content}</section>;
}

export function FilterField({ label, icon = "select", children }) {
  const Icon = typeof icon === "string" ? defaultIcons[icon] : icon;
  return (
    <div className="min-w-0">
      <FilterLabel icon={Icon}>{label}</FilterLabel>
      {children}
    </div>
  );
}

export function FilterInput(props) {
  return <input {...props} className={`cms-filter-input ${props.className || ""}`} />;
}

export function FilterSelect(props) {
  return <select {...props} className={`cms-filter-input ${props.className || ""}`} />;
}

export default FilterSection;
