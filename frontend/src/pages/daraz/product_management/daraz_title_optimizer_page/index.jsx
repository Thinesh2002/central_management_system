import React, { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";

import darazTitleOptimizerApi from "../../../../config/sub_api/daraz_api/daraz_title_optimizer_api";
import { marketplaceApi } from "../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { getApiError } from "../../../../config/api";
import Loader from "../../../../components/common/Loader";

const STATUS_TABS = [
  { value: "pending", label: "Pending Review" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "", label: "All" },
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

function StatusBadge({ status }) {
  const map = {
    pending: "border-amber-900 bg-amber-950 text-amber-300",
    applied: "border-emerald-900 bg-emerald-950 text-emerald-300",
    approved: "border-emerald-900 bg-emerald-950 text-emerald-300",
    rejected: "border-red-900 bg-red-950 text-red-300",
    failed: "border-red-900 bg-red-950 text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
        map[status] || "border-slate-700 bg-slate-800/60 text-slate-300"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

export default function DarazTitleOptimizerPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [limit, setLimit] = useState(50);

  const [status, setStatus] = useState("pending");
  const [suggestions, setSuggestions] = useState([]);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [actingId, setActingId] = useState(null);

  const [error, setError] = useState("");
  const [scanResult, setScanResult] = useState(null);

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

  async function loadSuggestions() {
    setLoadingSuggestions(true);
    setError("");

    try {
      const res = await darazTitleOptimizerApi.listSuggestions({
        account_id: accountId || undefined,
        status: status || undefined,
      });
      setSuggestions(res?.data?.data || []);
    } catch (err) {
      setSuggestions([]);
      setError(getApiError(err, "Failed to load title suggestions"));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  useEffect(() => {
    if (accountId) loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, status]);

  async function handleScan() {
    if (!accountId) return;

    setScanning(true);
    setError("");
    setScanResult(null);

    try {
      const res = await darazTitleOptimizerApi.scan({ accountId, limit: Number(limit) || 50 });
      setScanResult(res?.data?.data || null);
      setStatus("pending");
      await loadSuggestions();
    } catch (err) {
      setError(getApiError(err, "Failed to scan products for title suggestions"));
    } finally {
      setScanning(false);
    }
  }

  async function handleApprove(id) {
    setActingId(id);
    setError("");

    try {
      await darazTitleOptimizerApi.approve(id);
      await loadSuggestions();
    } catch (err) {
      setError(getApiError(err, "Failed to apply title to Daraz"));
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id) {
    setActingId(id);
    setError("");

    try {
      await darazTitleOptimizerApi.reject(id);
      await loadSuggestions();
    } catch (err) {
      setError(getApiError(err, "Failed to reject suggestion"));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <Sparkles size={20} />
            Title Optimizer
          </h1>
          <p className="text-[13px] text-slate-500">
            AI-suggested title improvements for existing Daraz listings. Nothing is published until you approve it.
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

          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            title="How many products to scan"
            className="h-8 w-16 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
          />

          <button
            type="button"
            onClick={handleScan}
            disabled={!accountId || scanning}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Scan for Optimization
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="rounded-md border border-slate-800 bg-[#0b1220] px-3 py-2 text-[12px] text-slate-400">
          Scanned <span className="text-slate-200">{scanResult.total}</span> products —{" "}
          <span className="text-emerald-400">{scanResult.succeeded} suggestions generated</span>
          {scanResult.failed > 0 && (
            <>
              , <span className="text-red-400">{scanResult.failed} failed</span>
            </>
          )}
          .
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>
      )}

      <div className="flex items-center gap-1 border-b border-slate-800">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`px-3 py-1.5 text-[12px] font-medium transition ${
              status === tab.value
                ? "border-b-2 border-orange-400 text-orange-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingSuggestions ? (
        <Loader label="Loading suggestions..." minHeight="200px" />
      ) : !suggestions.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          No suggestions in this view. Pick an account and click Scan for Optimization.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Seller SKU</th>
                <th className="px-3 py-2 font-medium">Original Title</th>
                <th className="px-3 py-2 font-medium">Suggested Title</th>
                <th className="px-3 py-2 font-medium">Reasoning</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {suggestions.map((row) => (
                <tr key={row.id} className="bg-[#0b1220] align-top">
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{row.seller_sku || "-"}</td>
                  <td className="max-w-60 px-3 py-2 text-slate-400">{row.original_title || "-"}</td>
                  <td className="max-w-60 px-3 py-2 text-slate-100">{row.suggested_title || "-"}</td>
                  <td className="max-w-72 px-3 py-2 text-slate-500">{row.reasoning || row.error_message || "-"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "pending" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Approve and publish to Daraz"
                          disabled={actingId === row.id}
                          onClick={() => handleApprove(row.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-900 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 disabled:opacity-50"
                        >
                          {actingId === row.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                          type="button"
                          title="Reject"
                          disabled={actingId === row.id}
                          onClick={() => handleReject(row.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900 disabled:opacity-50"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
