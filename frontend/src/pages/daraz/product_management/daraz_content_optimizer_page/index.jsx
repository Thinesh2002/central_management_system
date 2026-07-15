import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Package, Search, Sparkles } from "lucide-react";

import darazContentOptimizerApi from "../../../../config/sub_api/daraz_api/daraz_content_optimizer_api";
import { marketplaceApi } from "../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { getApiError } from "../../../../config/api";
import Loader from "../../../../components/common/Loader";
import { useToast } from "../../../../components/common/toast/ToastProvider";
import { useIsMasterAdmin } from "../../../../components/common/permissions/PermissionsProvider";
import ScanModal from "./components/ScanModal";
import ContentReportModal from "./components/ContentReportModal";

const STATUS_TABS = [
  { value: "pending", label: "Pending Review" },
  { value: "partially_applied", label: "Partially Applied" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "", label: "All" },
];

const PAGE_SIZE = 50;

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

function StatusBadge({ status }) {
  const map = {
    pending: "border-amber-900 bg-amber-950 text-amber-300",
    partially_applied: "border-sky-900 bg-sky-950 text-sky-300",
    applied: "border-emerald-900 bg-emerald-950 text-emerald-300",
    rejected: "border-red-900 bg-red-950 text-red-300",
    failed: "border-red-900 bg-red-950 text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        map[status] || "border-slate-700 bg-slate-800/60 text-slate-300"
      }`}
    >
      {(status || "unknown").replace(/_/g, " ")}
    </span>
  );
}

function ScoreBadge({ value }) {
  const score = Number(value) || 0;
  const tone =
    score >= 80
      ? "border-emerald-900 bg-emerald-950 text-emerald-300"
      : score >= 50
      ? "border-amber-900 bg-amber-950 text-amber-300"
      : "border-red-900 bg-red-950 text-red-300";

  return <span className={`inline-flex h-6 min-w-10 items-center justify-center rounded-md border px-1.5 text-[11px] font-bold ${tone}`}>{score}</span>;
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="border border-slate-800 bg-[#0a101d] px-4 py-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon size={13} />
        <p className="text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-1.5 text-[18px] font-bold ${tone || "text-slate-100"}`}>{value}</p>
    </div>
  );
}

export default function DarazContentOptimizerPage() {
  const showToast = useToast();
  const isMasterAdmin = useIsMasterAdmin();

  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");

  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [pageLimit, setPageLimit] = useState(PAGE_SIZE);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [reportId, setReportId] = useState(null);

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

  async function loadSuggestions(limitOverride) {
    setLoadingSuggestions(true);
    setError("");

    try {
      const res = await darazContentOptimizerApi.listSuggestions({
        account_id: accountId || undefined,
        status: status || undefined,
        limit: limitOverride || pageLimit,
      });
      setSuggestions(res?.data?.data || []);
    } catch (err) {
      setSuggestions([]);
      setError(getApiError(err, "Failed to load content suggestions"));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  useEffect(() => {
    setPageLimit(PAGE_SIZE);
    loadSuggestions(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, status]);

  function loadMore() {
    const nextLimit = pageLimit + PAGE_SIZE;
    setPageLimit(nextLimit);
    loadSuggestions(nextLimit);
  }

  const filteredSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suggestions;

    return suggestions.filter((row) => {
      const haystack = [row.seller_sku, row.product_name, row.suggested_title, row.daraz_item_id, row.daraz_product_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [suggestions, search]);

  const summary = useMemo(() => {
    const total = suggestions.length;
    const pending = suggestions.filter((row) => row.status === "pending").length;
    const scores = suggestions.map((row) => Number(row.scores_json?.overall) || 0).filter((v) => v > 0);
    const avgScore = scores.length ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : 0;
    const critical = suggestions.filter((row) => (row.recommendations_json?.critical?.length || 0) > 0).length;
    const readyToPublish = suggestions.filter((row) => Number(row.readiness_percent) >= 90).length;

    return { total, pending, avgScore, critical, readyToPublish };
  }, [suggestions]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Sparkles size={20} />
            AI Content Optimizer
          </h1>
          <p className="text-[13px] text-slate-500">
            AI-analyzed listing content for existing Daraz products. Nothing is published until you approve it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loadingAccounts || !accounts.length}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
          >
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={getAccountId(account)} value={getAccountId(account)}>
                {getAccountName(account)}
              </option>
            ))}
          </select>

          {isMasterAdmin && (
            <button
              type="button"
              onClick={() => setScanModalOpen(true)}
              disabled={!accounts.length}
              title="Master admin only"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles size={12} />
              Run Analysis
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SummaryCard icon={Package} label="Total Analyzed" value={summary.total} />
        <SummaryCard icon={Sparkles} label="Pending Review" value={summary.pending} tone="text-amber-300" />
        <SummaryCard icon={CheckCircle2} label="Avg Content Score" value={summary.avgScore} tone="text-emerald-300" />
        <SummaryCard icon={AlertTriangle} label="Critical Issues" value={summary.critical} tone="text-red-300" />
        <SummaryCard icon={CheckCircle2} label="Ready to Publish" value={summary.readyToPublish} tone="text-sky-300" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-55 max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product..."
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
        {search && (
          <span className="text-[11px] text-slate-500">
            {filteredSuggestions.length} of {suggestions.length} shown
          </span>
        )}
      </div>

      {error && <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>}

      <div className="flex items-center gap-1 border-b border-slate-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`px-3 py-1.5 text-[12px] font-medium transition ${
              status === tab.value ? "border-b-2 border-orange-400 text-orange-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingSuggestions ? (
        <Loader label="Loading reports..." minHeight="200px" />
      ) : !filteredSuggestions.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          {search
            ? "No reports match your search."
            : isMasterAdmin
            ? "No reports in this view. Click Run Analysis to generate some."
            : "No reports in this view yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Image</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">SKU</th>
                <th className="px-3 py-2 font-medium">Overall Score</th>
                <th className="px-3 py-2 font-medium">Readiness</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSuggestions.map((row) => (
                <tr key={row.id} className="bg-[#0b1220] align-top">
                  <td className="px-3 py-2">
                    {row.product_image ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                        <img src={row.product_image} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-md border border-slate-800 bg-slate-900" />
                    )}
                  </td>
                  <td className="max-w-60 px-3 py-2 text-slate-100">{row.product_name || "-"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{row.seller_sku || "-"}</td>
                  <td className="px-3 py-2">
                    <ScoreBadge value={row.scores_json?.overall} />
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {typeof row.readiness_percent === "number" ? `${row.readiness_percent}%` : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setReportId(row.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-200 hover:border-orange-400 hover:text-orange-300"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!search && !loadingSuggestions && suggestions.length > 0 && suggestions.length >= pageLimit && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-4 text-[12px] font-semibold text-slate-300 hover:bg-slate-800"
          >
            Load More
          </button>
        </div>
      )}

      {scanModalOpen && (
        <ScanModal
          accounts={accounts}
          showToast={showToast}
          onClose={() => setScanModalOpen(false)}
          onDone={() => {
            setStatus("pending");
            loadSuggestions();
          }}
        />
      )}

      <ContentReportModal
        suggestionId={reportId}
        onClose={() => setReportId(null)}
        onChanged={() => loadSuggestions()}
      />
    </div>
  );
}
