import { SlidersHorizontal, X } from "lucide-react";
import { EMPTY_FILTERS, VIEW_TABS } from "../constants/localProductsDashboardConstants";

export default function FilterModal({
  open,
  draftFilters,
  setDraftFilters,
  draftView,
  setDraftView,
  tabCounts,
  categories,
  visibleSubCategories,
  models,
  getName,
  onClose,
  onApply,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-[#1b2b42] shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-orange-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <SlidersHorizontal size={20} />
            <div>
              <h3 className="text-base font-black">Product Filters</h3>
              <p className="text-xs font-semibold text-orange-50/80">
                Category, product type, model, image and status filters
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-300">
              Product Type
            </p>
            <div className="flex flex-wrap items-end gap-6 border-b border-slate-700">
              {VIEW_TABS.map((tab) => {
                const isActive = draftView === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDraftView(tab.key)}
                    className={`group inline-flex h-10 cursor-pointer items-center gap-2 border-b-2 px-1 text-sm font-black transition ${
                      isActive
                        ? "border-orange-400 text-orange-300"
                        : "border-transparent text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] font-black transition ${
                        isActive
                          ? "text-orange-200"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {tabCounts[tab.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FilterSelect
              label="Category"
              value={draftFilters.category_id}
              onChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  category_id: value,
                  sub_category_id: "",
                }))
              }
              placeholder="All categories"
              options={categories}
              getName={getName}
            />

            <FilterSelect
              label="Sub Category"
              value={draftFilters.sub_category_id}
              onChange={(value) =>
                setDraftFilters((prev) => ({ ...prev, sub_category_id: value }))
              }
              placeholder="All sub categories"
              options={visibleSubCategories}
              getName={getName}
              keyPrefix="sub-category"
            />

            <FilterSelect
              label="Model"
              value={draftFilters.model_id}
              onChange={(value) =>
                setDraftFilters((prev) => ({ ...prev, model_id: value }))
              }
              placeholder="All models"
              options={models}
              getName={getName}
              keyPrefix="model"
            />

            <StaticSelect
              label="Image Status"
              value={draftFilters.image_status}
              onChange={(value) =>
                setDraftFilters((prev) => ({ ...prev, image_status: value }))
              }
              placeholder="All image status"
              options={[
                { value: "with_image", label: "With image" },
                { value: "no_image", label: "No image" },
              ]}
            />

            <StaticSelect
              label="Product Status"
              value={draftFilters.status}
              onChange={(value) =>
                setDraftFilters((prev) => ({ ...prev, status: value }))
              }
              placeholder="All status"
              options={[
                { value: "current", label: "Current" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-700 bg-[#17253a] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setDraftFilters(EMPTY_FILTERS);
              setDraftView("all");
            }}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-[#0b1220] px-5 text-sm font-black text-slate-300 transition hover:text-white"
          >
            Clear Filters
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-[#22344d] px-5 text-sm font-black text-white transition hover:bg-[#2a405d]"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onApply}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-black text-white transition hover:bg-orange-400"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  getName,
  keyPrefix = "category",
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
      >
        <option value="">{placeholder}</option>
        {options.map((item, index) => (
          <option key={item.id || `${keyPrefix}-${index}`} value={item.id}>
            {getName(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function StaticSelect({ label, value, onChange, placeholder, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-600 bg-[#0b1220] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
