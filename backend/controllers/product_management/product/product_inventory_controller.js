const asyncHandler = require("../../../middleware/async_handler.js");
const model = require("../../../models/product_management/product/product_inventory_model.js");
const productLogModel = require("../../../models/product_management/product/product_log_model.js");
const darazInventorySyncService = require("../../../services/daraz/inventory/daraz_inventory_sync_service.js");
const wooInventorySyncService = require("../../../services/woo/inventory/woo_inventory_sync_service.js");
const inventoryCostPriceService = require("../../../services/product_management/inventory_cost_price_service.js");

const TABLE_LABEL = "Product inventory";

function getUserId(req) {
  return (
    req?.user?.id ||
    req?.user?.user_id ||
    req?.auth?.id ||
    req?.body?.created_by ||
    req?.body?.updated_by ||
    null
  );
}

function normalizeSku(value) {
  return String(value || "").trim();
}

function getSkuFromReq(req) {
  return normalizeSku(
    req?.params?.sku ||
      req?.query?.sku ||
      req?.body?.sku ||
      req?.body?.variant_sku ||
      req?.body?.product_sku ||
      req?.body?.local_sku ||
      req?.body?.seller_sku ||
      ""
  );
}

function sendSuccess(res, statusCode, message, data, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
}

function makeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function notFoundError() {
  return makeError(`${TABLE_LABEL} not found`, 404);
}

function skuRequiredError() {
  return makeError("SKU is required for product inventory.", 400);
}


function queueInventorySyncToDaraz(req, saved) {
  const shouldSync = String(
    req?.body?.sync_daraz ??
      req?.body?.syncDaraz ??
      req?.query?.sync_daraz ??
      "true"
  ).toLowerCase() !== "false";

  if (!shouldSync || !saved?.sku) {
    return { queued: false, skipped: true, message: "Daraz stock sync skipped." };
  }

  darazInventorySyncService
    .pushSkuStockToDaraz({
      sku: saved.sku,
      quantity: saved.stock_qty ?? saved.total_stock ?? saved.quantity ?? 0,
      source: "inventory_update",
      userId: getUserId(req),
    })
    .catch((error) => {
      console.error("[INVENTORY_DARAZ_STOCK_SYNC_ERROR]", {
        sku: saved.sku,
        message: error?.message,
        code: error?.code || null,
        daraz: error?.daraz || null,
      });
    });

  return { queued: true, message: "Daraz stock sync queued in background." };
}

// Moved here from the (now-removed) GRN receiving flow - manual stock
// updates on the Inventory Dashboard now push to Woo the same way GRN
// receipts used to.
function queueInventorySyncToWoo(req, saved) {
  const shouldSync = String(
    req?.body?.sync_woo ?? req?.body?.syncWoo ?? req?.query?.sync_woo ?? "true"
  ).toLowerCase() !== "false";

  if (!shouldSync || !saved?.sku) {
    return { queued: false, skipped: true, message: "Woo stock sync skipped." };
  }

  wooInventorySyncService
    .pushSkuStockToWoo({
      sku: saved.sku,
      quantity: saved.stock_qty ?? saved.total_stock ?? saved.quantity ?? 0,
      source: "inventory_update",
      userId: getUserId(req),
    })
    .catch((error) => {
      console.error("[INVENTORY_WOO_STOCK_SYNC_ERROR]", { sku: saved.sku, message: error?.message });
    });

  return { queued: true, message: "Woo stock sync queued in background." };
}

// Moved here from the (now-removed) GRN receiving flow - if the caller
// supplies a cost_price alongside the stock update (i.e. "I just received
// stock at this price"), log it the same way a GRN line item used to:
// update product_prices.cost_price, log to price_history, refresh
// suggested prices. Fire-and-forget, never blocks the inventory save.
function queueCostPriceUpdate(req, saved) {
  const costPrice = req?.body?.cost_price;

  if (costPrice === undefined || costPrice === null || costPrice === "" || !saved?.sku) return;

  inventoryCostPriceService
    .updateCostPrice({ sku: saved.sku, unitCost: costPrice, changedBy: getUserId(req) })
    .catch((error) => {
      console.error("[INVENTORY_COST_PRICE_QUEUE_ERROR]", { sku: saved.sku, message: error?.message });
    });
}

