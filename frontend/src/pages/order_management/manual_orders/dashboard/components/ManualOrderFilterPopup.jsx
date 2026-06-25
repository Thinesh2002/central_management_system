import { useEffect, useState } from "react";
import { CalendarDays, CreditCard, Filter, PackageCheck, X } from "lucide-react";

const PAYMENT_METHODS = [
  { key: "", label: "All Payments" },
  { key: "COD", label: "COD" },
  { key: "BANK", label: "Bank Transfer" },
  { key: "CARD", label: "Card Payment" },
  { key: "CASH", label: "Cash" },
];

function textValue(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    return String(value.label || value.name || value.title || value.key || fallback);
  }
  return fallback;
}

export default function ManualOrderFilterPopup({
  open,
  filters = {},
  statusTabs = [],
  pageSizes = [25, 50, 100, 200],
  onClose,
  onApply,
  onClear,
}) {
  const [localFilters, setLocalFilters] = useState({
    order_status: "",
    status: "",
    payment_method: "",
    date_from: "",
    date_to: "",
    limit: 25,
    page: 1,
  });

  useEffect(() => {
    if (!open) return;

    const statusValue = filters.order_status || filters.status || "";

    setLocalFilters({
      ...filters,
      order_status: statusValue,
      status: statusValue,
      payment_method: filters.payment_method || "",
      date_from: filters.date_from || "",
      date_to: filters.date_to || "",
      limit: Number(filters.limit || 25),
      page: Number(filters.page || 1),
    });
  }, [filters, open]);

  if (!open) return null;

  function update(key, value) {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateStatus(value) {
    const statusValue = value || "";

    setLocalFilters((prev) => ({
      ...prev,
      order_status: statusValue,
      status: statusValue,
      page: 1,
    }));
  }

  function clearAll() {
    const next = {
      order_status: "",
      status: "",
      payment_method: "",
      date_from: "",
      date_to: "",
      limit: 25,
      page: 1,
    };

    setLocalFilters(next);
    onClear?.(next);
  }

  function applyFilters() {
    const statusValue = localFilters.order_status || localFilters.status || "";

    onApply?.({
      ...localFilters,
      order_status: statusValue,
      status: statusValue,
      payment_method: localFilters.payment_method || "",
      date_from: localFilters.date_from || "",
      date_to: localFilters.date_to || "",
      limit: Number(localFilters.limit || 25),
      page: 1,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex cursor-pointer items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-4xl cursor-default flex-col overflow-hidden rounded-xl bg-[#203047] shadow-2xl shadow-black/60 ring-1 ring-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between bg-cyan-700 px-5 py-4">
          <h3 className="inline-flex items-center gap-2 text-sm font-black text-white">
            <Filter size={17} />
            Manual Order Advanced Filters
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          <FilterSection
            title="Order Status"
            icon={<PackageCheck size={16} className="text-cyan-400" />}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {statusTabs.map((tab, index) => {
                const tabKey = textValue(tab.key, "");
                const tabLabel = textValue(tab.label, tabKey || "All Orders");
                const checked = (localFilters.order_status || "") === tabKey;

                return (
                  <CheckboxCard
                    key={tabKey || `all-${index}`}
                    checked={checked}
                    label={tabLabel}
                    onChange={() => updateStatus(tabKey)}
                    radio
                  />
                );
              })}
            </div>
          </FilterSection>

          <FilterSection
            title="Payment Method"
            icon={<CreditCard size={16} className="text-cyan-400" />}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {PAYMENT_METHODS.map((payment) => (
                <CheckboxCard
                  key={payment.key || "all"}
                  checked={(localFilters.payment_method || "") === payment.key}
                  label={payment.label}
                  onChange={() => update("payment_method", payment.key)}
                  radio
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Date Range"
            icon={<CalendarDays size={16} className="text-cyan-400" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DateInput
                label="From Date"
                value={localFilters.date_from || ""}
                onChange={(value) => update("date_from", value)}
              />

              <DateInput
                label="To Date"
                value={localFilters.date_to || ""}
                onChange={(value) => update("date_to", value)}
              />
            </div>
          </FilterSection>

          <FilterSection title="Page Size">
            <div className="grid gap-3 md:grid-cols-4">
              {pageSizes.map((size) => (
                <CheckboxCard
                  key={size}
                  checked={Number(localFilters.limit || 25) === Number(size)}
                  label={`Show ${size}`}
                  onChange={() => update("limit", size)}
                  radio
                />
              ))}
            </div>
          </FilterSection>
        </div>

        <footer className="flex items-center justify-between border-t border-white/10 bg-[#19263a] p-5">
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/20"
          >
            CLEAR ALL
          </button>

          <button
            type="button"
            onClick={applyFilters}
            className="cursor-pointer rounded-lg bg-cyan-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-500"
          >
            APPLY FILTERS
          </button>
        </footer>
      </div>
    </div>
  );
}

function FilterSection({ title, icon, children }) {
  return (
    <section className="mb-6 border-b border-white/10 pb-5 last:mb-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="inline-flex items-center gap-2 text-sm font-black text-white">
          {icon}
          {title}
        </h4>
      </div>

      {children}
    </section>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-black uppercase text-slate-300">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white outline-none transition focus:border-cyan-400"
        style={{ colorScheme: "dark" }}
      />
    </div>
  );
}

function CheckboxCard({ checked, label, subLabel, onChange, radio = false }) {
  return (
    <label
      className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-lg border px-4 transition ${
        checked
          ? "border-cyan-400 bg-cyan-500/10"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
      }`}
    >
      <input
        type={radio ? "radio" : "checkbox"}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer accent-cyan-500"
      />

      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-white">
          {label}
        </span>

        {subLabel && (
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
            {subLabel}
          </span>
        )}
      </span>
    </label>
  );
}