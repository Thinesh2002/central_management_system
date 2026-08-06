const diskSpaceService = require("../../services/system/disk_space_service");

async function getDiskSpace(req, res) {
  try {
    const data = await diskSpaceService.getDiskSpace();
    return res.json({ success: true, message: "Disk space loaded", data });
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
