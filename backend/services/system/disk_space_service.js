const { exec } = require("child_process");
const os = require("os");
const util = require("util");

const execAsync = util.promisify(exec);

const PM2_PROCESS_NAME = "central_management";

// Every app sharing this VPS, and the domain(s) nginx routes to it - hand
// maintained from /etc/nginx/sites-enabled/*, since that mapping changes
// far less often than process health stats do. A pm2 process not listed
// here still shows up (as "Unlisted"), it just has no domain(s) attached.
const KNOWN_PROJECTS = {
  central_management: { label: "Central Management System", domains: ["backend.teckvora.com", "system.teckvora.com"] },
  "brighthub-ecommerce-api": { label: "BrightHub Ecommerce", domains: ["brighthub.lk", "www.brighthub.lk", "admin.brighthub.lk"] },
  "teckvora-backend": { label: "Teckvora Website", domains: ["api.admin.teckvora.com", "admin.teckvora.com", "teckvora.com"] },
  "webmail-backend": { label: "Webmail", domains: ["mail.teckvora.com"] },
  "ebay-backend": { label: "eBay Department Management", domains: ["ebay.teckvora.com"] },
  "video-downloader-backend": { label: "Video Downloader", domains: ["video.teckvora.com"] },
  "todo-backend": { label: "Todo App", domains: ["todo.teckvora.com"] },
};

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

function mapPm2Process(proc) {
  const project = KNOWN_PROJECTS[proc.name];

  return {
    pid: proc.pid,
    name: proc.name,
    label: project?.label || proc.name,
    domains: project?.domains || [],
    status: proc.pm2_env.status,
    uptime_ms: proc.pm2_env.status === "online" ? Date.now() - proc.pm2_env.pm_uptime : 0,
    restarts: proc.pm2_env.restart_time,
    memory_bytes: proc.monit?.memory ?? 0,
    cpu_percent: proc.monit?.cpu ?? 0,
  };
}

// Every app currently running on this VPS (this one included), with the
// domain(s) it serves - so the page shows what's sharing the server, not
// just this app's own footprint.
async function getAllProcesses() {
  const { stdout } = await execAsync("pm2 jlist");
  const processes = JSON.parse(stdout);

  return processes.map(mapPm2Process).sort((a, b) => a.label.localeCompare(b.label));
}

module.exports = { getDiskSpace, getMemory, getCpu, getAllProcesses, PM2_PROCESS_NAME };
