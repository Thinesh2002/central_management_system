const axios = require("axios");
const asyncHandler = require("../../middleware/async_handler");
const tokenService = require("../../services/marketplace/token_service");
const fulfillmentService = require("../../services/daraz/order_management/daraz_order_fulfillment_service");
const fulfillmentModel = require("../../models/order_management/daraz_order_fulfillment_model");
const darazOrderApiService = require("../../services/daraz/order_management/daraz_order_api_service");
const { composeAwbGridPdf } = require("../../services/pdf/awb_grid_service");

async function fetchPdfBytes(url) {
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
  return Buffer.from(response.data);
}

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

// Some accounts/orders require an explicit shipping_allocate_type on the
// pack call (Daraz rejects the request with "mandatory... not supplied"
// otherwise) - rather than guessing a value, ask Daraz's own
// shipment/providers/get for this exact order, which returns the correct
// allocate type (and, if the seller has real courier choices, the
// provider list) for that order specifically. Best-effort: if this lookup
// itself fails, fall through and let the pack call proceed without it -
// some accounts/orders don't require it at all.
async function getShippingAllocateType({ account, credentials, order, orderItemIds }) {
  try {
    const response = await fulfillmentService.getShipmentProviders({
      account,
      credentials,
      orders: [{ order_id: order.daraz_order_id, order_item_ids: orderItemIds }],
    });

    const result = darazResultOf(response);
    const data = pick(result, ["data"]) || result || {};
    return pick(data, ["shipping_allocate_type", "shippingAllocateType"]) || null;
  } catch (error) {
    console.error(`[DARAZ_PACK] Shipment providers lookup failed for order ${order.id}:`, error.message);
    return null;
  }
}

