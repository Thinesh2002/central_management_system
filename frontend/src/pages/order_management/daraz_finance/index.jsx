import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, RefreshCw, Wallet } from "lucide-react";

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

export default function DarazFinancePage() {
  const showToast = useToast();

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [tab, setTab] = useState("payouts");

  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);

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
        const rows = extractAccounts(res);
        setAccounts(rows);
        if (rows.length) setAccountId(String(getAccountId(rows[0])));
      } catch (err) {
        setError(getApiError(err, "Failed to load Daraz accounts"));
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, []);

  async function loadData() {
    if (!accountId) return;

    setLoadingData(true);
    setError("");

    try {
      if (tab === "payouts") {
        const res = await darazFinanceApi.listPayouts({ account_id: accountId, limit: 200 });
        setPayouts(res?.data?.data || []);
      } else {
        const res = await darazFinanceApi.listTransactions({ account_id: accountId, limit: 200 });
        setTransactions(res?.data?.data || []);
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
    if (!accountId) return;

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
    if (!accountId) return;

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

  const selectedAccountName = useMemo(() => {
    const account = accounts.find((row) => String(getAccountId(row)) === String(accountId));
    return account ? getAccountName(account) : "";
  }, [accounts, accountId]);

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
            disabled={loadingAccounts || !accounts.length}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
          >
            {!accounts.length && <option value="">No Daraz accounts</option>}
            {accounts.map((account) => (
              <option key={getAccountId(account)} value={getAccountId(account)}>
                {getAccountName(account)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={syncPayoutsNow}
            disabled={!accountId || syncingPayouts}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingPayouts ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />}
            Sync Payouts
          </button>

          <button
            type="button"
            onClick={syncTransactionsNow}
            disabled={!accountId || syncingTransactions}
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

      {selectedAccountName && (
        <p className="text-[11px] text-slate-500">Showing data for {selectedAccountName}.</p>
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
                {["Transaction", "Order No", "Type", "SKU", "Amount", "Paid Status", "Date"].map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-normal uppercase tracking-wide text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {!transactions.length && (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center text-slate-500">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {transactions.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900">
                  <td className="px-3 py-2 font-mono text-slate-300">{row.transaction_number}</td>
                  <td className="px-3 py-2 text-slate-300">{row.order_no || "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{row.transaction_type || "-"}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{row.seller_sku || row.lazada_sku || "-"}</td>
                  <td
                    className={`px-3 py-2 font-semibold ${
                      Number(row.amount) < 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {money(row.amount)}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.paid_status || "-"}</td>
                  <td className="px-3 py-2 text-slate-400">{row.transaction_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
