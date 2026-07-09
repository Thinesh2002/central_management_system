const asyncHandler = require("../../middleware/async_handler");
const orderModel = require("../../models/order_management/order_model");

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

module.exports = {
  listOrders,
  getOrder,
  filterOptions,
  updateStatus,
  createWaybill,
  createManualOrder,
};
