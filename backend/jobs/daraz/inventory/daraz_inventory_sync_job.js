const cron = require("node-cron");
const service = require("../../../services/daraz/inventory/daraz_inventory_sync_service");

let isRunning = false;

async function syncAllDarazInventory() {
  if (isRunning) {
    console.log("[DARAZ_INVENTORY_SYNC] Previous sync still running. Skipped.");
    return;
  }

  isRunning = true;

  try {
    console.log("[DARAZ_INVENTORY_SYNC] Auto stock sync started.");
    const result = await service.syncAllLocalInventoryToDaraz({
      source: "scheduled_30_min",
      userId: null,
    });
    console.log("[DARAZ_INVENTORY_SYNC] Auto stock sync finished.", result);
  } catch (error) {
    console.error("[DARAZ_INVENTORY_SYNC] Job failed:", error.message);
  } finally {
    isRunning = false;
  }
}

function startDarazInventorySyncJob() {
  cron.schedule("*/30 * * * *", syncAllDarazInventory, {
    timezone: "Asia/Colombo",
  });

  console.log("[DARAZ_INVENTORY_SYNC] Scheduler started. Runs every 30 minutes.");
}

module.exports = {
  startDarazInventorySyncJob,
  syncAllDarazInventory,
};
