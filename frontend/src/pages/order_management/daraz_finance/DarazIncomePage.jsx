import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import darazFinanceApi from "../../../config/sub_api/daraz_api/daraz_finance_api";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import { getApiError } from "../../../config/api";
import Loader from "../../../components/common/Loader";
import {
  StatCard,
  SyncModal,
  FinanceFilterBar,
  extractAccounts,
  getAccountId,
  getAccountName,
  money,
  moneyAbs,
  getDashboardDateRange,
  isDateInRange,
} from "./financeShared";

const FETCH_LIMIT = 3000;
const PAGE_SIZE = 50;

export default function DarazIncomePage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");

  const [payouts, setPayouts] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const [idSearch, setIdSearch] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
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

    try {
      const [listRes, summaryRes] = await Promise.all([
        darazFinanceApi.listPayouts({ account_id: accountId || undefined, limit: FETCH_LIMIT }),
        darazFinanceApi.getPayoutSummary({ account_id: accountId || undefined }),
      ]);
      setPayouts(listRes?.data?.data || []);
      setPayoutSummary(summaryRes?.data?.data || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load income data"));
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    setPage(1);
  }, [idSearch, datePreset, customStartDate, customEndDate]);

  const filteredPayouts = useMemo(() => {
    const idQ = idSearch.trim().toLowerCase();
    const range = getDashboardDateRange(datePreset, customStartDate, customEndDate);

    return payouts.filter((row) => {
      const idOk = !idQ || String(row.statement_number || "").toLowerCase().includes(idQ);
      const dateKey = row.daraz_created_at ? String(row.daraz_created_at).slice(0, 10) : "";
      const dateOk = isDateInRange(dateKey, range);
      return idOk && dateOk;
    });
  }, [payouts, idSearch, datePreset, customStartDate, customEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredPayouts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredPayouts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <DollarSign size={20} />
            Daraz Income
          </h1>
          <p className="text-[13px] text-slate-500">Payout statements, auto-synced every 6h.</p>
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
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2 border border-slate-800 bg-[#0b1220] p-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account:</span>
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
      </div>

      <FinanceFilterBar
        title="Search & Filter Income"
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customStartDate={customStartDate}
        onCustomStartChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndChange={setCustomEndDate}
        fields={[
          { key: "id", label: "Statement ID", value: idSearch, onChange: setIdSearch, placeholder: "Enter statement number" },
        ]}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Wallet} label="Opening Balance" value={money(payoutSummary?.latest_opening_balance)} tone="slate" hint="Your account balance at the start of the most recent statement." />
        <StatCard icon={PiggyBank} label="Closing Balance" value={money(payoutSummary?.latest_closing_balance)} tone="blue" hint="Your account balance at the end of the most recent statement — what Daraz owes you (or you owe Daraz) right now." />
        <StatCard icon={TrendingUp} label="Item Revenue" value={money(payoutSummary?.total_item_revenue)} tone="green" hint="Total sales revenue across statements." />
        <StatCard icon={TrendingDown} label="Fees Total" value={moneyAbs(payoutSummary?.total_fees)} tone="red" hint="Total platform/commission fees charged by Daraz." />
        <StatCard icon={Banknote} label="Refunds" value={moneyAbs(payoutSummary?.total_refunds)} tone="orange" hint="Total amount refunded to customers." />
        <StatCard icon={AlertTriangle} label="Guarantee Deposit" value={moneyAbs(payoutSummary?.total_guarantee_deposit)} tone="slate" hint="Deposit Daraz holds/releases as a seller guarantee." />
      </div>

      {loadingData ? (
        <Loader label="Loading income data..." minHeight="240px" />
      ) : (
        <>
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
                {!pageRows.length && (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-slate-500">
                      No payout statements match this filter.
                    </td>
                  </tr>
                )}
                {pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900">
                    <td className="px-3 py-2 font-mono text-slate-300">{row.statement_number}</td>
                    <td className="px-3 py-2 text-slate-300">{money(row.opening_balance)}</td>
                    <td className="px-3 py-2 text-slate-300">{money(row.closing_balance)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-100">{row.payout}</td>
                    <td className="px-3 py-2 text-slate-300">{moneyAbs(row.fees_total)}</td>
                    <td className="px-3 py-2 text-slate-300">{moneyAbs(row.refunds)}</td>
                    <td className="px-3 py-2 text-slate-400">{row.daraz_created_at ? new Date(row.daraz_created_at).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPayouts.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border border-slate-800 bg-[#0b1220] px-3 py-2">
              <p className="text-[11px] text-slate-500">
                Page {safePage} of {totalPages} · {filteredPayouts.length} statements
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safePage <= 1}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safePage >= totalPages}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {syncModalOpen && <SyncModal accounts={accounts} onClose={() => setSyncModalOpen(false)} onDone={loadData} />}
    </div>
  );
}
