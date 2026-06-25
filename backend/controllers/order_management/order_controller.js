const orderModel = require("../../models/order_management/order_model");
const orderItemModel = require("../../models/order_management/order_item_model");
const orderLogModel = require("../../models/order_management/order_log_model");
const {
  asyncHandler,
  sendSuccess,
  sendPaginated,
} = require("../../utils/order_management/orderHelpers");

function getUserCode(req) {
  return (
    req.user?.staff_code ||
    req.user?.user_code ||
    req.user?.id ||
    req.headers["x-user-code"] ||
    req.body?.changed_by ||
    req.body?.created_by ||
    req.body?.updated_by ||
    "SYSTEM"
  );
}

const getOrders = asyncHandler(async (req, res) => {
  const result = await orderModel.listOrders({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search,
    order_type: req.query.order_type,
    order_status: req.query.order_status,
    payment_method: req.query.payment_method,
    customer_code: req.query.customer_code,
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    include_deleted: req.query.include_deleted === "true",
  });

  return sendPaginated(res, result.data, result.pagination, "Orders loaded successfully");
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderModel.getOrderById(req.params.orderId, {
    include_deleted: req.query.include_deleted === "true",
  });

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  return sendSuccess(res, order, "Order loaded successfully");
});

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.createOrder(req.body, getUserCode(req));
  return sendSuccess(res, order, "Order created successfully", 201);
});

const updateOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.updateOrder(req.params.orderId, req.body, getUserCode(req));
  return sendSuccess(res, order, "Order updated successfully");
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderModel.updateOrderStatus(req.params.orderId, req.body, getUserCode(req));
  return sendSuccess(res, order, "Order status updated successfully");
});

const deleteOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.softDeleteOrder(req.params.orderId, req.body, getUserCode(req));
  return sendSuccess(res, order, "Order deleted successfully");
});

const restoreOrder = asyncHandler(async (req, res) => {
  const order = await orderModel.restoreOrder(req.params.orderId, req.body, getUserCode(req));
  return sendSuccess(res, order, "Order restored successfully");
});

const getOrderItems = asyncHandler(async (req, res) => {
  const items = await orderItemModel.listItemsByOrderId(req.params.orderId, {
    include_deleted: req.query.include_deleted === "true",
  });
  return sendSuccess(res, items, "Order items loaded successfully");
});

const addOrderItem = asyncHandler(async (req, res) => {
  const item = await orderItemModel.createOrderItem(req.params.orderId, req.body, getUserCode(req));
  return sendSuccess(res, item, "Order item added successfully", 201);
});

const updateOrderItem = asyncHandler(async (req, res) => {
  const item = await orderItemModel.updateOrderItem(req.params.itemId, req.body, getUserCode(req));
  return sendSuccess(res, item, "Order item updated successfully");
});

const deleteOrderItem = asyncHandler(async (req, res) => {
  const item = await orderItemModel.softDeleteOrderItem(req.params.itemId, req.body, getUserCode(req));
  return sendSuccess(res, item, "Order item deleted successfully");
});

const restoreOrderItem = asyncHandler(async (req, res) => {
  const item = await orderItemModel.restoreOrderItem(req.params.itemId, req.body, getUserCode(req));
  return sendSuccess(res, item, "Order item restored successfully");
});

const getOrderLogs = asyncHandler(async (req, res) => {
  const logs = await orderLogModel.getLogsByOrderId(req.params.orderId, {
    limit: req.query.limit,
    offset: req.query.offset,
  });
  return sendSuccess(res, logs, "Order logs loaded successfully");
});

const getOrderSummary = asyncHandler(async (req, res) => {
  const summary = await orderModel.getDashboardSummary({
    order_type: req.query.order_type,
    order_status: req.query.order_status,
    payment_method: req.query.payment_method,
    from_date: req.query.from_date,
    to_date: req.query.to_date,
    include_deleted: req.query.include_deleted === "true",
  });

  return sendSuccess(res, summary, "Order summary loaded successfully");
});

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  restoreOrder,
  getOrderItems,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
  restoreOrderItem,
  getOrderLogs,
  getOrderSummary,
};
