import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Monitor,
  Play,
  RefreshCcw,
  ShieldAlert,
  Boxes,
  RotateCcw,
  Sparkles,
  Webhook,
  X,
} from "lucide-react";
import api, { getApiError } from "../../config/api";
import { darazProductsApi } from "../../config/sub_api/daraz_api/daraz_products_api";
import darazTitleOptimizerApi from "../../config/sub_api/daraz_api/daraz_title_optimizer_api";
import darazPriceReconciliationApi from "../../config/sub_api/daraz_api/daraz_price_reconciliation_api";
import { useToast } from "../../components/common/toast/ToastProvider";
import { useIsMasterAdmin } from "../../components/common/permissions/PermissionsProvider";

const TABS = [
  { key: "all", label: "All Logs", icon: ClipboardList },
  { key: "inventory", label: "Inventory Logs", icon: Boxes },
  { key: "title_optimizer", label: "Title Optimizer Logs", icon: Sparkles },
  { key: "price_reconciliation", label: "Price Reconciliation", icon: DollarSign },
  { key: "daraz_webhooks", label: "Daraz Webhooks", icon: Webhook },
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

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function PriceReconciliationLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Account", "SKU", "Price Change", "Status", "Message"].map((header) => (
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
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{row.account_code || row.account_id || "-"}</td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-slate-200">{row.seller_sku || "-"}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">
                {formatMoney(row.old_price)} → {formatMoney(row.new_price)}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    row.sync_status === "success"
                      ? "border-emerald-900 bg-emerald-950 text-emerald-300"
                      : "border-red-900 bg-red-950 text-red-300"
                  }`}
                >
                  {row.sync_status}
                </span>
              </td>
              <td className="max-w-[320px] px-3 py-2.5">
                <span className="line-clamp-1 text-[11px] text-slate-400">
                  {row.message || row.error_message || "-"}
                </span>
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="6" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading price reconciliation logs..." : "No price corrections logged yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function webhookStatusClass(status) {
  if (status === "processed") return "border-emerald-900 bg-emerald-950 text-emerald-300";
  if (status === "received") return "border-slate-700 bg-slate-800/60 text-slate-400";
  return "border-red-900 bg-red-950 text-red-300";
}

function DarazWebhookLogsTable({ rows, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Order ID", "Account", "Signature", "Status", "Message"].map((header) => (
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
              <td className="px-3 py-2.5 font-mono text-[12px] text-slate-200">{row.order_id || "-"}</td>
              <td className="px-3 py-2.5 text-[12px] text-slate-300">{row.account_id || "-"}</td>
              <td className="px-3 py-2.5 text-[12px]">
                {row.signature_valid === null ? (
                  <span className="text-slate-500">-</span>
                ) : row.signature_valid ? (
                  <span className="text-emerald-400">Valid</span>
                ) : (
                  <span className="text-red-400">Invalid</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${webhookStatusClass(row.status)}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="max-w-[320px] px-3 py-2.5">
                <span className="line-clamp-1 text-[11px] text-slate-400">{row.message || "-"}</span>
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="6" className="px-3 py-10 text-center text-[12px] text-slate-400">
                {loading ? "Loading webhook logs..." : "No webhook calls received yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TitleImpactModal({ logId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await darazTitleOptimizerApi.getImpact(logId);
        if (!cancelled) setImpact(res?.data?.data || null);
      } catch (err) {
        if (!cancelled) setError(getApiError(err, "Failed to load impact data"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [logId]);

  const unitsDelta = impact ? impact.after.units - impact.before.units : 0;
  const revenueDelta = impact ? impact.after.revenue - impact.before.revenue : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden border border-slate-700 bg-[#111827] shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#653bb3] px-4 py-3">
          <h3 className="text-[15px] font-semibold text-white">Title Change Impact</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-4">
          {loading && <p className="py-8 text-center text-[13px] text-slate-400">Loading sales data...</p>}
          {error && <p className="text-[13px] text-red-300">{error}</p>}

          {!loading && !error && impact && (
            <>
              <div className="mb-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">SKU: {impact.seller_sku}</p>
                <p className="text-[12px] text-slate-400 line-clamp-1">
                  {impact.old_title} → <span className="text-slate-100">{impact.new_title}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Changed {formatDate(impact.changed_at)} · {impact.days_elapsed_since_change} day(s) ago
                  {!impact.after_window_complete && " (still within the 30-day comparison window)"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-800 bg-[#0b1220] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Before (prior {impact.window_days}d)
                  </p>
                  <p className="mt-1 text-[18px] font-bold text-white">{impact.before.units} units</p>
                  <p className="text-[12px] text-slate-400">Rs. {formatMoney(impact.before.revenue)}</p>
                </div>

                <div className="rounded-md border border-slate-800 bg-[#0b1220] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    After ({impact.after_window_complete ? impact.window_days : impact.days_elapsed_since_change}d so far)
                  </p>
                  <p className="mt-1 text-[18px] font-bold text-white">{impact.after.units} units</p>
                  <p className="text-[12px] text-slate-400">Rs. {formatMoney(impact.after.revenue)}</p>
                </div>
              </div>

              <div
                className={`mt-3 rounded-md border px-3 py-2 text-[12px] font-semibold ${
                  unitsDelta >= 0
                    ? "border-emerald-900 bg-emerald-950 text-emerald-300"
                    : "border-red-900 bg-red-950 text-red-300"
                }`}
              >
                {unitsDelta >= 0 ? "+" : ""}
                {unitsDelta} units, {revenueDelta >= 0 ? "+" : ""}Rs. {formatMoney(revenueDelta)} revenue vs. before
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TitleOptimizerLogsTable({ rows, loading, onViewImpact }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            {["Date", "Event", "Account", "SKU", "Title Change", "Status", "Approved By", "Message", "Impact"].map(
              (header) => (
                <th key={header} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">
                  {header}
                </th>
              )
            )}
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
              <td className="px-3 py-2.5">
                {row.event_type === "title_applied" && row.status === "success" ? (
                  <button
                    type="button"
                    onClick={() => onViewImpact(row.id)}
                    className="h-7 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    View Impact
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-600">-</span>
                )}
              </td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan="9" className="px-3 py-10 text-center text-[12px] text-slate-400">
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
  const showToast = useToast();
  const isMasterAdmin = useIsMasterAdmin();
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
  const [impactLogId, setImpactLogId] = useState(null);

  const [priceReconciliationLogs, setPriceReconciliationLogs] = useState([]);
  const [priceReconciliationLoading, setPriceReconciliationLoading] = useState(false);
  const [runningReconciliation, setRunningReconciliation] = useState(false);

  const [darazWebhookLogs, setDarazWebhookLogs] = useState([]);
  const [darazWebhookLoading, setDarazWebhookLoading] = useState(false);

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

  async function loadPriceReconciliationLogs() {
    setPriceReconciliationLoading(true);

    try {
      const { data } = await api.get("/logs/price-reconciliation?limit=200");
      setPriceReconciliationLogs(toArray(data));
    } catch {
      setPriceReconciliationLogs([]);
    } finally {
      setPriceReconciliationLoading(false);
    }
  }

  async function runPriceReconciliationNow() {
    setRunningReconciliation(true);

    try {
      const res = await darazPriceReconciliationApi.run();
      const result = res?.data?.data;
      showToast(
        result
          ? `Reconciliation complete: ${result.corrected} corrected, ${result.failed} failed out of ${result.listings_checked} checked.`
          : "Reconciliation complete.",
        { type: "success" }
      );
      await loadPriceReconciliationLogs();
    } catch (err) {
      showToast(getApiError(err, "Failed to run price reconciliation"), { type: "error" });
    } finally {
      setRunningReconciliation(false);
    }
  }

  async function loadDarazWebhookLogs() {
    setDarazWebhookLoading(true);

    try {
      const { data } = await api.get("/logs/daraz-webhooks?limit=200");
      setDarazWebhookLogs(toArray(data));
    } catch {
      setDarazWebhookLogs([]);
    } finally {
      setDarazWebhookLoading(false);
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

    if (activeTab === "price_reconciliation") {
      loadPriceReconciliationLogs();
      return;
    }

    if (activeTab === "daraz_webhooks") {
      loadDarazWebhookLogs();
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
    loadPriceReconciliationLogs();
    loadDarazWebhookLogs();
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

  const loading =
    activeTab === "sync"
      ? syncLoading
      : activeTab === "price_reconciliation"
      ? priceReconciliationLoading
      : activeTab === "daraz_webhooks"
      ? darazWebhookLoading
      : logsLoading;

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

          <div className="flex items-center gap-2">
            {activeTab === "price_reconciliation" && isMasterAdmin && (
              <button
                type="button"
                onClick={runPriceReconciliationNow}
                disabled={runningReconciliation}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play size={13} />
                {runningReconciliation ? "Running..." : "Run Now"}
              </button>
            )}

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
                {activeTab === "price_reconciliation" &&
                  `Showing ${priceReconciliationLogs.length} price correction records. Runs nightly at 01:00 Colombo, comparing internal Daraz target prices against Daraz's live cache and correcting drift.`}
                {activeTab === "daraz_webhooks" &&
                  `Showing ${darazWebhookLogs.length} inbound webhook calls. Every call is logged regardless of outcome so a signature or payload mismatch is diagnosable once the webhook URL is registered in Daraz's app console.`}
                {activeTab === "system" && `Showing latest ${logs.length} log records.`}
                {activeTab === "sync" && `Showing latest ${syncRuns.length} Daraz sync runs.`}
              </p>
            </div>
          </div>

          {activeTab === "all" && <AllLogsTable rows={unifiedRows} loading={logsLoading || syncLoading} />}
          {activeTab === "inventory" && <SystemLogsTable rows={inventoryLogs} loading={logsLoading} />}
          {activeTab === "title_optimizer" && (
            <TitleOptimizerLogsTable
              rows={titleOptimizerLogs}
              loading={titleOptimizerLoading}
              onViewImpact={setImpactLogId}
            />
          )}
          {activeTab === "price_reconciliation" && (
            <PriceReconciliationLogsTable rows={priceReconciliationLogs} loading={priceReconciliationLoading} />
          )}
          {activeTab === "daraz_webhooks" && (
            <DarazWebhookLogsTable rows={darazWebhookLogs} loading={darazWebhookLoading} />
          )}
          {activeTab === "system" && <SystemLogsTable rows={logs} loading={logsLoading} />}
          {activeTab === "sync" && <SyncLogsTable rows={syncRuns} loading={syncLoading} />}
        </div>
      </div>

      {impactLogId && <TitleImpactModal logId={impactLogId} onClose={() => setImpactLogId(null)} />}
    </div>
  );
}
