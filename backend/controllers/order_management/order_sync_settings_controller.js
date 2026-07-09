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
  await darazOrderSyncJob.syncAllDarazOrders();
  return res.json({ success: true, message: "Daraz order sync triggered. Check logs for status." });
});

module.exports = { getSettings, updateSettings, runNow };
