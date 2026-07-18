import { useState } from "react";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import darazContentOptimizerApi from "../../../../../config/sub_api/daraz_api/daraz_content_optimizer_api";
import { getApiError } from "../../../../../config/api";

function getAccountId(account = {}) {
  return account.id || account.account_id;
}

function getAccountName(account = {}) {
  return account.account_name || account.account_code || `#${getAccountId(account)}`;
}

export default function ScanModal({ accounts, onClose, onDone, showToast }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [limit, setLimit] = useState(50);
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
        const res = await darazContentOptimizerApi.scan({
          accountId,
          limit: Number(limit) || 50,
        });
        const result = res?.data?.data;
        outcomes.push({
          account: accountName,
          success: true,
          message: `${result?.succeeded ?? 0} of ${result?.total ?? 0} product(s) analyzed${
            result?.failed ? `, ${result.failed} failed` : ""
          }`,
        });
      } catch (err) {
        outcomes.push({ account: accountName, success: false, message: getApiError(err, "Failed") });
      }
    }

    setResults(outcomes);
    setRunning(false);

    const failedCount = outcomes.filter((row) => !row.success).length;
    showToast(
      failedCount
        ? `Analysis finished with ${failedCount} account failure(s). See results below.`
        : "Analysis completed successfully.",
      { type: failedCount ? "error" : "success" }
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
            <h3 className="text-[14px] font-semibold text-white">Run AI Content Analysis</h3>
            <p className="text-[11px] text-purple-200/80">Pick one or more Daraz accounts to analyze.</p>
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
          </div>

          <p className="mb-3 text-[11px] text-slate-500">
            Products that already sold in the last 30 days are skipped automatically — analysis only runs on listings
            that still need help.
          </p>

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
            {running ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}
