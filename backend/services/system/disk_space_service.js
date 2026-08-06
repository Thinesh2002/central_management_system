const { exec } = require("child_process");
const os = require("os");
const util = require("util");

const execAsync = util.promisify(exec);

const PM2_PROCESS_NAME = "central_management";

// Every app sharing this VPS, and the domain(s) nginx routes to it - hand
// maintained from /etc/nginx/sites-enabled/*, since that mapping changes
// far less often than process health stats do. A pm2 process not listed
// here still shows up (as "Unlisted"), it just has no domain(s) attached.
// `dir` is the project's folder name directly under /var/www - used to
// look up its on-disk storage footprint via `du`.
const KNOWN_PROJECTS = {
  central_management: { label: "Central Management System", domains: ["backend.teckvora.com", "system.teckvora.com"], dir: "central_management_system" },
  "brighthub-ecommerce-api": { label: "BrightHub Ecommerce", domains: ["brighthub.lk", "www.brighthub.lk", "admin.brighthub.lk"], dir: "brighthub-ecommerce" },
  "teckvora-backend": { label: "Teckvora Website", domains: ["api.admin.teckvora.com", "admin.teckvora.com", "teckvora.com"], dir: "teckvora_website" },
  "webmail-backend": { label: "Webmail", domains: ["mail.teckvora.com"], dir: "webmail" },
  "ebay-backend": { label: "eBay Department Management", domains: ["ebay.teckvora.com"], dir: "ebay_department_management" },
  "video-downloader-backend": { label: "Video Downloader", domains: ["video.teckvora.com"], dir: "video_downloader" },
  "todo-backend": { label: "Todo App", domains: ["todo.teckvora.com"], dir: "todo" },
};

// Sites nginx serves directly (static build, no pm2 process behind them) -
// keyed by their /var/www dir since there's no pm2 process name to key on.
// These get real live disk usage but no process/uptime/CPU stats, since
// there genuinely is no process to report those for.
const STATIC_ONLY_SITES = {
  thinesh_website: { label: "Thinesh Portfolio", domains: ["thinesh.teckvora.com"], dir: "thinesh_website" },
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

// Disk usage of every top-level /var/www project folder, in one `du` call
// (far cheaper than one `du` per project). Directories that don't exist
// under a project's KNOWN_PROJECTS `dir` simply won't have a match.
async function getProjectStorageByDir() {
  const { stdout } = await execAsync("du -sb /var/www/*/");
  const sizeByDir = {};

  stdout
    .trim()
    .split("\n")
    .forEach((line) => {
      const [bytes, path] = line.trim().split(/\s+/);
      const dir = path.replace(/\/+$/, "").split("/").pop();
      sizeByDir[dir] = Number(bytes);
    });

  return sizeByDir;
}

function mapPm2Process(proc, sizeByDir) {
  const project = KNOWN_PROJECTS[proc.name];

  return {
    pid: proc.pid,
    name: proc.name,
    label: project?.label || proc.name,
    domains: project?.domains || [],
    disk_bytes: project?.dir && sizeByDir ? sizeByDir[project.dir] ?? null : null,
    status: proc.pm2_env.status,
    uptime_ms: proc.pm2_env.status === "online" ? Date.now() - proc.pm2_env.pm_uptime : 0,
    restarts: proc.pm2_env.restart_time,
    memory_bytes: proc.monit?.memory ?? 0,
    cpu_percent: proc.monit?.cpu ?? 0,
  };
}

function mapStaticSite(dir, project, sizeByDir) {
  return {
    pid: null,
    name: dir,
    label: project.label,
    domains: project.domains,
    disk_bytes: sizeByDir ? sizeByDir[project.dir] ?? null : null,
    status: "static",
    uptime_ms: null,
    restarts: null,
    memory_bytes: null,
    cpu_percent: null,
  };
}

// Every app currently running on this VPS (this one included), with the
// domain(s) it serves and how much disk space its project folder is using -
// so the page shows what's sharing the server, not just this app's own
// footprint. Static-only sites (no pm2 process) are appended with real
// live disk usage but no process stats, since none exist for them.
async function getAllProcesses() {
  const [{ stdout }, sizeByDir] = await Promise.all([
    execAsync("pm2 jlist"),
    getProjectStorageByDir().catch(() => null),
  ]);
  const processes = JSON.parse(stdout).map((proc) => mapPm2Process(proc, sizeByDir));

  const staticSites = Object.entries(STATIC_ONLY_SITES).map(([dir, project]) =>
    mapStaticSite(dir, project, sizeByDir)
  );

  return [...processes, ...staticSites].sort((a, b) => a.label.localeCompare(b.label));
}

// Binary log files pile up under /var/lib/mysql (binlog.NNNNNN) with
// nothing to bound them until MySQL's own 30-day auto-expiry kicks in -
// this reports their real current footprint for the storage page.
async function getBinlogStorage() {
  try {
    const { stdout } = await execAsync("du -cb /var/lib/mysql/binlog.* 2>/dev/null");
    const lines = stdout.trim().split("\n").filter(Boolean);
    const totalBytes = Number(lines[lines.length - 1]?.trim().split(/\s+/)[0]) || 0;

    return { total_bytes: totalBytes, file_count: Math.max(lines.length - 1, 0) };
  } catch {
    return { total_bytes: 0, file_count: 0 };
  }
}

// Deletes MySQL binary log files older than `keepDays` days. Safe as long
// as nothing is replicating off this server (verify with SHOW REPLICAS /
// SHOW FULL PROCESSLIST before exposing this to a wider audience).
async function purgeBinlogs(keepDays) {
  const safeDays = Math.min(Math.max(Number.parseInt(keepDays, 10) || 3, 1), 30);
  const before = await getBinlogStorage();

  await execAsync(`mysql -e "PURGE BINARY LOGS BEFORE (NOW() - INTERVAL ${safeDays} DAY);"`);

  const after = await getBinlogStorage();

  return {
    keep_days: safeDays,
    freed_bytes: Math.max(before.total_bytes - after.total_bytes, 0),
    files_before: before.file_count,
    ...after,
  };
}

module.exports = {
  getDiskSpace,
  getMemory,
  getCpu,
  getAllProcesses,
  getBinlogStorage,
  purgeBinlogs,
  PM2_PROCESS_NAME,
};
