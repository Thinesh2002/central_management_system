import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import darazFinanceApi from "../../../config/sub_api/daraz_api/daraz_finance_api";
import { marketplaceApi } from "../../../config/sub_api/marketplace_management_api/marketplace_api";
import { getApiError } from "../../../config/api";
import Loader from "../../../components/common/Loader";
import {
  StatCard,
  SyncModal,
  OrderTransactionsModal,
  FinanceFilterBar,
  ImageOff,
  extractAccounts,
  getAccountId,
  getAccountName,
  money,
  getDashboardDateRange,
  isDateInRange,
} from "./financeShared";

const FETCH_LIMIT = 3000;
const PAGE_SIZE = 50;

export default function DarazTransactionsPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");

  const [orderGroups, setOrderGroups] = useState([]);
  const [transactionSummary, setTransactionSummary] = useState(null);
  const [openOrderNo, setOpenOrderNo] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const [idSearch, setIdSearch] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
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
        darazFinanceApi.listTransactionOrderGroups({ account_id: accountId || undefined, limit: FETCH_LIMIT }),
        darazFinanceApi.getTransactionSummary({ account_id: accountId || undefined }),
      ]);
      setOrderGroups(listRes?.data?.data || []);
      setTransactionSummary(summaryRes?.data?.data || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load transaction data"));
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
  }, [idSearch, skuSearch, titleSearch, datePreset, customStartDate, customEndDate]);

  const filteredGroups = useMemo(() => {
    const idQ = idSearch.trim().toLowerCase();
    const skuQ = skuSearch.trim().toLowerCase();
    const titleQ = titleSearch.trim().toLowerCase();
    const range = getDashboardDateRange(datePreset, customStartDate, customEndDate);

    return orderGroups.filter((row) => {
      const idOk = !idQ || String(row.order_no || "").toLowerCase().includes(idQ);
      const skuOk =
        !skuQ ||
        String(row.seller_skus || "").toLowerCase().includes(skuQ) ||
        String(row.lazada_skus || "").toLowerCase().includes(skuQ);
      const titleOk = !titleQ || String(row.product_title || "").toLowerCase().includes(titleQ);

      const dateKey = row.latest_date ? new Date(row.latest_date).toISOString().slice(0, 10) : "";
      const dateOk = Number.isNaN(new Date(row.latest_date).getTime()) ? true : isDateInRange(dateKey, range);

      return idOk && skuOk && titleOk && dateOk;
    });
  }, [orderGroups, idSearch, skuSearch, titleSearch, datePreset, customStartDate, customEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredGroups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <DollarSign size={20} />
            Daraz Transactions
          </h1>
          <p className="text-[13px] text-slate-500">Transaction details, auto-synced every 1h.</p>
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
        title="Search & Filter Transactions"
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customStartDate={customStartDate}
        onCustomStartChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndChange={setCustomEndDate}
        fields={[
          { key: "id", label: "Order ID", value: idSearch, onChange: setIdSearch, placeholder: "Enter order no" },
          { key: "sku", label: "SKU", value: skuSearch, onChange: setSkuSearch, placeholder: "Enter SKU" },
          { key: "title", label: "Title", value: titleSearch, onChange: setTitleSearch, placeholder: "Enter product title" },
        ]}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard icon={TrendingUp} label="Total Income" value={money(transactionSummary?.total_income)} tone="green" hint="Sum of all positive transaction amounts (sales, credits)." />
        <StatCard icon={TrendingDown} label="Total Expense" value={money(transactionSummary?.total_expense)} tone="red" hint="Sum of all negative transaction amounts (fees, deductions)." />
        <StatCard icon={DollarSign} label="Net Sales" value={money(transactionSummary?.net_sales)} tone="blue" hint="Income minus expense — your net result." />
        <StatCard icon={AlertTriangle} label="Total Penalties" value={money(transactionSummary?.total_penalties)} tone="orange" hint="Transactions flagged as a penalty/fine by Daraz." />
      </div>

      {loadingData ? (
        <Loader label="Loading transaction data..." minHeight="240px" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
            <table className="min-w-full divide-y divide-slate-800 text-[12px]">
              <thead className="bg-slate-900">
                <tr>
                  {["", "Order No", "Product", "SKU", "Lines", "Net Amount", "Latest Date"].map((header) => (
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
                      No transactions match this filter.
                    </td>
                  </tr>
                )}
                {pageRows.map((group) => (
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
                    <td className="max-w-40 truncate px-3 py-2 font-mono text-slate-400">
                      {group.seller_skus || group.lazada_skus || "-"}
                    </td>
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

          {filteredGroups.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border border-slate-800 bg-[#0b1220] px-3 py-2">
              <p className="text-[11px] text-slate-500">
                Page {safePage} of {totalPages} · {filteredGroups.length} orders
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

      {openOrderNo && (
        <OrderTransactionsModal orderNo={openOrderNo} accountId={accountId} onClose={() => setOpenOrderNo(null)} />
      )}

      {syncModalOpen && <SyncModal accounts={accounts} onClose={() => setSyncModalOpen(false)} onDone={loadData} />}
    </div>
  );
}
