import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const BUTTON_COLOR_CLASSES = {
  orange: "bg-orange-500 hover:bg-orange-400 text-white",
  green: "bg-emerald-500 hover:bg-emerald-400 text-white",
};

export default function ExportCsvModal({
  open,
  onClose,
  title = "Export CSV",
  datePresetOptions = [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "7_days", label: "Last 7 Days" },
    { value: "30_days", label: "Last 30 Days" },
    { value: "90_days", label: "Last 90 Days" },
    { value: "custom", label: "Custom Range" },
  ],
  columns = [],
  accounts = null,
  buttonColor = "orange",
  onExport,
}) {
  const [datePreset, setDatePreset] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [columnKeys, setColumnKeys] = useState(() => new Set(columns.map((c) => c.key)));
  const [accountIds, setAccountIds] = useState(() =>
    accounts ? new Set(accounts.map((a) => String(a.id))) : new Set()
  );

  useEffect(() => {
    if (!open) return;
    setColumnKeys(new Set(columns.map((c) => c.key)));
    if (accounts) setAccountIds(new Set(accounts.map((a) => String(a.id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function toggleColumn(key) {
    setColumnKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAccount(id) {
    const key = String(id);
    setAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExport() {
    if (!columnKeys.size) {
      alert("Select at least one column to export.");
      return;
    }

    onExport?.({
      datePreset,
      customStart,
      customEnd,
      minPrice: minPrice === "" ? null : Number(minPrice),
      maxPrice: maxPrice === "" ? null : Number(maxPrice),
      columnKeys: Array.from(columnKeys),
      accountIds: accounts ? Array.from(accountIds) : null,
    });

    onClose?.();
  }

  const buttonClass =
    BUTTON_COLOR_CLASSES[buttonColor] || BUTTON_COLOR_CLASSES.orange;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <h2 className="text-[12px] font-black text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              Date Range
            </p>
            <select
              value={datePreset}
              onChange={(event) => setDatePreset(event.target.value)}
              className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm font-semibold text-slate-100 outline-none focus:border-orange-400"
            >
              {datePresetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {datePreset === "custom" ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm text-slate-100 outline-none focus:border-orange-400"
                />
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              Price Range
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Min"
                className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
              <input
                type="number"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max"
                className="h-10 w-full border border-slate-700 bg-[#0a101d] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
              />
            </div>
          </div>

          {accounts ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Which Account
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setAccountIds(
                      accountIds.size === accounts.length
                        ? new Set()
                        : new Set(accounts.map((a) => String(a.id)))
                    )
                  }
                  className="cursor-pointer text-[11px] font-bold text-orange-300 hover:text-orange-200"
                >
                  {accountIds.size === accounts.length ? "Clear All" : "Select All"}
                </button>
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto border border-slate-800 p-2">
                {accounts.map((account) => (
                  <label
                    key={account.id}
                    className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={accountIds.has(String(account.id))}
                      onChange={() => toggleAccount(account.id)}
                      className="h-3.5 w-3.5 cursor-pointer accent-orange-500"
                    />
                    {account.label}
                  </label>
                ))}
                {!accounts.length ? (
                  <p className="px-1 py-1 text-xs text-slate-500">No accounts found.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Which Columns
              </p>
              <button
                type="button"
                onClick={() =>
                  setColumnKeys(
                    columnKeys.size === columns.length
                      ? new Set()
                      : new Set(columns.map((c) => c.key))
                  )
                }
                className="cursor-pointer text-[11px] font-bold text-orange-300 hover:text-orange-200"
              >
                {columnKeys.size === columns.length ? "Clear All" : "Select All"}
              </button>
            </div>
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto border border-slate-800 p-2">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={columnKeys.has(column.key)}
                    onChange={() => toggleColumn(column.key)}
                    className="h-3.5 w-3.5 cursor-pointer accent-orange-500"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 bg-[#07101f] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 cursor-pointer items-center border border-slate-700 bg-[#0b1220] px-3 text-[12px] font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 px-3 text-[12px] font-semibold transition ${buttonClass}`}
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
