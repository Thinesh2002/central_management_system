const { exec } = require("child_process");
const os = require("os");
const util = require("util");

const execAsync = util.promisify(exec);

const PM2_PROCESS_NAME = "central_management";

// `df -B1` reports exact byte counts (no K/M/G rounding) for the root
// filesystem - that's the partition everything on this VPS (app, uploads,
// MySQL data) actually lives on, so it's the number that matters for
// "is the server about to run out of space".
async function getDiskSpace() {
  const { stdout } = await execAsync("df -B1 /");
  const lines = stdout.trim().split("\n");
  const dataLine = lines[lines.length - 1];
  const columns = dataLine.trim().split(/\s+/);

  const total = Number(columns[1]);
  const used = Number(columns[2]);
  const available = Number(columns[3]);
  const usePercent = Number(String(columns[4]).replace("%", ""));

  return {
    filesystem: columns[0],
    mount_point: columns[columns.length - 1],
    total_bytes: total,
    used_bytes: used,
    available_bytes: available,
    use_percent: Number.isFinite(usePercent) ? usePercent : total ? Math.round((used / total) * 100) : 0,
  };
}

// `free -b` reports exact byte counts including the "available" column,
// which (unlike totalmem/freemem from `os`) already accounts for reclaimable
// buffers/cache - the number that actually reflects what's free to use.
async function getMemory() {
  const { stdout } = await execAsync("free -b");
  const lines = stdout.trim().split("\n");
  const memLine = lines.find((line) => line.trim().startsWith("Mem:"));
  const columns = memLine.trim().split(/\s+/);

  const total = Number(columns[1]);
  const used = Number(columns[2]);
  const available = Number(columns[6] ?? columns[3]);

  return {
    total_bytes: total,
    used_bytes: used,
    available_bytes: available,
    use_percent: total ? Math.round(((total - available) / total) * 100) : 0,
  };
}

function getCpu() {
  const cores = os.cpus().length;
  const [load1, load5, load15] = os.loadavg();

  return {
    cores,
    load_1m: load1,
    load_5m: load5,
    load_15m: load15,
    load_percent_1m: cores ? Math.round((load1 / cores) * 100) : 0,
  };
}

// PM2 process stats for this app itself (uptime, restart count, its own
// memory/CPU share) - separate from system-wide disk/memory/CPU above.
async function getProcessStats() {
  const { stdout } = await execAsync("pm2 jlist");
  const processes = JSON.parse(stdout);
  const proc = processes.find((p) => p.name === PM2_PROCESS_NAME);

  if (!proc) {
    return null;
  }

  return {
    name: proc.name,
    status: proc.pm2_env.status,
    uptime_ms: proc.pm2_env.status === "online" ? Date.now() - proc.pm2_env.pm_uptime : 0,
    restarts: proc.pm2_env.restart_time,
    memory_bytes: proc.monit?.memory ?? 0,
    cpu_percent: proc.monit?.cpu ?? 0,
  };
}

module.exports = { getDiskSpace, getMemory, getCpu, getProcessStats };
