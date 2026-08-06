const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);

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

module.exports = { getDiskSpace };
