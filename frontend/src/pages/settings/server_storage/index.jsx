import { useEffect, useState } from "react";
import { HardDrive, RefreshCw, AlertTriangle, Cpu, MemoryStick, Activity, Globe2, Server } from "lucide-react";
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

function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return "-";

  const minutes = Math.floor(value / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function barTone(percent) {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 75) return "bg-amber-400";
  return "bg-orange-500";
}

function toneForPercent(percent) {
  if (percent >= 90) return "text-red-400";
  if (percent >= 75) return "text-amber-300";
  return "text-emerald-300";
}

function StatCard({ label, value, tone = "text-slate-100" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a101d] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-[18px] font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function UsageBar({ icon: Icon, title, subtitle, percent, warningLabel }) {
  const safePercent = Math.min(Math.max(Number(percent) || 0, 0), 100);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a101d] p-4">
      <div className="mb-2 flex items-center justify-between text-[12px] text-slate-400">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Icon size={14} />
          {title}
        </span>
        <span>{subtitle}</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${barTone(safePercent)}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>

      {safePercent >= 90 && warningLabel && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-red-400">
          <AlertTriangle size={13} />
          {warningLabel}
        </p>
      )}
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
        err?.response?.data?.message || err?.friendlyMessage || "Failed to load server stats."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const disk = data?.disk;
  const memory = data?.memory;
  const cpu = data?.cpu;
  const proc = data?.process;
  const processes = data?.processes;

  const diskPercent = Math.min(Math.max(Number(disk?.use_percent) || 0, 0), 100);
  const memoryPercent = Math.min(Math.max(Number(memory?.use_percent) || 0, 0), 100);
  const cpuPercent = Math.min(Math.max(Number(cpu?.load_percent_1m) || 0, 0), 100);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
            <HardDrive size={20} />
            Server Storage
          </h1>
          <p className="text-[13px] text-slate-500">
            Live disk, memory and CPU usage on the server hosting this app, plus this app's own
            process health.
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
          <Loader label="Reading server stats..." minHeight="0" className="py-16" />
        </div>
      ) : disk ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Disk Total" value={formatBytes(disk.total_bytes)} tone="text-slate-100" />
            <StatCard label="Disk Used" value={formatBytes(disk.used_bytes)} tone="text-amber-300" />
            <StatCard label="Disk Available" value={formatBytes(disk.available_bytes)} tone="text-emerald-300" />
            <StatCard label="Disk Used %" value={`${diskPercent}%`} tone={toneForPercent(diskPercent)} />
          </div>

          <UsageBar
            icon={HardDrive}
            title={disk.mount_point || "/"}
            subtitle={`${formatBytes(disk.used_bytes)} of ${formatBytes(disk.total_bytes)} used`}
            percent={diskPercent}
            warningLabel="Disk space is critically low — free up space soon."
          />

          {memory && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="RAM Total" value={formatBytes(memory.total_bytes)} tone="text-slate-100" />
                <StatCard label="RAM Used" value={formatBytes(memory.used_bytes)} tone="text-amber-300" />
                <StatCard label="RAM Available" value={formatBytes(memory.available_bytes)} tone="text-emerald-300" />
                <StatCard label="RAM Used %" value={`${memoryPercent}%`} tone={toneForPercent(memoryPercent)} />
              </div>

              <UsageBar
                icon={MemoryStick}
                title="Memory"
                subtitle={`${formatBytes(memory.used_bytes)} of ${formatBytes(memory.total_bytes)} used`}
                percent={memoryPercent}
                warningLabel="Memory usage is critically high — check for runaway processes."
              />
            </>
          )}

          {cpu && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard label="CPU Cores" value={cpu.cores} tone="text-slate-100" />
                <StatCard label="Load (1m)" value={cpu.load_1m.toFixed(2)} tone="text-amber-300" />
                <StatCard label="Load (5m / 15m)" value={`${cpu.load_5m.toFixed(2)} / ${cpu.load_15m.toFixed(2)}`} tone="text-slate-100" />
                <StatCard label="Load %" value={`${cpuPercent}%`} tone={toneForPercent(cpuPercent)} />
              </div>

              <UsageBar
                icon={Cpu}
                title="CPU Load (1 min avg)"
                subtitle={`${cpu.load_1m.toFixed(2)} / ${cpu.cores} cores`}
                percent={cpuPercent}
                warningLabel="CPU load is critically high — the server may be struggling to keep up."
              />
            </>
          )}

          {proc && (
            <div className="rounded-lg border border-slate-800 bg-[#0a101d] p-4">
              <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-slate-200">
                <Activity size={14} />
                This App ({proc.name})
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard
                  label="Status"
                  value={proc.status}
                  tone={proc.status === "online" ? "text-emerald-300" : "text-red-400"}
                />
                <StatCard label="Uptime" value={formatDuration(proc.uptime_ms)} tone="text-slate-100" />
                <StatCard label="Restarts" value={proc.restarts} tone={proc.restarts > 20 ? "text-amber-300" : "text-slate-100"} />
                <StatCard label="Memory / CPU" value={`${formatBytes(proc.memory_bytes)} / ${proc.cpu_percent}%`} tone="text-slate-100" />
              </div>
            </div>
          )}

          {Array.isArray(processes) && processes.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-[#0a101d] p-4">
              <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-slate-200">
                <Server size={14} />
                Running Projects on This Server ({processes.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-180 border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2 font-medium">Project</th>
                      <th className="px-2 py-2 font-medium">Domain(s)</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Uptime</th>
                      <th className="px-2 py-2 font-medium">Restarts</th>
                      <th className="px-2 py-2 font-medium">Memory / CPU</th>
                      <th className="px-2 py-2 font-medium">Storage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((p) => (
                      <tr
                        key={p.pid || p.name}
                        className={`border-b border-slate-900 last:border-0 ${
                          p.name === proc?.name ? "bg-[#101c33]" : ""
                        }`}
                      >
                        <td className="px-2 py-2 font-semibold text-slate-200">
                          {p.label}
                          {p.name === proc?.name && (
                            <span className="ml-1.5 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">
                              this app
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-slate-400">
                          {p.domains.length > 0 ? (
                            <span className="flex flex-wrap items-center gap-1">
                              {p.domains.map((domain) => (
                                <span key={domain} className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">
                                  <Globe2 size={10} />
                                  {domain}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                              p.status === "online"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-300">{formatDuration(p.uptime_ms)}</td>
                        <td className="px-2 py-2 text-slate-300">{p.restarts}</td>
                        <td className="px-2 py-2 text-slate-300">
                          {formatBytes(p.memory_bytes)} / {p.cpu_percent}%
                        </td>
                        <td className="px-2 py-2 text-slate-300">
                          {p.disk_bytes != null ? formatBytes(p.disk_bytes) : <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-[#0b1220] px-4 py-10 text-center text-[13px] text-slate-500">
          No server stats available.
        </div>
      )}
    </div>
  );
}
