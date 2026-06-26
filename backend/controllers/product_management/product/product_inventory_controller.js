const asyncHandler = require("../../../middleware/async_handler.js");
const model = require("../../../models/product_management/product/product_inventory_model.js");
const productLogModel = require("../../../models/product_management/product/product_log_model.js");

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

  return sendSuccess(
    res,
    before ? 200 : 201,
    before
      ? `${TABLE_LABEL} updated successfully`
      : `${TABLE_LABEL} created successfully`,
    saved
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

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated);
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

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated);
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