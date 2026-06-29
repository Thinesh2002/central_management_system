import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { darazProductsApi } from "../../../config/sub_api/daraz_api/daraz_products_api";

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatusText({ status }) {
  const value = status || "unknown";
  const lower = String(value).toLowerCase();

  const className =
    lower === "success"
      ? "text-emerald-300"
      : lower === "failed"
      ? "text-red-300"
      : lower === "running"
      ? "text-yellow-300"
      : "text-slate-300";

  return <span className={`text-xs font-semibold ${className}`}>{value}</span>;
}

export default function DarazProductLogsPage() {
  const [accountId, setAccountId] = useState("2");
  const [status, setStatus] = useState("all");
  const [syncType, setSyncType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState("100");

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRuns() {
    try {
      setLoading(true);
      setMessage("");

      const res = await darazProductsApi.runs({
        account_id: accountId || undefined,
        status: status !== "all" ? status : undefined,
        sync_type: syncType !== "all" ? syncType : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit,
      });

      setRuns(res?.data?.data || []);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load Daraz logs."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setStatus("all");
    setSyncType("all");
    setDateFrom("");
    setDateTo("");
    setLimit("100");
  }

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <div className="w-full p-4 text-slate-100">
      <div className="space-y-4">

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/product/daraz-products"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
              >
                <ArrowLeft size={15} />
              </Link>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500 text-slate-950">
                <Clock size={17} />
              </div>

              <div>
                <h1 className="text-base font-semibold text-white">
                  Daraz Sync Logs
                </h1>
                <p className="text-xs text-slate-400">
                  Product sync history, status, saved count and failed count.
                </p>
              </div>
            </div>

            <button
              onClick={loadRuns}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-yellow-500 px-3 text-xs font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh
            </button>
          </div>

          {message && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Account ID"
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-yellow-500"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-yellow-500"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={syncType}
              onChange={(e) => setSyncType(e.target.value)}
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-yellow-500"
            >
              <option value="all">All Sync Type</option>
              <option value="manual">Manual</option>
              <option value="auto">Auto</option>
              <option value="scheduled">Scheduled</option>
            </select>

            <input
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-yellow-500"
            />

            <input
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-yellow-500"
            />

            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-yellow-500"
            >
              <option value="50">50 Rows</option>
              <option value="100">100 Rows</option>
              <option value="200">200 Rows</option>
              <option value="500">500 Rows</option>
            </select>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-medium text-slate-300 hover:border-red-400 hover:text-red-300"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              onClick={loadRuns}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Search
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Sync Log Table
              </h2>
              <p className="text-xs text-slate-400">
                Showing {runs.length} log records
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Run ID</th>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Found</th>
                  <th className="px-3 py-2">Saved</th>
                  <th className="px-3 py-2">Failed</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Finished</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>

              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-slate-800 text-xs text-slate-300 hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 font-medium text-slate-100">
                      {run.id}
                    </td>

                    <td className="px-3 py-2">{run.account_id}</td>

                    <td className="px-3 py-2">{run.sync_type || "-"}</td>

                    <td className="px-3 py-2">
                      <StatusText status={run.status} />
                    </td>

                    <td className="px-3 py-2">{run.total_found || 0}</td>

                    <td className="px-3 py-2 text-emerald-300">
                      {run.total_saved || 0}
                    </td>

                    <td className="px-3 py-2 text-red-300">
                      {run.total_failed || 0}
                    </td>

                    <td className="px-3 py-2 text-slate-400">
                      {formatDate(run.started_at)}
                    </td>

                    <td className="px-3 py-2 text-slate-400">
                      {formatDate(run.finished_at)}
                    </td>

                    <td className="max-w-[340px] px-3 py-2">
                      <div className="line-clamp-2 text-[11px] text-red-300">
                        {run.error_message || "-"}
                      </div>
                    </td>
                  </tr>
                ))}

                {!runs.length && (
                  <tr>
                    <td
                      className="px-3 py-8 text-center text-xs text-slate-500"
                      colSpan="10"
                    >
                      {loading ? "Loading Daraz logs..." : "No logs found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}