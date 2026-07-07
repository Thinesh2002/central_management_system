import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Monitor,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import api, { getApiError } from "../../config/api";

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.logs)) return value.logs;
  if (Array.isArray(value?.loginLogs)) return value.loginLogs;
  if (Array.isArray(value?.login_logs)) return value.login_logs;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
}

function statusClass(status) {
  if (status === "success") {
    return "border-emerald-900 bg-emerald-950 text-emerald-300";
  }

  if (status === "blocked") {
    return "border-amber-900 bg-amber-950 text-amber-300";
  }

  return "border-red-900 bg-red-950 text-red-300";
}

function statusIcon(status) {
  if (status === "success") return <CheckCircle2 size={15} />;
  if (status === "blocked") return <ShieldAlert size={15} />;
  return <AlertTriangle size={15} />;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/logs?limit=150");
      setLogs(toArray(data));
    } catch (err) {
      setLogs([]);
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Monitor size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Logs</h2>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Login logs and system logs with User ID, email, IP address and
              browser details.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <div className="w-full p-5">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Login Activity</h3>
              <p className="text-sm text-slate-400">
                Showing latest 150 log records.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
              <Clock size={16} className="text-blue-400" />
              Total Logs:{" "}
              <span className="font-bold text-white">{safeLogs.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Login User ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Message / Browser
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {safeLogs.map((log, index) => {
                  const status = log.status || log.login_status || "failed";

                  return (
                    <tr
                      key={log.row_id || log.id || index}
                      className="hover:bg-slate-800/70"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {formatDate(log.created_at || log.createdAt)}
                      </td>

                      <td className="px-4 py-3 capitalize text-slate-300">
                        {log.log_type || "login"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                        {log.login_user_id || log.user_uid || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {log.email || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                        {log.action || "login"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            status
                          )}`}
                        >
                          {statusIcon(status)}
                          {status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {log.failure_reason || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {log.ip_address || "-"}
                      </td>

                      <td
                        className="min-w-[320px] px-4 py-3 text-slate-300"
                        title={log.user_agent || ""}
                      >
                        <div className="max-w-[520px] truncate">
                          {log.message || log.user_agent || "-"}
                        </div>

                        {log.user_agent && (
                          <p className="mt-1 max-w-[520px] truncate text-xs text-slate-500">
                            {log.user_agent}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!safeLogs.length && (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      {loading ? "Loading logs..." : "No logs found."}
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