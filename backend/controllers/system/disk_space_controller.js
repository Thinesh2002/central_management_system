const diskSpaceService = require("../../services/system/disk_space_service");

async function getDiskSpace(req, res) {
  try {
    const [diskRes, memoryRes, cpuRes, processesRes] = await Promise.allSettled([
      diskSpaceService.getDiskSpace(),
      diskSpaceService.getMemory(),
      Promise.resolve(diskSpaceService.getCpu()),
      diskSpaceService.getAllProcesses(),
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

module.exports = { getDiskSpace };
