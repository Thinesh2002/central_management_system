const asyncHandler = require("../../middleware/async_handler");
const tokenService = require("../../services/marketplace/token_service");
const fulfillmentService = require("../../services/daraz/order_management/daraz_order_fulfillment_service");
const fulfillmentModel = require("../../models/order_management/daraz_order_fulfillment_model");

function darazResultOf(response) {
  return response?.data?.result || response?.data || {};
}

// Daraz's field casing isn't confirmed for every nested response shape, so
// check a couple of likely spellings rather than assuming one.
function pick(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

async function getOrderItemIds(order) {
  const itemIdColumn = await fulfillmentModel.getOrderItemIdColumn();

  if (!itemIdColumn) {
    const error = new Error(
      "Can't find Daraz's order_item_id column on daraz_order_items — refusing to proceed without it."
    );
    error.statusCode = 500;
    throw error;
  }

  const items = await fulfillmentModel.getOrderItems(order.id);
  const orderItemIds = items.map((item) => item[itemIdColumn]).filter(Boolean);

  if (!orderItemIds.length) {
    const error = new Error("No Daraz order_item_id found for this order's items.");
    error.statusCode = 400;
    throw error;
  }

  return orderItemIds;
}

// Pack an order: needs Daraz's own order_id (daraz_order_id) plus every
// line item's Daraz order_item_id. If this table's item-id column can't be
// found, refuse rather than send an empty/guessed item list to a live
// seller account.
async function runPack({ account, credentials, order }) {
  const orderItemIds = await getOrderItemIds(order);

  const response = await fulfillmentService.packOrder({
    account,
    credentials,
    packOrderList: [
      {
        order_id: order.daraz_order_id,
        order_item_list: orderItemIds,
      },
    ],
  });

  const result = darazResultOf(response);
  const data = pick(result, ["data"]) || result || {};
  const packOrderList = pick(data, ["pack_order_list", "packOrderList"]) || [];
  const packedOrder = packOrderList[0] || {};
  const orderItemList = pick(packedOrder, ["order_item_list", "orderItemList"]) || [];
  const packedItem = orderItemList[0] || {};
  const packageId = pick(packedItem, ["package_id", "packageId"]);
  const trackingNumber = pick(packedItem, ["tracking_number", "trackingNumber"]);

  // callDarazApi already throws on Daraz-reported errors (including the
  // nested result.error_code/error_msg shape), but if it somehow returns a
  // 200 with no package_id, don't silently report success while writing
  // nothing — that's exactly what left orders stuck in "To Pack" with no
  // waybill before this fix.
  if (!packageId) {
    const error = new Error(
      "Daraz didn't return a package ID for this order — the pack call may not have actually succeeded."
    );
    error.statusCode = 502;
    throw error;
  }

  await fulfillmentModel.savePackageResult(order.id, {
    packageId,
    trackingNumber,
    orderStatus: "packed",
  });

  return { response, packageId };
}

async function requirePackageId(order) {
  if (order.waybill_id) return [order.waybill_id];

  const error = new Error("This order hasn't been packed yet — pack it first to get a package ID.");
  error.statusCode = 400;
  throw error;
}

async function runAction({ action, account, credentials, order, invoiceNumber }) {
  switch (action) {
    case "pack":
      return runPack({ account, credentials, order });

    case "deliver_digital": {
      const orderItemIds = await getOrderItemIds(order);
      const response = await fulfillmentService.deliverDigital({
        account,
        credentials,
        orders: [{ order_id: order.daraz_order_id, order_item_list: orderItemIds }],
      });
      return { response };
    }

    case "set_invoice_number": {
      if (!invoiceNumber) {
        const error = new Error("invoice_number is required for set_invoice_number.");
        error.statusCode = 400;
        throw error;
      }

      const orderItemIds = await getOrderItemIds(order);
      const response = await fulfillmentService.setInvoiceNumber({
        account,
        credentials,
        orderItemId: orderItemIds[0],
        invoiceNumber,
      });
      return { response };
    }

    case "ready_to_ship": {
      const packageIds = await requirePackageId(order);
      const response = await fulfillmentService.readyToShip({ account, credentials, packageIds });
      await fulfillmentModel.savePackageResult(order.id, { orderStatus: "ready_to_ship" });
      return { response };
    }

    case "print_awb": {
      const packageIds = await requirePackageId(order);
      const response = await fulfillmentService.printAwb({ account, credentials, packageIds });
      const result = darazResultOf(response);
      return { response, pdfUrl: result?.data?.pdf_url || result?.pdf_url || null };
    }

    case "recreate_package": {
      const packageIds = await requirePackageId(order);
      return { response: await fulfillmentService.recreatePackage({ account, credentials, packageIds }) };
    }

    case "confirm_dbs_delivered": {
      const packageIds = await requirePackageId(order);
      const response = await fulfillmentService.confirmDeliveryForDBS({ account, credentials, packageIds });
      await fulfillmentModel.savePackageResult(order.id, { orderStatus: "delivered" });
      return { response };
    }

    case "failed_dbs_delivery": {
      const packageIds = await requirePackageId(order);
      return { response: await fulfillmentService.failedDeliveryForDBS({ account, credentials, packageIds }) };
    }

    case "get_shipment_providers": {
      const response = await fulfillmentService.getShipmentProviders({
        account,
        credentials,
        orders: [{ order_id: order.daraz_order_id }],
      });
      return { response };
    }

    default: {
      const error = new Error(`Unsupported Daraz action: ${action}`);
      error.statusCode = 400;
      throw error;
    }
  }
}

const runBulkAction = asyncHandler(async (req, res) => {
  const { action, order_ids: orderIds = [], invoice_number: invoiceNumber } = req.body || {};

  if (!action) {
    return res.status(400).json({ success: false, message: "action is required." });
  }

  if (!orderIds.length) {
    return res.status(400).json({ success: false, message: "order_ids is required." });
  }

  const results = [];
  const errors = [];
  let lastPdfUrl = null;

  for (const orderId of orderIds) {
    try {
      const order = await fulfillmentModel.getOrderRow(orderId);

      if (!order) {
        throw Object.assign(new Error("Order not found."), { statusCode: 404 });
      }

      const account = await fulfillmentModel.resolveDarazAccount(order.account_name);

      if (!account) {
        throw Object.assign(
          new Error(`No Daraz marketplace account found matching "${order.account_name}".`),
          { statusCode: 404 }
        );
      }

      const { credentials } = await tokenService.getValidCredentialsForAccount(account.id);

      const { response, pdfUrl } = await runAction({ action, account, credentials, order, invoiceNumber });

      if (pdfUrl) lastPdfUrl = pdfUrl;

      results.push({ order_id: orderId, success: true, message: response?.message || "Success" });
    } catch (error) {
      errors.push({ order_id: orderId, reason: error.message || "Daraz action failed" });
    }
  }

  const allFailed = results.length === 0;

  // Always 200 here — this is a legitimate response with a real body
  // explaining exactly which order(s) failed and why (data.errors[].reason).
  // Returning an HTTP error status (the previous code used 502) makes axios
  // throw on the frontend, which skips the code that shows that per-order
  // reason and leaves the user staring at a generic "Bad Gateway" instead of
  // the actual cause.
  return res.status(200).json({
    success: !allFailed,
    message: allFailed
      ? `"${action}" failed for all ${orderIds.length} order(s).`
      : `"${action}" completed for ${results.length} of ${orderIds.length} order(s).`,
    data: { results, errors, pdf_url: lastPdfUrl },
  });
});

module.exports = { runBulkAction };
