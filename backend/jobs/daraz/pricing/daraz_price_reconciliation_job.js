const cron = require("node-cron");
const service = require("../../../services/daraz/pricing/daraz_price_reconciliation_service");

let isRunning = false;

async function reconcileAllDarazPrices() {
  if (isRunning) {
    console.log("[DARAZ_PRICE_RECONCILIATION] Previous run still in progress. Skipped.");
    return;
  }

  isRunning = true;

  try {
    console.log("[DARAZ_PRICE_RECONCILIATION] Nightly reconciliation started.");
    const result = await service.reconcileAllLocalPricesToDaraz({
      source: "scheduled_nightly",
      userId: null,
    });
    console.log("[DARAZ_PRICE_RECONCILIATION] Nightly reconciliation finished.", result);
  } catch (error) {
    console.error("[DARAZ_PRICE_RECONCILIATION] Job failed:", error.message);
  } finally {
    isRunning = false;
  }
}

// 01:00 Colombo - after the midnight content-optimizer/title-scan jobs,
// spreading load rather than clustering every nightly job at 00:00.
function startDarazPriceReconciliationJob() {
  cron.schedule("0 1 * * *", reconcileAllDarazPrices, {
    timezone: "Asia/Colombo",
  });

  console.log("[DARAZ_PRICE_RECONCILIATION] Scheduler started. Runs nightly at 01:00 Colombo.");
}

module.exports = {
  startDarazPriceReconciliationJob,
  reconcileAllDarazPrices,
};
