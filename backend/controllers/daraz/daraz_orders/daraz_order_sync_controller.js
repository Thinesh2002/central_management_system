const accountModel = require("../../../models/daraz/daraz_account/daraz_account_model");
const orderModel = require("../../../models/daraz/orders/daraz_order_sync_model");
const orderSyncService = require("../../../services/daraz/daraz_order_sync_service");

exports.syncAllDarazOrders = async (req, res) => {
  try {
    const summary = await orderSyncService.syncAllOrders({
      syncType: "manual",
      accountCode: req.query.account_code || null,
      start: req.query.start || null,
      end: req.query.end || null
    });

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Daraz order sync failed", error: error.message });
  }
};

exports.syncSingleDarazAccountOrders = async (req, res) => {
  try {
    const account = await accountModel.getAccountByCode(req.params.account_code);
    if (!account) return res.status(404).json({ success: false, message: "Daraz account not found" });

    const result = await orderSyncService.syncSingleAccountOrders(account, {
      syncType: "manual",
      start: req.query.start || null,
      end: req.query.end || null
    });

    return res.status(result.success || result.partial ? 200 : 500).json({ success: result.success || result.partial, result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Daraz account order sync failed", error: error.message });
  }
};

exports.runOrderSyncJob = async () => orderSyncService.syncAllOrders({ syncType: "cron" });

exports.getOrders = async (req, res) => {
  try {
    const result = await orderModel.getOrders({
      page: req.query.page,
      limit: req.query.limit,
      account_code: req.query.account_code,
      status: req.query.status,
      search: req.query.search
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz orders", error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await orderModel.getOrderById(req.params.order_id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const items = await orderModel.getOrderItems(order.id);
    return res.status(200).json({ success: true, order: { ...order, items } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz order details", error: error.message });
  }
};
