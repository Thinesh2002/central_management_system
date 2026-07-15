const asyncHandler = require("../../../middleware/async_handler.js");
const model = require("../../../models/product_management/product/product_price_model.js");
const productLogModel = require("../../../models/product_management/product/product_log_model.js");
const priceHistoryModel = require("../../../models/product_management/product/price_history_model.js");

const TABLE_LABEL = "Product price";

function getUserId(req) {
  return (
    req?.user?.id ||
    req?.user?.user_id ||
    req?.auth?.id ||
    req?.body?.created_by ||
    req?.body?.updated_by ||
    req?.headers?.["x-user-id"] ||
    null
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

function notFoundError() {
  const error = new Error(`${TABLE_LABEL} not found`);
  error.statusCode = 404;
  return error;
}

function badRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function getSku(req, row = {}) {
  return cleanString(
    req?.params?.sku ||
      req?.query?.sku ||
      req?.body?.sku ||
      req?.body?.variant_sku ||
      req?.body?.product_sku ||
      req?.body?.item_sku ||
      req?.body?.local_sku ||
      row?.sku ||
      row?.variant_sku ||
      row?.product_sku ||
      row?.item_sku ||
      row?.local_sku
  );
}

function toMoney(value) {
  if (value === undefined || value === null || value === "") return undefined;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return undefined;
  }

  return Number(numberValue.toFixed(2));
}

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizePriceBody(body = {}) {
  const payload = { ...body };

  const salePrice = pickFirstDefined(
    body.sale_price,
    body.sales_price,
    body.selling_price,
    body.sell_price,
    body.price,
    body.salePrice,
    body.salesPrice,
    body.sellingPrice
  );

  const costPrice = pickFirstDefined(
    body.cost_price,
    body.cost,
    body.buying_price,
    body.purchase_price,
    body.costPrice,
    body.buyingPrice,
    body.purchasePrice
  );

  if (salePrice !== undefined) {
    payload.sale_price = toMoney(salePrice);
  }

  if (costPrice !== undefined) {
    payload.cost_price = toMoney(costPrice);
  }

  delete payload.sales_price;
  delete payload.selling_price;
  delete payload.sell_price;
  delete payload.price;
  delete payload.salePrice;
  delete payload.salesPrice;
  delete payload.sellingPrice;

  delete payload.cost;
  delete payload.buying_price;
  delete payload.purchase_price;
  delete payload.costPrice;
  delete payload.buyingPrice;
  delete payload.purchasePrice;

  // Removed / unwanted old relation columns only.
  // Do not remove currency / Daraz / Woo / product selling fields because price dashboard uses them.
  delete payload.product_id;
  delete payload.variant_id;
  delete payload.price_type;
  delete payload.regular_price;
  delete payload.start_date;
  delete payload.end_date;

  return payload;
}

function hasRealUpdateFields(payload = {}) {
  const allowedFields = [
    "sale_price",
    "cost_price",
    "local_selling_price",
    "daraz_price",
    "woo_price",
    "profit_percent",
    "daraz_fee_percent",
    "advertising_percent",
    "packing_percent",
    "currency",
    "status",
    "product_name",
    "image_url",
    "colour_name",
    "sku",
    "variant_sku",
    "product_sku",
    "item_sku",
    "local_sku",
  ];

  return allowedFields.some((field) => payload[field] !== undefined);
}

function compactLogData(record) {
  if (!record || typeof record !== "object") return record;

  const {
    product_id,
    variant_id,
    price_type,
    currency,
    regular_price,
    start_date,
    end_date,
    ...rest
  } = record;

  return rest;
}

function valuesAreSame(beforeValue, afterValue) {
  const before = beforeValue === null || beforeValue === undefined ? "" : String(beforeValue);
  const after = afterValue === null || afterValue === undefined ? "" : String(afterValue);

  return before === after;
}

function getChangedFields(before = {}, after = {}, payload = {}) {
  const fields = Object.keys(payload).filter(
    (key) =>
      ![
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
        "deleted_at",
      ].includes(key)
  );

  const changed = {};

  for (const field of fields) {
    if (!valuesAreSame(before?.[field], after?.[field])) {
      changed[field] = {
        before: before?.[field] ?? null,
        after: after?.[field] ?? null,
      };
    }
  }

  return changed;
}

async function writeProductLog(req, action, recordId, beforeData, afterData) {
  try {
    await productLogModel.insertMatching({
      action,
      action_type: action,
      table_name: model.tableName,
      module_name: "local_products",
      record_id: recordId || null,
      product_id: null,

      sku: afterData?.sku || beforeData?.sku || getSku(req) || null,

      before_data: beforeData ? JSON.stringify(compactLogData(beforeData)) : null,
      after_data: afterData ? JSON.stringify(compactLogData(afterData)) : null,
      old_data: beforeData ? JSON.stringify(compactLogData(beforeData)) : null,
      new_data: afterData ? JSON.stringify(compactLogData(afterData)) : null,

      changed_by: getUserId(req),
      user_id: getUserId(req),
      ip_address: req.ip || null,
      user_agent: req.get ? req.get("user-agent") : null,
    });
  } catch (error) {
    console.warn("[PRODUCT_PRICE_LOG_WARNING]", error.message);
  }
}

const list = asyncHandler(async (req, res) => {
  const result = await model.list(req.query || {});

  return sendSuccess(res, 200, `${TABLE_LABEL} list loaded`, result.data, {
    prices: result.data,
    rows: result.data,
    pagination: result.pagination,
  });
});

const getById = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);

  if (!row) throw notFoundError();

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, row, {
    price: row,
  });
});

