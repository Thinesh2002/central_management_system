import { useEffect, useState } from "react";
import { HardDrive, RefreshCw, AlertTriangle } from "lucide-react";
import diskSpaceApi from "../../../config/sub_api/system_api/disk_space_api";
import Loader from "../../../components/common/Loader";

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "-";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function barTone(percent) {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 75) return "bg-amber-400";
  return "bg-orange-500";
}

function StatCard({ label, value, tone = "text-slate-100" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a101d] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-[18px] font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function ServerStoragePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await diskSpaceApi.getDiskSpace();
      setData(res?.data?.data || null);
    } catch (err) {
      setData(null);
      setError(
        err?.response?.data?.message || err?.friendlyMessage || "Failed to load server disk space."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const percent = Math.min(Math.max(Number(data?.use_percent) || 0, 0), 100);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <HardDrive size={20} />
            Server Storage
          </h1>
          <p className="text-[13px] text-slate-500">
            Disk space on the server hosting this app — the root filesystem, where the app, uploads
            and database all live.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-[#0b1220]">
          <Loader label="Reading disk space..." minHeight="0" className="py-16" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Total Space" value={formatBytes(data.total_bytes)} tone="text-slate-100" />
            <StatCard label="Used" value={formatBytes(data.used_bytes)} tone="text-amber-300" />
            <StatCard label="Available" value={formatBytes(data.available_bytes)} tone="text-emerald-300" />
            <StatCard
              label="Used %"
              value={`${percent}%`}
              tone={percent >= 90 ? "text-red-400" : percent >= 75 ? "text-amber-300" : "text-emerald-300"}
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#0a101d] p-4">
            <div className="mb-2 flex items-center justify-between text-[12px] text-slate-400">
              <span>{data.mount_point || "/"}</span>
              <span>
                {formatBytes(data.used_bytes)} of {formatBytes(data.total_bytes)} used
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${barTone(percent)}`}
                style={{ width: `${percent}%` }}
              />
            </div>

            {percent >= 90 && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-red-400">
                <AlertTriangle size={13} />
                Disk space is critically low — free up space soon.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-[#0b1220] px-4 py-10 text-center text-[13px] text-slate-500">
          No disk space data available.
        </div>
      )}
    </div>
  );
}
