const brighthubModel = require("../../../models/marketplace/brighthub/brighthub_model");
const brighthubApi = require("../../../services/marketplace/brighthub/brighthub_api_service");

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || "Something went wrong.";
}

function getAccountId(req) {
  return req?.params?.accountId;
}

function getOrderId(req) {
  return req?.params?.id;
}

async function getBrightHubOrders(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const result = await brighthubApi.getOrders(credentials, req.query);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/orders",
      http_method: "GET",
      request_type: "orders",
      response_status_code: 200,
      api_status: "success",
      request_summary: req.query,
      response_summary: { total: result.total, total_pages: result.total_pages },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, total: result.total, total_pages: result.total_pages, data: result.data });
  } catch (error) {
    console.error("[GET_BRIGHTHUB_ORDERS_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/orders",
      http_method: "GET",
      request_type: "orders",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load BrightHub orders.",
      error: getErrorMessage(error),
    });
  }
}

async function getBrightHubOrderDetail(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);
  const orderId = getOrderId(req);

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const order = await brighthubApi.getOrder(credentials, orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/orders/${orderId}`,
      http_method: "GET",
      request_type: "orders",
      response_status_code: 200,
      api_status: "success",
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("[GET_BRIGHTHUB_ORDER_DETAIL_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/orders/${orderId}`,
      http_method: "GET",
      request_type: "orders",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load the BrightHub order.",
      error: getErrorMessage(error),
    });
  }
}

async function updateBrightHubOrderStatus(req, res) {
  const startedAt = new Date();
  const accountId = getAccountId(req);
  const orderId = getOrderId(req);
  const status = req.body?.status;

  try {
    if (!accountId) {
      return res.status(400).json({ success: false, message: "Account ID is required." });
    }

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const order = await brighthubApi.updateOrderStatus(credentials, orderId, status);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/orders/${orderId}/status`,
      http_method: "PUT",
      request_type: "orders",
      response_status_code: 200,
      api_status: "success",
      request_summary: { status },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, message: `Order status updated to ${status}.`, data: order });
  } catch (error) {
    console.error("[UPDATE_BRIGHTHUB_ORDER_STATUS_ERROR]:", error);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: `/orders/${orderId}/status`,
      http_method: "PUT",
      request_type: "orders",
      response_status_code: error?.response?.status || 500,
      api_status: "failed",
      error_message: getErrorMessage(error),
      request_summary: { status },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: "Failed to update the order status.",
      error: getErrorMessage(error),
    });
  }
}

module.exports = {
  getBrightHubOrders,
  getBrightHubOrderDetail,
  updateBrightHubOrderStatus,
};
