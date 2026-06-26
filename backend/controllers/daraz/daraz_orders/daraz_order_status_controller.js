const crypto = require('crypto');
const asyncHandler = require('../../../middleware/async_handler');
const { callDarazApi } = require('../../../services/daraz/daraz_orders/daraz_order_api_adapter');
const statusModel = require('../../../models/daraz/daraz_orders/daraz_order_status_model');
const orderModel = require('../../../models/daraz/daraz_orders/daraz_order_model');
const orderService = require('../../../services/daraz/daraz_orders/daraz_order_service');

function uid(prefix) { return `${prefix}_${Date.now()}_${crypto.randomUUID()}`; }
function asArray(value) { if (!value) return []; return Array.isArray(value) ? value : [value]; }
function clean(value) { return String(value ?? '').trim(); }

function getOrderId(req) {
  return req.body.order_id || req.body.id || req.body.order_number || req.query.order_id || req.params.id;
}

function userId(req) { return req.user?.id || req.user?.user_id || req.user?.user_uid || null; }

function extractOrderItemIds(req, items = []) {
  const fromBody = asArray(req.body.order_item_ids || req.body.order_item_id || req.body.item_ids).map(clean).filter(Boolean);
  if (fromBody.length) return fromBody;
  return items.map((item) => clean(item.order_item_id || item.id)).filter(Boolean);
}

async function runDarazAction(req, res, config) {
  const orderId = getOrderId(req);
  if (!orderId) return res.status(400).json({ success: false, message: 'order_id is required.' });

  const order = await statusModel.getOrder(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Daraz order not found.' });

  const items = await statusModel.getOrderItems(order);
  const orderItemIds = extractOrderItemIds(req, items);
  const oldStatus = order.daraz_status || order.local_status;

  const payload = {
    order_id: order.order_id,
    order_item_ids: orderItemIds.join(','),
    package_id: req.body.package_id || order.package_id || null,
    shipping_provider: req.body.shipping_provider || order.shipment_provider || null,
    delivery_type: req.body.delivery_type || req.body.shipment_type || order.shipment_type || null,
    reason_id: req.body.reason_id || null,
    reason_detail: req.body.reason_detail || req.body.reason || null,
    invoice_number: req.body.invoice_number || null,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === null || payload[key] === undefined || payload[key] === '') delete payload[key];
  });

  let apiResponse = null;
  try {
    apiResponse = await callDarazApi({
      account_code: order.account_code,
      apiPath: config.endpoint,
      endpoint: config.endpoint,
      method: config.method || 'POST',
      query: config.method === 'GET' ? payload : {},
      params: config.method === 'GET' ? payload : {},
      body: config.method === 'GET' ? {} : payload,
      requestType: config.requestType,
      request_type: config.requestType,
      request_uid: uid(config.requestType),
    });

    const newDarazStatus = typeof config.newDarazStatus === 'function' ? config.newDarazStatus(order, apiResponse) : config.newDarazStatus;
    const newLocalStatus = typeof config.newLocalStatus === 'function' ? config.newLocalStatus(order, apiResponse) : config.newLocalStatus;

    if (newDarazStatus || newLocalStatus) {
      await statusModel.updateLocalStatus(order, newDarazStatus, newLocalStatus);
      await orderModel.insertStatusHistory({
        order_id: order.id,
        account_code: order.account_code,
        daraz_order_id: order.order_id,
        old_daraz_status: order.daraz_status,
        new_daraz_status: newDarazStatus || order.daraz_status,
        old_local_status: order.local_status,
        new_local_status: newLocalStatus || order.local_status,
        change_source: 'user_action',
        daraz_api_called: true,
        daraz_api_success: true,
        request_payload: payload,
        response_payload: apiResponse,
        changed_by: userId(req),
      }).catch(() => null);
    }

    await statusModel.insertLog({
      account_id: order.account_id,
      order_id: order.order_id,
      order_item_ids: orderItemIds,
      action: config.action,
      old_status: oldStatus,
      new_status: newDarazStatus || newLocalStatus || oldStatus,
      api_response: apiResponse,
      success: true,
    });

    return res.json({ success: true, message: `${config.label} completed successfully.`, data: { order_id: order.order_id, api_response: apiResponse } });
  } catch (error) {
    await statusModel.insertLog({
      account_id: order.account_id,
      order_id: order.order_id,
      order_item_ids: orderItemIds,
      action: config.action,
      old_status: oldStatus,
      new_status: null,
      api_response: apiResponse,
      success: false,
      error_message: error.message,
    }).catch(() => null);

    const statusCode = error?.daraz?.code === 'InsufficientPermission' || /InsufficientPermission/i.test(error.message) ? 403 : (error.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error.message || `${config.label} failed.`,
      daraz_error: error.daraz || null,
    });
  }
}

const pack = asyncHandler((req, res) => runDarazAction(req, res, {
  action: 'PACK',
  label: 'Pack order',
  endpoint: process.env.DARAZ_ORDER_PACK_ENDPOINT || '/order/pack',
  requestType: 'daraz_order_pack',
  newDarazStatus: 'packed',
  newLocalStatus: 'Packed',
}));

const readyToShip = asyncHandler((req, res) => runDarazAction(req, res, {
  action: 'READY_TO_SHIP',
  label: 'Ready to ship',
  endpoint: process.env.DARAZ_ORDER_READY_TO_SHIP_ENDPOINT || '/order/rts',
  requestType: 'daraz_order_ready_to_ship',
  newDarazStatus: 'ready_to_ship',
  newLocalStatus: 'Ready To Ship',
}));

const cancel = asyncHandler((req, res) => runDarazAction(req, res, {
  action: 'CANCEL',
  label: 'Cancel order',
  endpoint: process.env.DARAZ_ORDER_CANCEL_ENDPOINT || '/order/cancel',
  requestType: 'daraz_order_cancel',
  newDarazStatus: 'canceled',
  newLocalStatus: 'Cancelled',
}));

const printAwb = asyncHandler(async (req, res) => {
  const result = await orderService.generateAwb(getOrderId(req), userId(req));
  return res.json({ success: true, message: 'AWB loaded successfully.', data: result });
});

const syncTracking = asyncHandler(async (req, res) => {
  const result = await orderService.syncTracking(getOrderId(req));
  return res.json({ success: true, message: 'Daraz tracking synced successfully.', data: result });
});

const syncStatus = asyncHandler(async (req, res) => {
  const result = await orderService.syncTracking(getOrderId(req));
  return res.json({ success: true, message: 'Daraz status synced successfully.', data: result });
});

const printInvoice = asyncHandler((req, res) => runDarazAction(req, res, {
  action: 'PRINT_INVOICE',
  label: 'Print invoice',
  endpoint: process.env.DARAZ_ORDER_INVOICE_PRINT_ENDPOINT || '/order/document/invoice/get',
  method: 'GET',
  requestType: 'daraz_order_invoice_print',
}));

const setInvoiceNumber = asyncHandler((req, res) => runDarazAction(req, res, {
  action: 'SET_INVOICE_NUMBER',
  label: 'Invoice number update',
  endpoint: process.env.DARAZ_ORDER_INVOICE_NUMBER_ENDPOINT || '/order/invoice_number/set',
  requestType: 'daraz_order_invoice_number_set',
}));

module.exports = { pack, readyToShip, cancel, syncTracking, syncStatus, printAwb, printInvoice, setInvoiceNumber };
