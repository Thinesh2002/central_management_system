const asyncHandler = require("../../middleware/async_handler");
const settingsModel = require("../../models/order_management/order_sync_settings_model");
const darazOrderSyncJob = require("../../jobs/daraz/order_management/daraz_order_sync_job");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsModel.getSettings();
  return res.json({ success: true, message: "Sync settings loaded", data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsModel.updateSettings(req.body || {});
  return res.json({ success: true, message: "Sync settings updated", data: settings });
});

const runNow = asyncHandler(async (req, res) => {
  // A run already in flight silently no-ops the next syncAllDarazOrders()
  // call (see the isRunning guard in daraz_order_sync_job.js) - previously
  // this endpoint always claimed success regardless, so a click during a
  // long-running sync (e.g. a large fetch_order_days window) looked exactly
  // like a successful trigger while actually doing nothing. Report the true
  // state instead of a blind "triggered".
  if (darazOrderSyncJob.isSyncRunning()) {
    return res.json({
      success: true,
      already_running: true,
      message: "A Daraz order sync is already in progress - this click didn't start a new one. Wait for it to finish and check the Sync Logs tab.",
    });
  }

  // Fire-and-forget - a full multi-account sync routinely runs past the
  // frontend's request timeout, which was surfacing as a false "Request
  // timed out" error even though the sync itself was working fine in the
  // background. The response message already promised this ("check logs
  // for status"); the await just never matched that.
  darazOrderSyncJob.syncAllDarazOrders().catch((error) => {
    console.error("[DARAZ_ORDER_SYNC] Manual run-now failed:", error.message);
  });

  return res.json({ success: true, message: "Order sync triggered for Daraz. Check logs for status." });
});

module.exports = { getSettings, updateSettings, runNow };
