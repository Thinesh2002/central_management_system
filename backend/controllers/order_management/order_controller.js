const asyncHandler = require("../../middleware/async_handler");
const orderModel = require("../../models/order_management/order_model");
const tokenService = require("../../services/marketplace/token_service");
const fulfillmentModel = require("../../models/order_management/daraz_order_fulfillment_model");
const darazOrderApiService = require("../../services/daraz/order_management/daraz_order_api_service");
const darazFinanceApiService = require("../../services/daraz/order_management/daraz_finance_api_service");
const darazMessageApiService = require("../../services/daraz/order_management/daraz_message_api_service");
const messageTemplateModel = require("../../models/order_management/message_template_model");
const messageLogModel = require("../../models/order_management/message_log_model");
const transExpressApiService = require("../../services/trans_express/trans_express_api_service");

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

// Read-only preview of the order number createManualOrder would assign
// right now - lets the create-order page show it before submitting. Not
// reserved: a concurrent create could still claim it first, same race
// createManualOrder itself already has. Every manual order uses the same
// BH prefix, so this doesn't depend on account name at all.
const previewOrderNumber = asyncHandler(async (req, res) => {
  const orderNo = await orderModel.nextManualOrderNo();
  return res.json({ success: true, message: "Order number preview", data: { order_no: orderNo } });
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

// Only manual orders can be deleted — a Daraz/Woo order is a synced mirror
// of something real on that marketplace; deleting the local row wouldn't
// delete it there, and the next sync would just recreate it.
const deleteOrder = asyncHandler(async (req, res) => {
  const { source, id } = req.params;

  if (source !== "local") {
    return res.status(400).json({ success: false, message: "Only manual orders can be deleted." });
  }

  const deleted = await orderModel.deleteLocalOrder(id);

  if (!deleted) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  return res.json({ success: true, message: "Order deleted" });
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

  if (source === "local") {
    const order = await orderModel.getUnified("local", id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (!order.waybill_id) {
      return res.status(400).json({ success: false, message: "This order has no waybill yet." });
    }

    const tracking = await transExpressApiService.trackOrder(order.waybill_id);
    return res.json({ success: true, message: "Tracking loaded", data: tracking });
  }

  if (source !== "daraz") {
    return res.status(400).json({ success: false, message: "Tracking is only available for Daraz and local orders." });
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

// The values a message template's {{placeholder}} tokens can resolve to —
// kept in one place so the template editor's "insert placeholder" list and
// the actual send-time rendering never drift apart.
function buildTemplateValues(order) {
  return {
    customer_name: order.customer_name || order.shipping_name || "",
    order_no: order.order_number || order.display_order_no || order.order_no || "",
    total: order.grand_total || "",
    currency: order.currency || "LKR",
    tracking_number: order.tracking_number || "",
    waybill_id: order.waybill_id || "",
    status: order.order_status || "",
    account_name: order.account_name || "",
  };
}

const listOrderMessages = asyncHandler(async (req, res) => {
  const { source, id } = req.params;

  const order = await fulfillmentModel.getOrderRow(id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found." });
  }

  const logs = await messageLogModel.listForOrder(source, order.id);

  return res.json({ success: true, message: "Message history loaded", data: logs });
});

// Sends a real Daraz Instant Message to the order's buyer — either a chosen
// template (rendered with this order's own data) or raw free-typed content.
// Every attempt is logged, success or failure, so message_logs is always
// the authoritative record of what was actually sent to a buyer.
const sendOrderMessage = asyncHandler(async (req, res) => {
  const { source, id } = req.params;
  const { template_id: templateId, content: rawContent } = req.body || {};

  if (source !== "daraz") {
    return res.status(400).json({ success: false, message: "Messaging is only available for Daraz orders." });
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

  let content = rawContent;
  let usedTemplateId = null;

  if (templateId) {
    const template = await messageTemplateModel.findById(templateId);

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    content = messageTemplateModel.renderTemplate(template.content, buildTemplateValues(order));
    usedTemplateId = template.id;
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Message content is required." });
  }

  const { credentials } = await tokenService.getValidCredentialsForAccount(account.id);

  try {
    const sessionResponse = await darazMessageApiService.openSession({
      account,
      credentials,
      orderId: order.daraz_order_id,
    });

    const sessionId = sessionResponse?.data?.session_id;

    if (!sessionId) {
      throw new Error("Daraz didn't return a session ID for this order.");
    }

    const sendResponse = await darazMessageApiService.sendMessage({
      account,
      credentials,
      sessionId,
      txt: content,
    });

    const messageId = sendResponse?.data?.data?.message_id || sendResponse?.data?.message_id || null;

    await messageLogModel.create({
      source: "daraz",
      source_order_id: order.id,
      template_id: usedTemplateId,
      session_id: sessionId,
      daraz_message_id: messageId,
      content,
      status: "sent",
      sent_by: getUserId(req),
    });

    return res.json({
      success: true,
      message: "Message sent",
      data: { session_id: sessionId, message_id: messageId, content },
    });
  } catch (error) {
    await messageLogModel.create({
      source: "daraz",
      source_order_id: order.id,
      template_id: usedTemplateId,
      content,
      status: "failed",
      error_message: error.message,
      sent_by: getUserId(req),
    });

    throw error;
  }
});

module.exports = {
  listOrders,
  getOrder,
  filterOptions,
  previewOrderNumber,
  updateStatus,
  createWaybill,
  createManualOrder,
  deleteOrder,
  getTracking,
  getFinance,
  listOrderMessages,
  sendOrderMessage,
};
