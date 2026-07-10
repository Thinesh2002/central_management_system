import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Monitor,
  RefreshCcw,
  ShieldAlert,
  Boxes,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import api, { getApiError } from "../../config/api";
import { darazProductsApi } from "../../config/sub_api/daraz_api/daraz_products_api";

const TABS = [
  { key: "all", label: "All Logs", icon: ClipboardList },
  { key: "inventory", label: "Inventory Logs", icon: Boxes },
  { key: "title_optimizer", label: "Title Optimizer Logs", icon: Sparkles },
  { key: "system", label: "System Logs", icon: Monitor },
  { key: "sync", label: "Sync Logs", icon: RotateCcw },
];

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.logs)) return value.logs;
  if (Array.isArray(value?.loginLogs)) return value.loginLogs;
  if (Array.isArray(value?.login_logs)) return value.login_logs;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

function isInventoryRow(row) {
  const module = String(row.module || "").toLowerCase();
  return module.includes("inventory") || module.includes("price");
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "success") {
    return "border-emerald-900 bg-emerald-950 text-emerald-300";
  }

  if (value === "blocked" || value === "running") {
    return "border-amber-900 bg-amber-950 text-amber-300";
  }

  return "border-red-900 bg-red-950 text-red-300";
}

function statusIcon(status) {
  const value = String(status || "").toLowerCase();
  if (value === "success") return <CheckCircle2 size={13} />;
  if (value === "blocked") return <ShieldAlert size={13} />;
  return <AlertTriangle size={13} />;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function SystemLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Type", "User ID", "Email", "Action", "Status", "Reason", "IP", "Message / Browser"].map(
              (header) => (
                <th
                  key={header}
                  className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400"
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {rows.map((log, index) => {
            const status = log.status || log.login_status || "failed";

            return (
              <tr key={log.row_id || log.id || index} className="hover:bg-slate-800/70">
                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                  {formatDate(log.created_at || log.createdAt)}
                </td>

                <td className="px-3 py-2.5 text-[12px] capitalize text-slate-300">
                  {log.log_type || log.module || "login"}
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold text-white">
                  {log.login_user_id || log.user_uid || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                  {log.email || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] font-semibold text-white">
                  {log.action || "login"}
                </td>

                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(status)}`}
                  >
                    {statusIcon(status)}
                    {status}
                  </span>
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                  {log.failure_reason || "-"}
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                  {log.ip_address || "-"}
                </td>

                <td className="min-w-[280px] px-3 py-2.5 text-[12px] text-slate-300" title={log.user_agent || ""}>
                  <div className="max-w-[420px] truncate">
                    {log.message || log.user_agent || "-"}
                  </div>
                  {log.user_agent && (
                    <p className="mt-0.5 max-w-[420px] truncate text-[11px] text-slate-500">
                      {log.user_agent}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}

          {!rows.length && (
            <tr>
              <td colSpan="9" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading logs..." : "No logs found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SyncLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Run ID", "Account", "Type", "Status", "Found", "Saved", "Failed", "Started", "Finished", "Error"].map(
              (header) => (
                <th
                  key={header}
                  className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400"
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {rows.map((run) => (
            <tr key={run.id} className="hover:bg-slate-800/70">
              <td className="px-3 py-2.5 text-[12px] font-semibold text-white">{run.id}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{run.account_id}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{run.sync_type || "-"}</td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(run.status)}`}
                >
                  {statusIcon(run.status)}
                  {run.status || "unknown"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{run.total_found || 0}</td>
              <td className="px-3 py-2.5 text-[12px] text-emerald-300">{run.total_saved || 0}</td>
              <td className="px-3 py-2.5 text-[12px] text-red-300">{run.total_failed || 0}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-400">
                {formatDate(run.started_at)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-400">
                {formatDate(run.finished_at)}
              </td>
              <td className="max-w-[280px] px-3 py-2.5">
                <div className="line-clamp-2 text-[11px] text-red-300">
                  {run.error_message || "-"}
                </div>
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="10" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading sync logs..." : "No sync logs found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrderInventoryLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Source", "Order", "SKU", "Qty", "Stock Change", "Status", "Message"].map((header) => (
              <th key={header} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-800/70">
              <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                {formatDate(row.created_at)}
              </td>
              <td className="px-3 py-2.5 text-[12px] capitalize text-slate-300">{row.source}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{row.source_order_id || "-"}</td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-slate-200">{row.sku || "-"}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{row.qty ?? "-"}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">
                {row.old_stock_qty ?? row.new_stock_qty ? `${row.old_stock_qty ?? "-"} → ${row.new_stock_qty ?? "-"}` : "-"}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    row.status === "success"
                      ? "border-emerald-900 bg-emerald-950 text-emerald-300"
                      : row.status === "sku_missing"
                      ? "border-amber-900 bg-amber-950 text-amber-300"
                      : "border-red-900 bg-red-950 text-red-300"
                  }`}
                >
                  {row.status === "sku_missing" ? "SKU missing" : row.status}
                </span>
              </td>
              <td className="max-w-[320px] px-3 py-2.5">
                <span className="line-clamp-1 text-[11px] text-slate-400">{row.message || "-"}</span>
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="8" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading stock deduction logs..." : "No order stock deduction logs yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TitleOptimizerLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Event", "Account", "SKU", "Title Change", "Status", "Approved By", "Message"].map((header) => (
              <th key={header} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-800/70">
              <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                {formatDate(row.created_at)}
              </td>
              <td className="px-3 py-2.5 text-[12px] capitalize text-slate-300">
                {row.event_type === "scan_batch"
                  ? "Scan Batch"
                  : row.status === "rejected"
                  ? "Title Rejected"
                  : "Title Applied"}
              </td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{row.account_name || row.account_id || "-"}</td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-slate-200">{row.seller_sku || "-"}</td>
              <td className="max-w-95 px-3 py-2.5 text-[12px] text-slate-400">
                {row.event_type === "scan_batch" ? (
                  <span>
                    {row.succeeded ?? 0} of {row.total ?? 0} generated{row.failed ? `, ${row.failed} failed` : ""}
                  </span>
                ) : (
                  <span className="line-clamp-1">
                    {row.old_title || "-"} → {row.new_title || "-"}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    row.status === "success"
                      ? "border-emerald-900 bg-emerald-950 text-emerald-300"
                      : row.status === "rejected"
                      ? "border-amber-900 bg-amber-950 text-amber-300"
                      : "border-red-900 bg-red-950 text-red-300"
                  }`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{row.reviewed_by_name || "-"}</td>
              <td className="max-w-70 px-3 py-2.5">
                <span className="line-clamp-1 text-[11px] text-slate-400">{row.message || "-"}</span>
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="8" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading title optimizer logs..." : "No title optimizer activity yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AllLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Source", "Type", "Title", "Detail", "Status"].map((header) => (
              <th key={header} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-800/70">
              <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-slate-300">
                {formatDate(row.date)}
              </td>
              <td className="px-3 py-2.5 text-[12px] font-semibold text-white">{row.source}</td>
              <td className="px-3 py-2.5 text-[12px] capitalize text-slate-300">{row.type}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-200">{row.title}</td>
              <td className="max-w-[380px] px-3 py-2.5 text-[12px] text-slate-400">
                <span className="line-clamp-1">{row.detail}</span>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(row.status)}`}
                >
                  {statusIcon(row.status)}
                  {row.status}
                </span>
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="6" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading logs..." : "No logs found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");

  const [syncRuns, setSyncRuns] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);

  const [orderInventoryLogs, setOrderInventoryLogs] = useState([]);
  const [orderInventoryLoading, setOrderInventoryLoading] = useState(false);

  const [titleOptimizerLogs, setTitleOptimizerLogs] = useState([]);
  const [titleOptimizerLoading, setTitleOptimizerLoading] = useState(false);

  async function loadOrderInventoryLogs() {
    setOrderInventoryLoading(true);

    try {
      const { data } = await api.get("/logs/inventory?limit=200");
      setOrderInventoryLogs(toArray(data));
    } catch {
      setOrderInventoryLogs([]);
    } finally {
      setOrderInventoryLoading(false);
    }
  }

  async function loadTitleOptimizerLogs() {
    setTitleOptimizerLoading(true);

    try {
      const { data } = await api.get("/logs/title-optimizer?limit=200");
      setTitleOptimizerLogs(toArray(data));
    } catch {
      setTitleOptimizerLogs([]);
    } finally {
      setTitleOptimizerLoading(false);
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    setLogsError("");

    try {
      const { data } = await api.get("/logs?limit=150");
      setLogs(toArray(data));
    } catch (err) {
      setLogs([]);
      setLogsError(getApiError(err));
    } finally {
      setLogsLoading(false);
    }
  }

  async function loadSyncRuns() {
    setSyncLoading(true);

    try {
      const res = await darazProductsApi.runs({ limit: 100 });
      setSyncRuns(res?.data?.data || []);
    } catch {
      setSyncRuns([]);
    } finally {
      setSyncLoading(false);
    }
  }

  function refreshActiveTab() {
    if (activeTab === "sync") {
      loadSyncRuns();
      return;
    }

    if (activeTab === "title_optimizer") {
      loadTitleOptimizerLogs();
      return;
    }

    if (activeTab === "inventory") {
      loadOrderInventoryLogs();
    }

    loadLogs();
    if (activeTab === "all") loadSyncRuns();
  }

  useEffect(() => {
    loadLogs();
    loadSyncRuns();
    loadOrderInventoryLogs();
    loadTitleOptimizerLogs();
  }, []);

  const inventoryLogs = useMemo(() => logs.filter(isInventoryRow), [logs]);

  const unifiedRows = useMemo(() => {
    const fromLogs = logs.map((row, index) => ({
      id: `log-${row.row_id || row.id || index}`,
      date: row.created_at || row.createdAt,
      source: "System",
      type: row.log_type || row.module || "system",
      title: row.action || "Login",
      detail: row.email || row.login_user_id || row.message || "-",
      status: row.status || row.login_status || "failed",
    }));

    const fromSync = syncRuns.map((row) => ({
      id: `sync-${row.id}`,
      date: row.started_at,
      source: "Daraz Sync",
      type: row.sync_type || "sync",
      title: `Account ${row.account_id} sync`,
      detail: `Found ${row.total_found || 0} / Saved ${row.total_saved || 0} / Failed ${row.total_failed || 0}`,
      status: row.status || "unknown",
    }));

    return [...fromLogs, ...fromSync].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [logs, syncRuns]);

  const loading = activeTab === "sync" ? syncLoading : logsLoading;

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Monitor size={18} className="text-blue-400" />
              <h2 className="text-lg font-bold text-white">Logs</h2>
            </div>

            <p className="mt-0.5 text-[12px] text-slate-400">
              Login, system, inventory and Daraz sync activity in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshActiveTab}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-[11px] font-semibold transition ${
                  isActive
                    ? "border-blue-500 bg-blue-500/15 text-blue-300"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {logsError && (
        <div className="mx-4 mt-4 rounded-md border border-red-800 bg-red-950 px-3 py-2 text-[12px] font-semibold text-red-300">
          {logsError}
        </div>
      )}

      <div className="w-full space-y-4 p-4">
        {activeTab === "inventory" && (
          <div className="overflow-hidden border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-4 py-3">
              <h3 className="text-[13px] font-bold text-white">Order Stock Deductions</h3>
              <p className="text-[11px] text-slate-400">
                Stock deducted automatically when a new order item is synced in, including "SKU is missing" cases.
                Showing {orderInventoryLogs.length} records.
              </p>
            </div>

            <OrderInventoryLogsTable rows={orderInventoryLogs} loading={orderInventoryLoading} />
          </div>
        )}

        <div className="overflow-hidden border border-slate-800 bg-slate-900">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-[13px] font-bold text-white">
                {activeTab === "inventory" ? "Inventory / Price Activity" : TABS.find((tab) => tab.key === activeTab)?.label}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeTab === "all" && `Showing ${unifiedRows.length} combined records.`}
                {activeTab === "inventory" && `Showing ${inventoryLogs.length} inventory/price records.`}
                {activeTab === "title_optimizer" && `Showing ${titleOptimizerLogs.length} scan and title-change records.`}
                {activeTab === "system" && `Showing latest ${logs.length} log records.`}
                {activeTab === "sync" && `Showing latest ${syncRuns.length} Daraz sync runs.`}
              </p>
            </div>
          </div>

          {activeTab === "all" && <AllLogsTable rows={unifiedRows} loading={logsLoading || syncLoading} />}
          {activeTab === "inventory" && <SystemLogsTable rows={inventoryLogs} loading={logsLoading} />}
          {activeTab === "title_optimizer" && (
            <TitleOptimizerLogsTable rows={titleOptimizerLogs} loading={titleOptimizerLoading} />
          )}
          {activeTab === "system" && <SystemLogsTable rows={logs} loading={logsLoading} />}
          {activeTab === "sync" && <SyncLogsTable rows={syncRuns} loading={syncLoading} />}
        </div>
      </div>
    </div>
  );
}