const getBySku = asyncHandler(async (req, res) => {
  const sku = getSku(req);

  if (!sku) {
    throw badRequestError("SKU is required.");
  }

  const row =
    typeof model.findBySku === "function" ? await model.findBySku(sku) : null;

  if (!row) throw notFoundError();

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, row, {
    price: row,
  });
});

// Cost price is treated as sensitive the same way the frontend's
// useCanViewCostPrice() hook gates the Cost column - master_admin or admin
// only, checked here since these routes otherwise carry no auth middleware.
const costHistory = asyncHandler(async (req, res) => {
  const role = req.user?.role;

  if (role !== "master_admin" && role !== "admin") {
    const error = new Error("You do not have permission to view cost price history.");
    error.statusCode = 403;
    throw error;
  }

  const sku = getSku(req);
  if (!sku) throw badRequestError("SKU is required.");

  const rows = await priceHistoryModel.listBySku(sku, { field_name: "cost_price" });

  return sendSuccess(res, 200, "Cost price history loaded", rows);
});

const create = asyncHandler(async (req, res) => {
  const sku = getSku(req);

  if (!sku) {
    throw badRequestError("SKU is required.");
  }

  const payload = normalizePriceBody({
    ...(req.body || {}),
    sku,
  });

  if (!hasRealUpdateFields(payload)) {
    throw badRequestError("No valid price fields supplied.");
  }

  console.log("[PRODUCT_PRICE_CREATE_PAYLOAD]", payload);

  const created =
    typeof model.upsertBySku === "function"
      ? await model.upsertBySku(payload, { userId: getUserId(req) })
      : await model.create(payload, { userId: getUserId(req) });

  await writeProductLog(
    req,
    "CREATE_PRODUCT_PRICE",
    created?.id || null,
    null,
    created
  );

  return sendSuccess(res, 201, `${TABLE_LABEL} saved successfully`, created, {
    price: created,
  });
});

const update = asyncHandler(async (req, res) => {
  const before = await model.findById(req.params.id);

  if (!before) throw notFoundError();

  const payload = normalizePriceBody(req.body || {});

  if (!hasRealUpdateFields(payload)) {
    throw badRequestError(
      "No valid price fields supplied. Send cost price, product selling price, Daraz price or Woo price."
    );
  }

  console.log("[PRODUCT_PRICE_UPDATE_BY_ID_PAYLOAD]", {
    id: req.params.id,
    payload,
  });

  const updated = await model.updateById(req.params.id, payload, {
    userId: getUserId(req),
  });

  if (!updated) throw notFoundError();

  const changedFields = getChangedFields(before, updated, payload);

  console.log("[PRODUCT_PRICE_UPDATE_BY_ID_RESULT]", {
    id: req.params.id,
    changedFields,
    before,
    updated,
  });

  if (!Object.keys(changedFields).length) {
    return res.status(200).json({
      success: false,
      message:
        "Request completed, but no database value changed. Check if same value was submitted or field name is wrong.",
      data: updated,
      price: updated,
    });
  }

  await writeProductLog(
    req,
    "UPDATE_PRODUCT_PRICE",
    req.params.id,
    before,
    updated
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated, {
    price: updated,
    changed_fields: changedFields,
  });
});

const updateBySku = asyncHandler(async (req, res) => {
  const sku = getSku(req);

  if (!sku) {
    throw badRequestError("SKU is required.");
  }

  const before =
    typeof model.findBySku === "function" ? await model.findBySku(sku) : null;

  if (!before) throw notFoundError();

  const payload = normalizePriceBody(req.body || {});

  if (!hasRealUpdateFields(payload)) {
    throw badRequestError(
      "No valid price fields supplied. Send cost price, product selling price, Daraz price or Woo price."
    );
  }

  console.log("[PRODUCT_PRICE_UPDATE_BY_SKU_PAYLOAD]", {
    sku,
    payload,
  });

  const updated =
    typeof model.updateBySku === "function"
      ? await model.updateBySku(sku, payload, { userId: getUserId(req) })
      : await model.updateById(before.id, payload, { userId: getUserId(req) });

  if (!updated) throw notFoundError();

  const changedFields = getChangedFields(before, updated, payload);

  console.log("[PRODUCT_PRICE_UPDATE_BY_SKU_RESULT]", {
    sku,
    changedFields,
    before,
    updated,
  });

  if (!Object.keys(changedFields).length) {
    return res.status(200).json({
      success: false,
      message:
        "Request completed, but no database value changed. Check if same value was submitted or field name is wrong.",
      data: updated,
      price: updated,
    });
  }

  await writeProductLog(
    req,
    "UPDATE_PRODUCT_PRICE",
    updated?.id || before?.id || null,
    before,
    updated
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated, {
    price: updated,
    changed_fields: changedFields,
  });
});

const patch = update;
const patchBySku = updateBySku;

const remove = asyncHandler(async (req, res) => {
  const removed = await model.removeById(req.params.id);

  if (!removed) throw notFoundError();

  await writeProductLog(
    req,
    "DELETE_PRODUCT_PRICE",
    req.params.id,
    removed,
    null
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} deleted successfully`, removed, {
    price: removed,
  });
});

const removeBySku = asyncHandler(async (req, res) => {
  const sku = getSku(req);

  if (!sku) {
    throw badRequestError("SKU is required.");
  }

  const removed =
    typeof model.removeBySku === "function" ? await model.removeBySku(sku) : null;

  if (!removed) throw notFoundError();

  await writeProductLog(
    req,
    "DELETE_PRODUCT_PRICE",
    removed?.id || null,
    removed,
    null
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} deleted successfully`, removed, {
    price: removed,
  });
});

module.exports = {
  list,
  getById,
  getBySku,
  costHistory,
  create,
  update,
  updateBySku,
  patch,
  patchBySku,
  remove,
  removeBySku,
};