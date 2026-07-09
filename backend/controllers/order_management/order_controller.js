const asyncHandler = require("../../middleware/async_handler");
const orderModel = require("../../models/order_management/order_model");
const tokenService = require("../../services/marketplace/token_service");
const fulfillmentModel = require("../../models/order_management/daraz_order_fulfillment_model");
const darazOrderApiService = require("../../services/daraz/order_management/daraz_order_api_service");
const darazFinanceApiService = require("../../services/daraz/order_management/daraz_finance_api_service");

function getUserId(req) {
  return req?.user?.id || req?.user?.user_id || req?.body?.created_by || null;
}

const listOrders = asyncHandler(async (req, res) => {
  const { limit, date_from: dateFrom, date_to: dateTo } = req.query;

  const orders = await orderModel.listUnified({
    limit: limit ? Number(limit) : undefined,
    dateFrom,
    dateTo,
  });

  return res.json({ success: true, message: "Orders loaded", data: { orders } });
});

const getOrder = asyncHandler(async (req, res) => {
  const { source, id } = req.params;

  const order = await orderModel.getUnified(source, id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  return res.json({ success: true, message: "Order loaded", data: order });
});

const filterOptions = asyncHandler(async (req, res) => {
  const options = await orderModel.getFilterOptions();
  return res.json({ success: true, message: "Filter options loaded", data: options });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { source, id } = req.params;
  const { status, waybill_id, tracking_number } = req.body || {};

  const updated = await orderModel.updateStatus(source, id, { status, waybill_id, tracking_number });

  return res.json({ success: true, message: "Order status updated", data: updated });
});

const createWaybill = asyncHandler(async (req, res) => {
  const { source, id } = req.params;
  const { waybill_id, tracking_number } = req.body || {};

  if (!waybill_id) {
    return res.status(400).json({ success: false, message: "waybill_id is required." });
  }

  const updated = await orderModel.updateStatus(source, id, {
    waybill_id,
    tracking_number: tracking_number || waybill_id,
  });

  return res.json({ success: true, message: "Waybill saved", data: updated });
});

const createManualOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.createManualOrder({
    ...req.body,
    created_by: getUserId(req),
  });

  return res.status(201).json({ success: true, message: "Order created", data: order });
});

// Real tracking timeline via Daraz's GetOrderTrace — only meaningful for
// Daraz orders that have already been packed (Daraz's own docs: only
// available in the state after ready-to-ship).
const getTracking = asyncHandler(async (req, res) => {
  const { source, id } = req.params;

  if (source !== "daraz") {
    return res.status(400).json({ success: false, message: "Tracking is only available for Daraz orders." });
  }

  const order = await fulfillmentModel.getOrderRow(id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  const account = await fulfillmentModel.resolveDarazAccount(order.account_name);

  if (!account) {
    return res.status(404).json({
      success: false,
      message: `No Daraz marketplace account found matching "${order.account_name}".`,
    });
  }

  const { credentials } = await tokenService.getValidCredentialsForAccount(account.id);

  const packageIds = order.waybill_id ? [order.waybill_id] : [];

  const response = await darazOrderApiService.getOrderTrace({
    account,
    credentials,
    orderId: order.daraz_order_id,
    ofcPackageIdList: packageIds,
  });

  const result = response?.data?.result || response?.data || {};

  return res.json({ success: true, message: "Tracking loaded", data: result.data || [] });
});

function toDateParam(date) {
  return date.toISOString().slice(0, 10);
}

// Finance API requires start_time/end_time with the gap under 180 days
// (error 1000012), so the window is anchored on the order's own date rather
// than an arbitrary fixed range — 1 day before the order (covers same-day
// fee postings) through 179 days after, capped at today.
const getFinance = asyncHandler(async (req, res) => {
  const { source, id } = req.params;

  if (source !== "daraz") {
    return res.status(400).json({ success: false, message: "Finance details are only available for Daraz orders." });
  }

  const order = await fulfillmentModel.getOrderRow(id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  const account = await fulfillmentModel.resolveDarazAccount(order.account_name);

  if (!account) {
    return res.status(404).json({
      success: false,
      message: `No Daraz marketplace account found matching "${order.account_name}".`,
    });
  }

  const { credentials } = await tokenService.getValidCredentialsForAccount(account.id);

  const orderDate = order.order_date ? new Date(order.order_date) : new Date();
  const startDate = new Date(orderDate.getTime() - 24 * 60 * 60 * 1000);
  const maxEndDate = new Date(startDate.getTime() + 179 * 24 * 60 * 60 * 1000);
  const endDate = new Date(Math.min(Date.now(), maxEndDate.getTime()));

  const response = await darazFinanceApiService.getTransactionDetails({
    account,
    credentials,
    tradeOrderId: order.daraz_order_id,
    startTime: toDateParam(startDate),
    endTime: toDateParam(endDate),
  });

  const transactions = response?.data?.data || [];

  return res.json({ success: true, message: "Finance transactions loaded", data: transactions });
});

module.exports = {
  listOrders,
  getOrder,
  filterOptions,
  updateStatus,
  createWaybill,
  createManualOrder,
  getTracking,
  getFinance,
};
