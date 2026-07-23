import React, { useState } from "react";
import {
  HelpCircle,
  ImageOff,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import darazFinanceApi from "../../../config/sub_api/daraz_api/daraz_finance_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import Loader from "../../../components/common/Loader";

export const DATE_PRESETS = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "all", label: "All Time" },
];

export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export function getPresetRange(preset) {
  const now = new Date();

  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: toISODate(from), to: toISODate(now) };
  }

  if (preset === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: toISODate(from), to: toISODate(now) };
  }

  if (preset === "90d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    return { from: toISODate(from), to: toISODate(now) };
  }

  if (preset === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISODate(from), to: toISODate(now) };
  }

  if (preset === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISODate(from), to: toISODate(to) };
  }

  return { from: "", to: "" };
}

export function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Dashboard date-range filter: "all/today/.../custom" preset -> {start, end}
// (YYYY-MM-DD strings, empty = unbounded), used for client-side filtering
// of an already-loaded batch of rows (same pattern as the Daraz Products page).
export function getDashboardDateRange(preset, customStartDate, customEndDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "all") return { start: "", end: "" };

  if (preset === "today") {
    const date = formatInputDate(today);
    return { start: date, end: date };
  }

  if (preset === "yesterday") {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    const formatted = formatInputDate(date);
    return { start: formatted, end: formatted };
  }

  if (preset === "last_7_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_30_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_60_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  if (preset === "last_90_days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return { start: formatInputDate(start), end: formatInputDate(today) };
  }

  return { start: customStartDate, end: customEndDate };
}

export function isDateInRange(dateKey, range) {
  if (!range.start && !range.end) return true;
  if (!dateKey) return false;
  if (range.start && dateKey < range.start) return false;
  if (range.end && dateKey > range.end) return false;
  return true;
}

export function extractAccounts(res) {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  return [];
}

export function getAccountId(account = {}) {
  return account.id || account.account_id;
}

export function getAccountName(account = {}) {
  return account.account_name || account.account_code || `#${getAccountId(account)}`;
}

