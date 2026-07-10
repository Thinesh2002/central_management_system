import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  DollarSign,
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

function groupTransactionsByOrder(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = row.order_no || `no-order-${row.id}`;

    if (!map.has(key)) {
      map.set(key, {
        order_no: row.order_no || "-",
        thumbnail_url: row.thumbnail_url || null,
        product_title: row.product_title || null,
        account_id: row.account_id,
        latest_date: row.transaction_date || null,
        transactions: [],
        totalAmount: 0,
      });
    }

    const group = map.get(key);
    group.transactions.push(row);
    group.totalAmount += Number(row.amount) || 0;
  });

  return Array.from(map.values());
}

function StatCard({ icon: Icon, label, value, tone = "slate" }) {
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
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-[15px] font-bold text-white">{value}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Icon size={15} />
        </div>
      </div>
    </div>
  );
}

function OrderTransactionsModal({ group, onClose }) {
  if (!group) return null;

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
            <h3 className="truncate text-[14px] font-semibold text-white">Order {group.order_no}</h3>
            <p className="text-[11px] text-purple-200/80">
              {group.transactions.length} transaction{group.transactions.length === 1 ? "" : "s"} · Net {money(group.totalAmount)}
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

        <div className="overflow-y-auto">
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
              {group.transactions.map((row) => (
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
        </div>
      </div>
    </div>
  );
}

export default function DarazFinancePage() {
  const showToast = useToast();

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [tab, setTab] = useState("payouts");

  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [openOrderGroup, setOpenOrderGroup] = useState(null);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [syncingPayouts, setSyncingPayouts] = useState(false);
  const [syncingTransactions, setSyncingTransactions] = useState(false);
  const [error, setError] = useState("");

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

  async function loadData() {
    setLoadingData(true);
    setError("");

    const params = accountId ? { account_id: accountId, limit: 1000 } : { limit: 1000 };
    const summaryParams = accountId ? { account_id: accountId } : {};

    try {
      if (tab === "payouts") {
        const [listRes, summaryRes] = await Promise.all([
          darazFinanceApi.listPayouts(params),
          darazFinanceApi.getPayoutSummary(summaryParams),
        ]);
        setPayouts(listRes?.data?.data || []);
        setPayoutSummary(summaryRes?.data?.data || null);
      } else {
        const [listRes, summaryRes] = await Promise.all([
          darazFinanceApi.listTransactions(params),
          darazFinanceApi.getTransactionSummary(summaryParams),
        ]);
        setTransactions(listRes?.data?.data || []);
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
  }, [accountId, tab]);

  async function syncPayoutsNow() {
    if (!accountId) {
      showToast("Pick a specific account to sync (not All Accounts).");
      return;
    }

    setSyncingPayouts(true);
    setError("");

    try {
      const res = await darazFinanceApi.syncPayoutsNow(accountId);
      const result = res?.data?.data;
      showToast(`Payout sync done. ${result?.total_saved ?? 0} of ${result?.total_found ?? 0} statements saved.`);
      if (tab === "payouts") await loadData();
    } catch (err) {
      setError(getApiError(err, "Payout sync failed"));
    } finally {
      setSyncingPayouts(false);
    }
  }

  async function syncTransactionsNow() {
    if (!accountId) {
      showToast("Pick a specific account to sync (not All Accounts).");
      return;
    }

    setSyncingTransactions(true);
    setError("");

    try {
      const res = await darazFinanceApi.syncTransactionsNow(accountId);
      const result = res?.data?.data;
      showToast(`Transaction sync done. ${result?.total_saved ?? 0} of ${result?.total_found ?? 0} transactions saved.`);
      if (tab === "transactions") await loadData();
    } catch (err) {
      setError(getApiError(err, "Transaction sync failed"));
    } finally {
      setSyncingTransactions(false);
    }
  }

  const orderGroups = useMemo(() => groupTransactionsByOrder(transactions), [transactions]);

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

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loadingAccounts}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={getAccountId(account)} value={getAccountId(account)}>
                {getAccountName(account)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={syncPayoutsNow}
            disabled={syncingPayouts}
            title={!accountId ? "Pick a specific account first" : "Sync payouts for this account"}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingPayouts ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />}
            Sync Payouts
          </button>

          <button
            type="button"
            onClick={syncTransactionsNow}
            disabled={syncingTransactions}
            title={!accountId ? "Pick a specific account first" : "Sync transactions for this account"}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-2.5 text-[11px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingTransactions ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync Transactions
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

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
          <StatCard icon={Wallet} label="Opening Balance" value={money(payoutSummary?.total_opening_balance)} tone="slate" />
          <StatCard icon={PiggyBank} label="Closing Balance" value={money(payoutSummary?.total_closing_balance)} tone="blue" />
          <StatCard icon={TrendingUp} label="Item Revenue" value={money(payoutSummary?.total_item_revenue)} tone="green" />
          <StatCard icon={TrendingDown} label="Fees Total" value={money(payoutSummary?.total_fees)} tone="red" />
          <StatCard icon={Banknote} label="Refunds" value={money(payoutSummary?.total_refunds)} tone="orange" />
          <StatCard icon={AlertTriangle} label="Guarantee Deposit" value={money(payoutSummary?.total_guarantee_deposit)} tone="slate" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard icon={TrendingUp} label="Total Income" value={money(transactionSummary?.total_income)} tone="green" />
          <StatCard icon={TrendingDown} label="Total Expense" value={money(transactionSummary?.total_expense)} tone="red" />
          <StatCard icon={DollarSign} label="Net Sales" value={money(transactionSummary?.net_sales)} tone="blue" />
          <StatCard icon={AlertTriangle} label="Total Penalties" value={money(transactionSummary?.total_penalties)} tone="orange" />
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
                    No payout statements yet.
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
                    No transactions yet.
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
                      onClick={() => setOpenOrderGroup(group)}
                      className="cursor-pointer font-mono text-orange-300 underline decoration-dotted hover:text-orange-200"
                      title="View all transactions for this order"
                    >
                      {group.order_no}
                    </button>
                  </td>
                  <td className="max-w-60 truncate px-3 py-2 text-slate-300">{group.product_title || "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{group.transactions.length}</td>
                  <td className={`px-3 py-2 font-semibold ${group.totalAmount < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {money(group.totalAmount)}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{group.latest_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrderTransactionsModal group={openOrderGroup} onClose={() => setOpenOrderGroup(null)} />
    </div>
  );
}