async function writeProductLog(req, action, recordId, beforeData, afterData) {
  const userId = getUserId(req);
  const sku = afterData?.sku || beforeData?.sku || req?.params?.sku || req?.body?.sku || null;

  await productLogModel.insertMatching({
    action,
    action_type: action,
    table_name: model.tableName,
    module_name: "local_products",
    record_id: recordId || afterData?.id || beforeData?.id || null,

    // product_id and variant_id removed from inventory.
    // Keep product_id null. Full SKU details are inside before_data / after_data.
    product_id: null,
    sku,

    before_data: beforeData ? JSON.stringify(beforeData) : null,
    after_data: afterData ? JSON.stringify(afterData) : null,
    old_data: beforeData ? JSON.stringify(beforeData) : null,
    new_data: afterData ? JSON.stringify(afterData) : null,

    changed_by: userId,
    user_id: userId,
    ip_address: req.ip || null,
    user_agent: req.get ? req.get("user-agent") : null,
  });
}

const list = asyncHandler(async (req, res) => {
  const result = await model.list(req.query || {});

  return sendSuccess(res, 200, `${TABLE_LABEL} list loaded`, result.data, {
    pagination: result.pagination,
  });
});

const getById = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);

  if (!row) throw notFoundError();

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, row);
});

const getBySku = asyncHandler(async (req, res) => {
  const sku = getSkuFromReq(req);

  if (!sku) throw skuRequiredError();

  const row = await model.findBySku(sku);

  if (!row) throw notFoundError();

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, row);
});

const create = asyncHandler(async (req, res) => {
  const sku = getSkuFromReq(req);

  if (!sku) throw skuRequiredError();

  const before = await model.findBySku(sku);

  const saved = await model.upsertBySku(
    sku,
    {
      ...(req.body || {}),
      sku,
    },
    { userId: getUserId(req) }
  );

  await writeProductLog(
    req,
    before ? "UPDATE_PRODUCT_INVENTORY_BY_SKU" : "CREATE_PRODUCT_INVENTORY",
    saved?.id || before?.id || null,
    before,
    saved
  );

  const darazSync = queueInventorySyncToDaraz(req, saved);
  const wooSync = queueInventorySyncToWoo(req, saved);
  queueCostPriceUpdate(req, saved);

  return sendSuccess(
    res,
    before ? 200 : 201,
    before
      ? `${TABLE_LABEL} updated successfully`
      : `${TABLE_LABEL} created successfully`,
    saved,
    { daraz_sync: darazSync, woo_sync: wooSync }
  );
});

const update = asyncHandler(async (req, res) => {
  const before = await model.findById(req.params.id);

  if (!before) throw notFoundError();

  const updated = await model.updateById(req.params.id, req.body || {}, {
    userId: getUserId(req),
  });

  if (!updated) throw notFoundError();

  await writeProductLog(
    req,
    "UPDATE_PRODUCT_INVENTORY",
    req.params.id,
    before,
    updated
  );

  const darazSync = queueInventorySyncToDaraz(req, updated);
  const wooSync = queueInventorySyncToWoo(req, updated);
  queueCostPriceUpdate(req, updated);

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated, {
    daraz_sync: darazSync,
    woo_sync: wooSync,
  });
});

const updateBySku = asyncHandler(async (req, res) => {
  const sku = getSkuFromReq(req);

  if (!sku) throw skuRequiredError();

  const before = await model.findBySku(sku);

  if (!before) throw notFoundError();

  const updated = await model.updateBySku(
    sku,
    {
      ...(req.body || {}),
      sku,
    },
    { userId: getUserId(req) }
  );

  if (!updated) throw notFoundError();

  await writeProductLog(
    req,
    "UPDATE_PRODUCT_INVENTORY_BY_SKU",
    updated?.id || before?.id || null,
    before,
    updated
  );

  const darazSync = queueInventorySyncToDaraz(req, updated);
  const wooSync = queueInventorySyncToWoo(req, updated);
  queueCostPriceUpdate(req, updated);

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated, {
    daraz_sync: darazSync,
    woo_sync: wooSync,
  });
});

const patch = update;
const patchBySku = updateBySku;

const remove = asyncHandler(async (req, res) => {
  const removed = await model.removeById(req.params.id, {
    userId: getUserId(req),
  });

  if (!removed) throw notFoundError();

  await writeProductLog(
    req,
    "DELETE_PRODUCT_INVENTORY",
    req.params.id,
    removed,
    null
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} deleted successfully`, removed);
});

const removeBySku = asyncHandler(async (req, res) => {
  const sku = getSkuFromReq(req);

  if (!sku) throw skuRequiredError();

  const before = await model.findBySku(sku);

  if (!before) throw notFoundError();

  const removed = await model.removeBySku(sku, {
    userId: getUserId(req),
  });

  if (!removed) throw notFoundError();

  await writeProductLog(
    req,
    "DELETE_PRODUCT_INVENTORY_BY_SKU",
    before?.id || null,
    before,
    null
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} deleted successfully`, removed);
});

module.exports = {
  list,

  getById,
  getBySku,

  create,

  update,
  updateBySku,

  patch,
  patchBySku,

  remove,
  removeBySku,
};