// Pack an order: needs Daraz's own order_id (daraz_order_id) plus every
// line item's Daraz order_item_id. If this table's item-id column can't be
// found, refuse rather than send an empty/guessed item list to a live
// seller account.
async function runPack({ account, credentials, order }) {
  const orderItemIds = await getOrderItemIds(order);
  const shippingAllocateType = await getShippingAllocateType({ account, credentials, order, orderItemIds });

  const response = await fulfillmentService.packOrder({
    account,
    credentials,
    packOrderList: [
      {
        order_id: order.daraz_order_id,
        order_item_list: orderItemIds,
      },
    ],
    shippingAllocateType,
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

// order.waybill_id is only refreshed by the scheduled Daraz order sync (every
// 30 minutes) — an order packed moments ago, or packed directly on Daraz's
// own seller center outside this app, would still read as "not packed"
// here until that next sync runs. Before failing, check Daraz directly for
// a package_id and backfill it locally if one now exists.
async function requirePackageId({ account, credentials, order }) {
  if (order.waybill_id) return [order.waybill_id];

  try {
    const itemsResponse = await darazOrderApiService.getOrderItems({
      account,
      credentials,
      orderId: order.daraz_order_id,
    });

    const items = itemsResponse?.data?.data || [];
    const packageId = items.map((item) => pick(item, ["package_id", "packageId"])).find(Boolean);

    if (packageId) {
      await fulfillmentModel.savePackageResult(order.id, { packageId });
      return [packageId];
    }
  } catch (lookupError) {
    console.error("[DARAZ_LIVE_PACKAGE_ID_LOOKUP_ERROR]", lookupError?.message);
  }

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
      const packageIds = await requirePackageId({ account, credentials, order });
      const response = await fulfillmentService.readyToShip({ account, credentials, packageIds });
      await fulfillmentModel.savePackageResult(order.id, { orderStatus: "ready_to_ship" });
      return { response };
    }

    case "print_awb": {
      const packageIds = await requirePackageId({ account, credentials, order });
      const response = await fulfillmentService.printAwb({ account, credentials, packageIds });
      const result = darazResultOf(response);
      return { response, pdfUrl: result?.data?.pdf_url || result?.pdf_url || null };
    }

    case "recreate_package": {
      const packageIds = await requirePackageId({ account, credentials, order });
      return { response: await fulfillmentService.recreatePackage({ account, credentials, packageIds }) };
    }

    case "confirm_dbs_delivered": {
      const packageIds = await requirePackageId({ account, credentials, order });
      const response = await fulfillmentService.confirmDeliveryForDBS({ account, credentials, packageIds });
      await fulfillmentModel.savePackageResult(order.id, { orderStatus: "delivered" });
      return { response };
    }

    case "failed_dbs_delivery": {
      const packageIds = await requirePackageId({ account, credentials, order });
      return { response: await fulfillmentService.failedDeliveryForDBS({ account, credentials, packageIds }) };
    }

    case "get_shipment_providers": {
      const orderItemIds = await getOrderItemIds(order);
      const response = await fulfillmentService.getShipmentProviders({
        account,
        credentials,
        orders: [{ order_id: order.daraz_order_id, order_item_ids: orderItemIds }],
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

// Daraz lays out one A4 sheet of labels per /order/package/document/get
// call, up to this many packages per sheet — bulk Print AWB batches
// package IDs into groups of this size so e.g. 10 selected orders produce
// 2 sheets (9 + 1) instead of either one call per order (discarding all
// but the last PDF) or a single oversized call Daraz would reject.
const PRINT_AWB_BATCH_SIZE = 9;

const runBulkAction = asyncHandler(async (req, res) => {
  const { action, order_ids: orderIds = [], invoice_number: invoiceNumber, print_layout: printLayout } =
    req.body || {};

  if (!action) {
    return res.status(400).json({ success: false, message: "action is required." });
  }

  if (!orderIds.length) {
    return res.status(400).json({ success: false, message: "order_ids is required." });
  }

  const isA4Grid = action === "print_awb" && printLayout === "a4_grid";

  const results = [];
  const errors = [];
  let lastPdfUrl = null;
  const pdfUrls = [];

  // Keyed by Daraz account id — package IDs are only valid against the
  // credentials of the account that issued them, and a bulk selection can
  // span multiple Daraz accounts.
  const printAwbQueue = new Map();

  // A4 grid mode fetches one label PDF per package (not batched, since we
  // need to know each page is exactly one clean label to impose onto our
  // own grid) — collected here and composed after the main loop.
  const gridLabelBuffers = [];

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

      if (action === "print_awb") {
        const packageIds = await requirePackageId({ account, credentials, order });

        if (isA4Grid) {
          for (const packageId of packageIds) {
            const response = await fulfillmentService.printAwb({ account, credentials, packageIds: [packageId] });
            const result = darazResultOf(response);
            const pdfUrl = result?.data?.pdf_url || result?.pdf_url || null;

            if (!pdfUrl) {
              throw new Error("Daraz didn't return a label PDF for this package.");
            }

            gridLabelBuffers.push(await fetchPdfBytes(pdfUrl));
          }

          results.push({ order_id: orderId, success: true, message: "Queued for A4 sheet" });
          continue;
        }

        const queued = printAwbQueue.get(account.id) || { account, credentials, packageIds: [] };
        queued.packageIds.push(...packageIds);
        printAwbQueue.set(account.id, queued);

        results.push({ order_id: orderId, success: true, message: "Queued for AWB sheet" });
        continue;
      }

      const { response, pdfUrl } = await runAction({ action, account, credentials, order, invoiceNumber });

      if (pdfUrl) lastPdfUrl = pdfUrl;

      results.push({ order_id: orderId, success: true, message: response?.message || "Success" });
    } catch (error) {
      errors.push({ order_id: orderId, reason: error.message || "Daraz action failed" });
    }
  }

  if (isA4Grid) {
    if (gridLabelBuffers.length) {
      try {
        const compositeBytes = await composeAwbGridPdf(gridLabelBuffers);
        pdfUrls.push(`data:application/pdf;base64,${compositeBytes.toString("base64")}`);
      } catch (error) {
        errors.push({ order_id: null, reason: `Failed to compose the A4 label sheet: ${error.message}` });
      }
    }
  } else if (action === "print_awb") {
    for (const { account, credentials, packageIds } of printAwbQueue.values()) {
      for (let i = 0; i < packageIds.length; i += PRINT_AWB_BATCH_SIZE) {
        const chunk = packageIds.slice(i, i + PRINT_AWB_BATCH_SIZE);

        try {
          const response = await fulfillmentService.printAwb({ account, credentials, packageIds: chunk });
          const result = darazResultOf(response);
          const pdfUrl = result?.data?.pdf_url || result?.pdf_url || null;
          if (pdfUrl) pdfUrls.push(pdfUrl);
        } catch (error) {
          errors.push({
            order_id: null,
            reason: `AWB sheet for ${chunk.length} package(s) failed: ${error.message || "Daraz action failed"}`,
          });
        }
      }
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
    data: { results, errors, pdf_url: pdfUrls[0] || lastPdfUrl, pdf_urls: pdfUrls.length ? pdfUrls : undefined },
  });
});

module.exports = { runBulkAction };
