import { X } from "lucide-react";

const FIELD_CLASS =
  "h-9 w-full border border-slate-700 bg-[#070b16] px-2.5 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function FilterDrawer({ open, filters, setFilters, options, onClose, onReset }) {
  if (!open) return null;

  function set(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-4xl border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <h3 className="text-[13px] font-semibold text-white">Filter Orders</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Marketplace">
            <select
              value={filters.marketplace}
              onChange={(e) => set("marketplace", e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="all">All Sources</option>
              <option value="daraz">Daraz</option>
              <option value="woo">WooCommerce</option>
              <option value="local">Manual</option>
            </select>
          </Field>

          <Field label="Account">
            <select
              value={filters.account}
              onChange={(e) => set("account", e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">All Accounts</option>
              {(options.accounts || []).map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payment">
            <select
              value={filters.payment}
              onChange={(e) => set("payment", e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">All Payment Methods</option>
              {(options.payment_methods || []).map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Country / City">
            <input
              value={filters.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="e.g. Colombo"
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="Waybill">
            <select
              value={filters.hasWaybill}
              onChange={(e) => set("hasWaybill", e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="all">All</option>
              <option value="yes">With Waybill</option>
              <option value="no">Without Waybill</option>
            </select>
          </Field>

          <Field label="Date From">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="Date To">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => set("dateTo", e.target.value)}
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="Min Total">
            <input
              type="number"
              value={filters.minTotal}
              onChange={(e) => set("minTotal", e.target.value)}
              placeholder="0"
              className={FIELD_CLASS}
            />
          </Field>

          <Field label="Max Total">
            <input
              type="number"
              value={filters.maxTotal}
              onChange={(e) => set("maxTotal", e.target.value)}
              placeholder="0"
              className={FIELD_CLASS}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="h-8 rounded-md border border-slate-700 px-3 text-[12px] font-semibold text-slate-300 hover:bg-slate-800"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