export function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value ?? "-";
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fees/refunds are stored as negative deductions, but shown under "cost"
// labels (Fees Total, Refunds) where a negative sign reads as confusing --
// the label already conveys it's a deduction, so display the magnitude.
export function moneyAbs(value) {
  return money(Math.abs(Number(value) || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function StatCard({ icon: Icon, label, value, tone = "slate", hint }) {
  const tones = {
    slate: "border-white/10 bg-[#0D1322] text-slate-200",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    orange: "border-orange-400/20 bg-orange-400/10 text-orange-300",
    blue: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {label}
            {hint && (
              <span title={hint}>
                <HelpCircle size={11} className="cursor-help text-slate-600" />
              </span>
            )}
          </p>
          <p className="mt-1 truncate text-[15px] font-bold text-white">{value}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

// Filter-bar grid: Date Range select (+ optional custom From/To) followed by
// up to three text-search fields. Mirrors the Daraz Products search/filter
// bar layout so Income/Transactions look and behave the same way.
export function FinanceFilterBar({ title, datePreset, onDatePresetChange, customStartDate, onCustomStartChange, customEndDate, onCustomEndChange, fields = [] }) {
  const isCustom = datePreset === "custom";

  return (
    <div className="rounded-md border border-zinc-700/60 bg-[#1c2838] shadow-sm shadow-black/20">
      <div className="flex items-center justify-between border-b border-zinc-700/60 px-3 py-2">
        <h2 className="text-[13px] font-semibold text-white">{title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 px-3 py-2 xl:grid-cols-12">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">Date Range</label>
          <select
            value={datePreset}
            onChange={(event) => onDatePresetChange(event.target.value)}
            className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_60_days">Last 60 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {isCustom && (
          <>
            <div className="xl:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">From</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => onCustomStartChange(event.target.value)}
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
              />
            </div>
            <div className="xl:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">To</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => onCustomEndChange(event.target.value)}
                className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none focus:border-orange-400"
              />
            </div>
          </>
        )}

        {fields.map((field) => (
          <div key={field.key} className="xl:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase text-zinc-300">{field.label}</label>
            <input
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder={field.placeholder}
              className="h-8 w-full rounded-sm border border-zinc-600 bg-[#2a3542] px-2 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-orange-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderTransactionsModal({ orderNo, accountId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!orderNo) return;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await darazFinanceApi.listTransactions({
          order_no: orderNo,
          account_id: accountId || undefined,
          limit: 200,
        });
        setRows(res?.data?.data || []);
      } catch (err) {
        setError(getApiError(err, "Failed to load order transactions"));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderNo, accountId]);

  if (!orderNo) return null;

  const totalAmount = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden border border-purple-500/40 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-white">Order {orderNo}</h3>
            <p className="text-[11px] text-purple-200/80">
              {rows.length} transaction{rows.length === 1 ? "" : "s"} · Net {money(totalAmount)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="m-3 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-y-auto">
          {loading ? (
            <Loader label="Loading transactions..." minHeight="160px" />
          ) : (
            <table className="min-w-full divide-y divide-slate-800 text-[12px]">
              <thead className="bg-slate-900">
                <tr>
                  {["Transaction", "Type", "Fee Name", "SKU", "Amount", "Paid Status", "Date"].map((header) => (
                    <th key={header} className="px-3 py-2 text-left font-normal uppercase tracking-wide text-slate-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {!rows.length && (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-slate-500">
                      No transactions found for this order.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900">
                    <td className="px-3 py-2 font-mono text-slate-300">{row.transaction_number}</td>
                    <td className="px-3 py-2 text-slate-300">{row.transaction_type || "-"}</td>
                    <td className="px-3 py-2 text-slate-400">{row.fee_name || "-"}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{row.seller_sku || row.lazada_sku || "-"}</td>
                    <td className={`px-3 py-2 font-semibold ${Number(row.amount) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {money(row.amount)}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{row.paid_status || "-"}</td>
                    <td className="px-3 py-2 text-slate-400">{row.transaction_date || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function SyncModal({ accounts, onClose, onDone }) {
  const showToast = useToast();
  const [selectedIds, setSelectedIds] = useState([]);
  const [syncPayouts, setSyncPayouts] = useState(true);
  const [syncTransactions, setSyncTransactions] = useState(true);
  const [preset, setPreset] = useState("30d");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  function toggleAccount(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(accounts.map((account) => String(getAccountId(account))));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  async function runSync() {
    if (!selectedIds.length) {
      setError("Select at least one account.");
      return;
    }

    if (!syncPayouts && !syncTransactions) {
      setError("Pick at least one: Payouts or Transactions.");
      return;
    }

    setRunning(true);
    setError("");
    setResults([]);

    const range = getPresetRange(preset);
    const outcomes = [];

    for (const accountId of selectedIds) {
      const account = accounts.find((row) => String(getAccountId(row)) === String(accountId));
      const accountName = account ? getAccountName(account) : `#${accountId}`;

      if (syncPayouts) {
        try {
          const res = await darazFinanceApi.syncPayoutsNow(accountId, { created_after: range.from || undefined });
          const result = res?.data?.data;
          outcomes.push({
            account: accountName,
            scope: "Payouts",
            success: true,
            message: `${result?.total_saved ?? 0} of ${result?.total_found ?? 0} saved`,
          });
        } catch (err) {
          outcomes.push({ account: accountName, scope: "Payouts", success: false, message: getApiError(err, "Failed") });
        }
      }

      if (syncTransactions) {
        try {
          const res = await darazFinanceApi.syncTransactionsNow(accountId, {
            start_time: range.from || undefined,
            end_time: range.to || undefined,
          });
          const result = res?.data?.data;
          outcomes.push({
            account: accountName,
            scope: "Transactions",
            success: true,
            message: `${result?.total_saved ?? 0} of ${result?.total_found ?? 0} saved`,
          });
        } catch (err) {
          outcomes.push({ account: accountName, scope: "Transactions", success: false, message: getApiError(err, "Failed") });
        }
      }
    }

    setResults(outcomes);
    setRunning(false);

    const failedCount = outcomes.filter((row) => !row.success).length;
    showToast(
      failedCount
        ? `Sync finished with ${failedCount} failure(s). See results below.`
        : "Sync completed successfully for all selected accounts."
    );

    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => !running && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border border-purple-500/40 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <div>
            <h3 className="text-[14px] font-semibold text-white">Sync Daraz Finance</h3>
            <p className="text-[11px] text-purple-200/80">Pick accounts, scope and date range.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
              {error}
            </div>
          )}

          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">What to sync</p>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-[12px] text-slate-200">
                <input type="checkbox" checked={syncPayouts} onChange={(e) => setSyncPayouts(e.target.checked)} className="accent-orange-500" />
                Payouts
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-slate-200">
                <input type="checkbox" checked={syncTransactions} onChange={(e) => setSyncTransactions(e.target.checked)} className="accent-orange-500" />
                Transactions
              </label>
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date Range</p>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.filter((item) => item.key !== "all").map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPreset(item.key)}
                  className={`h-7 rounded-md border px-2.5 text-[11px] font-semibold ${
                    preset === item.key
                      ? "border-orange-400 bg-orange-500/15 text-orange-300"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Accounts ({selectedIds.length} of {accounts.length})
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-[11px] font-semibold text-orange-300 hover:text-orange-200">
                Select All
              </button>
              <button type="button" onClick={clearAll} className="text-[11px] font-semibold text-slate-400 hover:text-slate-200">
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {accounts.map((account) => {
              const id = String(getAccountId(account));
              const checked = selectedIds.includes(id);

              return (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] ${
                    checked ? "border-orange-400/40 bg-orange-400/5 text-white" : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleAccount(id)} className="accent-orange-500" />
                  <span className="truncate">{getAccountName(account)}</span>
                </label>
              );
            })}
          </div>

          {results.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Results</p>
              {results.map((row, index) => (
                <div
                  key={index}
                  className={`rounded-md border px-2.5 py-1.5 text-[11px] ${
                    row.success ? "border-emerald-900 bg-emerald-950 text-emerald-300" : "border-red-900 bg-red-950 text-red-300"
                  }`}
                >
                  {row.account} · {row.scope}: {row.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-3 text-[12px] font-semibold text-slate-200 disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={runSync}
            disabled={running}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {running ? "Syncing..." : "Run Sync"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ImageOff };
