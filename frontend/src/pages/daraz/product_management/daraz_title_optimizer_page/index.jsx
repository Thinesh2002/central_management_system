import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, Search, Sparkles, X } from "lucide-react";

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

function ImageZoomModal({ image, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-155 flex-col overflow-hidden border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <h3 className="truncate text-[15px] font-semibold text-white">Product Image</h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex justify-center bg-[#0b1220] px-4 py-4">
          <div className="flex max-h-[65vh] w-full items-center justify-center overflow-hidden border border-purple-500/40 bg-white p-3">
            <img src={image.src} alt={image.title || ""} className="max-h-[60vh] max-w-full object-contain" />
          </div>
        </div>

        <div className="px-4 pb-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Image URL</p>
          <a
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            title={image.src}
            className="break-all text-xs font-medium leading-5 text-orange-300 hover:text-orange-200 hover:underline"
          >
            {image.src}
          </a>
        </div>
      </div>
    </div>
  );
}

function ScanModal({ accounts, onClose, onDone }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [limit, setLimit] = useState(50);
  const [staleOnly, setStaleOnly] = useState(false);
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

  async function runScan() {
    if (!selectedIds.length) {
      setError("Select at least one account.");
      return;
    }

    setRunning(true);
    setError("");
    setResults([]);

    const outcomes = [];

    for (const accountId of selectedIds) {
      const account = accounts.find((row) => String(getAccountId(row)) === String(accountId));
      const accountName = account ? getAccountName(account) : `#${accountId}`;

      try {
        const res = await darazTitleOptimizerApi.scan({
          accountId,
          limit: Number(limit) || 50,
          mode: staleOnly ? "stale" : "manual",
        });
        const result = res?.data?.data;
        outcomes.push({
          account: accountName,
          success: true,
          message: `${result?.succeeded ?? 0} of ${result?.total ?? 0} suggestions generated${
            result?.failed ? `, ${result.failed} failed` : ""
          }`,
        });
      } catch (err) {
        outcomes.push({ account: accountName, success: false, message: getApiError(err, "Failed") });
      }
    }

    setResults(outcomes);
    setRunning(false);
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
            <h3 className="text-[14px] font-semibold text-white">Scan for Title Optimization</h3>
            <p className="text-[11px] text-purple-200/80">Pick one or more Daraz accounts to scan.</p>
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

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-slate-300">
              Products per account
              <input
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="h-8 w-16 rounded-md border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200 outline-none"
              />
            </label>

            <label className="flex items-center gap-1.5 text-[12px] text-slate-200">
              <input
                type="checkbox"
                checked={staleOnly}
                onChange={(e) => setStaleOnly(e.target.checked)}
                className="accent-orange-500"
              />
              Only stale listings (no sales in last 30 days)
            </label>
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
                  {row.account}: {row.message}
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
            onClick={runScan}
            disabled={running}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {running ? "Scanning..." : "Run Scan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DarazTitleOptimizerPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");

  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [pageLimit, setPageLimit] = useState(PAGE_SIZE);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  const [error, setError] = useState("");

  const accountNameById = useMemo(() => {
    const map = new Map();
    accounts.forEach((account) => map.set(String(getAccountId(account)), getAccountName(account)));
    return map;
  }, [accounts]);

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
      const res = await darazTitleOptimizerApi.listSuggestions({
        account_id: accountId || undefined,
        status: status || undefined,
        limit: limitOverride || pageLimit,
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
      const haystack = [
        row.seller_sku,
        row.correct_sku,
        row.original_title,
        row.suggested_title,
        row.daraz_item_id,
        row.daraz_product_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [suggestions, search]);

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
            <option value="">All Accounts</option>
            {accounts.map((account) => (
              <option key={getAccountId(account)} value={getAccountId(account)}>
                {getAccountName(account)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setScanModalOpen(true)}
            disabled={!accounts.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-[11px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={12} />
            Scan for Optimization
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-55 max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, title..."
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-7 pr-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
        {search && (
          <span className="text-[11px] text-slate-500">
            {filteredSuggestions.length} of {suggestions.length} shown
          </span>
        )}
      </div>

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
      ) : !filteredSuggestions.length ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-10 text-center text-[13px] text-slate-500">
          {search ? "No suggestions match your search." : "No suggestions in this view. Click Scan for Optimization to generate some."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Image</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Product ID</th>
                <th className="px-3 py-2 font-medium">Daraz SKU</th>
                <th className="px-3 py-2 font-medium">Correct SKU</th>
                <th className="px-3 py-2 font-medium">Original Title</th>
                <th className="px-3 py-2 font-medium">Suggested Title</th>
                <th className="px-3 py-2 font-medium">Reasoning</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSuggestions.map((row) => (
                <tr key={row.id} className="bg-[#0b1220] align-top">
                  <td className="px-3 py-2">
                    {row.product_image ? (
                      <button
                        type="button"
                        onClick={() => setZoomImage({ src: row.product_image, title: row.suggested_title || row.original_title })}
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-800 bg-slate-950 hover:border-orange-400/50"
                        title="Click to zoom"
                      >
                        <img src={row.product_image} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="h-10 w-10 rounded-md border border-slate-800 bg-slate-900" />
                    )}
                  </td>
                  <td className="max-w-32 px-3 py-2 text-[11px] text-slate-300">
                    {accountNameById.get(String(row.account_id)) || `#${row.account_id}`}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{row.daraz_product_id || row.daraz_item_id || "-"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{row.seller_sku || "-"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-orange-300">{row.correct_sku || "-"}</td>
                  <td className="max-w-60 px-3 py-2 text-slate-400">{row.original_title || "-"}</td>
                  <td className="max-w-60 px-3 py-2 text-slate-100">{row.suggested_title || "-"}</td>
                  <td className="max-w-72 px-3 py-2 text-slate-500">
                    {row.status === "failed" ? row.error_message || row.reasoning || "-" : row.reasoning || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "pending" || (row.status === "failed" && row.suggested_title) ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title={row.status === "failed" ? "Retry: approve and publish to Daraz" : "Approve and publish to Daraz"}
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
          onClose={() => setScanModalOpen(false)}
          onDone={() => {
            setStatus("pending");
            loadSuggestions();
          }}
        />
      )}

      {zoomImage && <ImageZoomModal image={zoomImage} onClose={() => setZoomImage(null)} />}
    </div>
  );
}
