const wooModel = require('../../models/marketplace/woo/woo_model');
const wooApi = require('../../services/marketplace/woo/woo_api_service');
const orderModel = require('../../models/woo/woo_order_model');
const asyncHandler = require('../../middleware/async_handler');

function ok(res, message, data, extra = {}) { return res.json({ success: true, message, data, ...extra }); }

const list = asyncHandler(async (req, res) => {
  const result = await orderModel.list(req.query || {});
  return ok(res, 'WooCommerce orders loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});

const detail = asyncHandler(async (req, res) => {
  const data = await orderModel.getById(req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'WooCommerce order not found.' });
  return ok(res, 'WooCommerce order loaded.', data);
});

const sync = asyncHandler(async (req, res) => {
  const accountId = req.body.account_id || req.query.account_id;
  if (!accountId) return res.status(400).json({ success: false, message: 'account_id is required to sync WooCommerce orders.' });
  const credentials = await wooModel.getWooCredentials(accountId);
  const result = await wooApi.getOrders(credentials, req.body.params || req.query || {});
  const rows = Array.isArray(result.data) ? result.data : [];
  const saved = [];
  for (const row of rows) {
    saved.push(await orderModel.upsertOrder(credentials, row));
  }
  return ok(res, `WooCommerce order sync completed. ${saved.length} orders saved.`, { synced: saved.length, rows: saved });
});

const updateStatus = asyncHandler(async (req, res) => {
  const status = req.body.status || req.body.order_status;
  if (!status) return res.status(400).json({ success: false, message: 'status is required.' });
  const data = await orderModel.updateStatus(req.params.id, status);
  return ok(res, 'WooCommerce order status updated locally.', data);
});

const financeSummary = asyncHandler(async (req, res) => ok(res, 'WooCommerce finance summary loaded.', await orderModel.financeSummary(req.query || {})));

module.exports = { list, sync, detail, updateStatus, financeSummary };
