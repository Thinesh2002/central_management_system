const diskSpaceService = require("../../services/system/disk_space_service");

async function getDiskSpace(req, res) {
  try {
    const [diskRes, memoryRes, cpuRes, processRes] = await Promise.allSettled([
      diskSpaceService.getDiskSpace(),
      diskSpaceService.getMemory(),
      Promise.resolve(diskSpaceService.getCpu()),
      diskSpaceService.getProcessStats(),
    ]);

    if (diskRes.status === "rejected") {
      throw diskRes.reason;
    }

    const data = {
      disk: diskRes.value,
      memory: memoryRes.status === "fulfilled" ? memoryRes.value : null,
      cpu: cpuRes.status === "fulfilled" ? cpuRes.value : null,
      process: processRes.status === "fulfilled" ? processRes.value : null,
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
