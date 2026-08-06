const diskSpaceService = require("../../services/system/disk_space_service");

async function getDiskSpace(req, res) {
  try {
    const [diskRes, memoryRes, cpuRes, processesRes, binlogRes] = await Promise.allSettled([
      diskSpaceService.getDiskSpace(),
      diskSpaceService.getMemory(),
      Promise.resolve(diskSpaceService.getCpu()),
      diskSpaceService.getAllProcesses(),
      diskSpaceService.getBinlogStorage(),
    ]);

    if (diskRes.status === "rejected") {
      throw diskRes.reason;
    }

    const processes = processesRes.status === "fulfilled" ? processesRes.value : [];

    const data = {
      disk: diskRes.value,
      memory: memoryRes.status === "fulfilled" ? memoryRes.value : null,
      cpu: cpuRes.status === "fulfilled" ? cpuRes.value : null,
      process: processes.find((p) => p.name === diskSpaceService.PM2_PROCESS_NAME) || null,
      processes,
      binlogs: binlogRes.status === "fulfilled" ? binlogRes.value : null,
    };

    return res.json({ success: true, message: "Server stats loaded", data });
  } catch (error) {
    console.error("[DISK_SPACE_ERROR]:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to read server disk space.",
      error: error.message,
    });
  }
}

async function cleanBinlogs(req, res) {
  try {
    const keepDays = req.body?.keep_days;
    const result = await diskSpaceService.purgeBinlogs(keepDays);

    return res.json({
      success: true,
      message: `Purged binary logs older than ${result.keep_days} day(s).`,
      data: result,
    });
  } catch (error) {
    console.error("[BINLOG_PURGE_ERROR]:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to purge binary logs.",
      error: error.message,
    });
  }
}

module.exports = { getDiskSpace, cleanBinlogs };
