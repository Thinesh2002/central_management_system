const asyncHandler = require("../../middleware/async_handler");
const settingsModel = require("../../models/order_management/order_sync_settings_model");
const darazOrderSyncJob = require("../../jobs/daraz/order_management/daraz_order_sync_job");
const wooOrderSyncJob = require("../../jobs/woo/order_management/woo_order_sync_job");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsModel.getSettings();
  return res.json({ success: true, message: "Sync settings loaded", data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsModel.updateSettings(req.body || {});
  return res.json({ success: true, message: "Sync settings updated", data: settings });
});

const runNow = asyncHandler(async (req, res) => {
  // Fire-and-forget - a full multi-account sync routinely runs past the
  // frontend's request timeout, which was surfacing as a false "Request
  // timed out" error even though the sync itself was working fine in the
  // background. The response message already promised this ("check logs
  // for status"); the await just never matched that.
  darazOrderSyncJob.syncAllDarazOrders().catch((error) => {
    console.error("[DARAZ_ORDER_SYNC] Manual run-now failed:", error.message);
  });

  wooOrderSyncJob.syncAllWooOrders().catch((error) => {
    console.error("[WOO_ORDER_SYNC] Manual run-now failed:", error.message);
  });

  return res.json({ success: true, message: "Order sync triggered for Daraz and WooCommerce. Check logs for status." });
});

module.exports = { getSettings, updateSettings, runNow };
