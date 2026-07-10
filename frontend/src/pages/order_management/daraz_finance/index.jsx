import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  HelpCircle,
  ImageOff,
  Loader2,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import darazFinanceApi from "../../../config/sub_api/daraz_api/daraz_finance_api";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import { getApiError } from "../../../config/api";
import { useToast } from "../../../components/common/toast/ToastProvider";
import Loader from "../../../components/common/Loader";

const TABS = [
  { key: "payouts", label: "Payouts" },
  { key: "transactions", label: "Transactions" },
];

const DATE_PRESETS = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "all", label: "All Time" },
];

const PAGE_SIZE = 50;

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset) {
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

function extractAccounts(res) {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  return [];
}

function getAccountId(account = {}) {
  return account.id || account.account_id;
}

function getAccountName(account = {}) {
  return account.account_name || account.account_code || `#${getAccountId(account)}`;
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value ?? "-";
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function StatCard({ icon: Icon, label, value, tone = "slate", hint }) {
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

function OrderTransactionsModal({ orderNo, accountId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

function SyncModal({ accounts, onClose, onDone }) {
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

export default function DarazFinancePage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [tab, setTab] = useState("payouts");
  const [datePreset, setDatePreset] = useState("30d");
  const [page, setPage] = useState(1);

  const [payouts, setPayouts] = useState([]);
  const [orderGroups, setOrderGroups] = useState([]);
  const [orderGroupsTotal, setOrderGroupsTotal] = useState(0);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [openOrderNo, setOpenOrderNo] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const dateRange = useMemo(() => getPresetRange(datePreset), [datePreset]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await marketplaceApi.getAccounts({ platform_code: "DARAZ" });
        setAccounts(extractAccounts(res));
      } catch (err) {
        setError(getApiError(err, "Failed to load Daraz accounts"));
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [accountId, tab, datePreset]);

  async function loadData() {
    setLoadingData(true);
    setError("");

    const baseParams = { account_id: accountId || undefined, date_from: dateRange.from || undefined, date_to: dateRange.to || undefined };

    try {
      if (tab === "payouts") {
        const [listRes, summaryRes] = await Promise.all([
          darazFinanceApi.listPayouts({ ...baseParams, limit: 200 }),
          darazFinanceApi.getPayoutSummary(baseParams),
        ]);
        setPayouts(listRes?.data?.data || []);
        setPayoutSummary(summaryRes?.data?.data || null);
      } else {
        const [listRes, summaryRes] = await Promise.all([
          darazFinanceApi.listTransactionOrderGroups({ ...baseParams, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
          darazFinanceApi.getTransactionSummary(baseParams),
        ]);
        setOrderGroups(listRes?.data?.data || []);
        setOrderGroupsTotal(listRes?.data?.total || 0);
        setTransactionSummary(summaryRes?.data?.data || null);
      }
    } catch (err) {
      setError(getApiError(err, "Failed to load finance data"));
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, tab, datePreset, page]);

  const totalPages = Math.max(Math.ceil(orderGroupsTotal / PAGE_SIZE), 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <DollarSign size={20} />
            Daraz Finance
          </h1>
          <p className="text-[13px] text-slate-500">
            Payout statements (auto-synced every 6h) and transaction details (auto-synced every 1h).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSyncModalOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400"
        >
          <RefreshCw size={13} />
          Sync Accounts
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* Filter section */}
      <div className="flex flex-wrap items-center gap-2 border border-slate-800 bg-[#0b1220] p-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Filters:</span>

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={loadingAccounts}
          className="h-7 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-200 outline-none"
        >
          <option value="">All Accounts</option>
          {accounts.map((account) => (
            <option key={getAccountId(account)} value={getAccountId(account)}>
              {getAccountName(account)}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1">
          {DATE_PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDatePreset(item.key)}
              className={`h-7 rounded-md border px-2.5 text-[11px] font-semibold ${
                datePreset === item.key
                  ? "border-orange-400 bg-orange-500/15 text-orange-300"
                  : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`h-8 border-b-2 px-3 text-[12px] font-semibold ${
              tab === item.key
                ? "border-orange-400 text-orange-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "payouts" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={Wallet}
            label="Opening Balance"
            value={money(payoutSummary?.latest_opening_balance)}
            tone="slate"
            hint="Your account balance at the start of the most recent statement in this filter."
          />
          <StatCard
            icon={PiggyBank}
            label="Closing Balance"
            value={money(payoutSummary?.latest_closing_balance)}
            tone="blue"
            hint="Your account balance at the end of the most recent statement — what Daraz owes you (or you owe Daraz) right now."
          />
          <StatCard icon={TrendingUp} label="Item Revenue" value={money(payoutSummary?.total_item_revenue)} tone="green" hint="Total sales revenue across statements in this filter." />
          <StatCard icon={TrendingDown} label="Fees Total" value={money(payoutSummary?.total_fees)} tone="red" hint="Total platform/commission fees charged by Daraz in this filter." />
          <StatCard icon={Banknote} label="Refunds" value={money(payoutSummary?.total_refunds)} tone="orange" hint="Total amount refunded to customers in this filter." />
          <StatCard icon={AlertTriangle} label="Guarantee Deposit" value={money(payoutSummary?.total_guarantee_deposit)} tone="slate" hint="Deposit Daraz holds/releases as a seller guarantee." />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard icon={TrendingUp} label="Total Income" value={money(transactionSummary?.total_income)} tone="green" hint="Sum of all positive transaction amounts (sales, credits) in this filter." />
          <StatCard icon={TrendingDown} label="Total Expense" value={money(transactionSummary?.total_expense)} tone="red" hint="Sum of all negative transaction amounts (fees, deductions) in this filter." />
          <StatCard icon={DollarSign} label="Net Sales" value={money(transactionSummary?.net_sales)} tone="blue" hint="Income minus expense — your net result for this filter." />
          <StatCard icon={AlertTriangle} label="Total Penalties" value={money(transactionSummary?.total_penalties)} tone="orange" hint="Transactions flagged as a penalty/fine by Daraz." />
        </div>
      )}

      {loadingData ? (
        <Loader label="Loading finance data..." minHeight="240px" />
      ) : tab === "payouts" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
          <table className="min-w-full divide-y divide-slate-800 text-[12px]">
            <thead className="bg-slate-900">
              <tr>
                {["Statement", "Opening", "Closing", "Payout", "Fees Total", "Refunds", "Created"].map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-normal uppercase tracking-wide text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {!payouts.length && (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center text-slate-500">
                    No payout statements in this date range.
                  </td>
                </tr>
              )}
              {payouts.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900">
                  <td className="px-3 py-2 font-mono text-slate-300">{row.statement_number}</td>
                  <td className="px-3 py-2 text-slate-300">{money(row.opening_balance)}</td>
                  <td className="px-3 py-2 text-slate-300">{money(row.closing_balance)}</td>
                  <td className="px-3 py-2 font-semibold text-slate-100">{row.payout}</td>
                  <td className="px-3 py-2 text-slate-300">{money(row.fees_total)}</td>
                  <td className="px-3 py-2 text-slate-300">{money(row.refunds)}</td>
                  <td className="px-3 py-2 text-slate-400">{formatDate(row.daraz_created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
            <table className="min-w-full divide-y divide-slate-800 text-[12px]">
              <thead className="bg-slate-900">
                <tr>
                  {["", "Order No", "Product", "Lines", "Net Amount", "Latest Date"].map((header) => (
                    <th key={header} className="px-3 py-2 text-left font-normal uppercase tracking-wide text-slate-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {!orderGroups.length && (
                  <tr>
                    <td colSpan="6" className="px-3 py-6 text-center text-slate-500">
                      No transactions in this date range.
                    </td>
                  </tr>
                )}
                {orderGroups.map((group) => (
                  <tr key={group.order_no} className="hover:bg-slate-900">
                    <td className="px-3 py-2">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded border border-slate-700 bg-white">
                        {group.thumbnail_url ? (
                          <img src={group.thumbnail_url} alt={group.product_title || "Order"} className="h-full w-full object-contain" />
                        ) : (
                          <ImageOff size={14} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenOrderNo(group.order_no)}
                        className="cursor-pointer font-mono text-orange-300 underline decoration-dotted hover:text-orange-200"
                        title="View all transactions for this order"
                      >
                        {group.order_no}
                      </button>
                    </td>
                    <td className="max-w-60 truncate px-3 py-2 text-slate-300">{group.product_title || "-"}</td>
                    <td className="px-3 py-2 text-slate-300">{group.line_count}</td>
                    <td className={`px-3 py-2 font-semibold ${Number(group.net_amount) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {money(group.net_amount)}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{group.latest_date || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orderGroupsTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between border border-slate-800 bg-[#0b1220] px-3 py-2">
              <p className="text-[11px] text-slate-500">
                Page {page} of {totalPages} · {orderGroupsTotal} orders
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {openOrderNo && (
        <OrderTransactionsModal orderNo={openOrderNo} accountId={accountId} onClose={() => setOpenOrderNo(null)} />
      )}

      {syncModalOpen && (
        <SyncModal
          accounts={accounts}
          onClose={() => setSyncModalOpen(false)}
          onDone={loadData}
        />
      )}
    </div>
  );
}
