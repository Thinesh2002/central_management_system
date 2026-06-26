const asyncHandler = require("../../../middleware/async_handler.js");
const model = require("../../../models/product_management/product/product_variant_model.js");
const productPriceModel = require("../../../models/product_management/product/product_price_model.js");
const productLogModel = require("../../../models/product_management/product/product_log_model.js");

const TABLE_LABEL = "Product variant";

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

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function hasPricePayload(body = {}) {
  return body.cost_price !== undefined || body.sale_price !== undefined;
}

function getVariantSku(variant = {}, body = {}) {
  return cleanString(
    variant.variant_sku ||
      variant.sku ||
      variant.child_sku ||
      variant.local_sku ||
      variant.product_sku ||
      body.variant_sku ||
      body.sku ||
      body.child_sku ||
      body.local_sku ||
      body.product_sku
  );
}

function buildPricePayload(sku, body = {}, userId = null) {
  const payload = {
    sku,
  };

  if (body.cost_price !== undefined) {
    payload.cost_price = body.cost_price;
  }

  if (body.sale_price !== undefined) {
    payload.sale_price = body.sale_price;
  }

  if (userId) {
    payload.created_by = userId;
    payload.updated_by = userId;
  }

  return payload;
}

function compactLogData(record) {
  if (!record || typeof record !== "object") return record;

  const {
    price,
    cost_price,
    sale_price,
    product_price,
    picker_product_price,
    ...rest
  } = record;

  return rest;
}

async function writeProductLog(req, action, recordId, beforeData, afterData) {
  try {
    await productLogModel.insertMatching({
      action,
      action_type: action,
      table_name: model.tableName,
      module_name: "local_products",
      record_id: recordId || null,
      product_id:
        afterData?.product_id ||
        beforeData?.product_id ||
        afterData?.id ||
        beforeData?.id ||
        null,
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
    console.error("[PRODUCT_VARIANT_LOG_ERROR]", error.message);
  }
}

async function attachPrice(variant = null) {
  if (!variant) return variant;

  const sku = getVariantSku(variant);

  if (!sku) {
    return {
      ...variant,
      price: null,
      cost_price: 0,
      sale_price: 0,
      product_price: 0,
      picker_product_price: 0,
    };
  }

  try {
    const price = await productPriceModel.findBySku(sku);

    const salePrice = Number(price?.sale_price || 0);
    const costPrice = Number(price?.cost_price || 0);

    return {
      ...variant,
      price: price || null,
      cost_price: costPrice,
      sale_price: salePrice,
      product_price: salePrice,
      picker_product_price: salePrice,
    };
  } catch (error) {
    console.warn("[PRODUCT_VARIANT_PRICE_ATTACH_WARNING]", error.message);

    return {
      ...variant,
      price: null,
      cost_price: 0,
      sale_price: 0,
      product_price: 0,
      picker_product_price: 0,
    };
  }
}

async function attachPrices(variants = []) {
  if (!Array.isArray(variants) || !variants.length) return variants;

  return Promise.all(variants.map((variant) => attachPrice(variant)));
}

async function saveVariantPrice(req, variant = {}) {
  const body = req.body || {};

  if (!hasPricePayload(body)) return null;

  const sku = getVariantSku(variant, body);

  if (!sku) {
    const error = new Error("SKU is required to save variant price.");
    error.statusCode = 400;
    throw error;
  }

  return productPriceModel.upsertBySku(
    buildPricePayload(sku, body, getUserId(req)),
    {
      userId: getUserId(req),
    }
  );
}

const list = asyncHandler(async (req, res) => {
  const result = await model.list(req.query || {});
  const rowsWithPrices = await attachPrices(result.data || []);

  return sendSuccess(res, 200, `${TABLE_LABEL} list loaded`, rowsWithPrices, {
    variants: rowsWithPrices,
    rows: rowsWithPrices,
    pagination: result.pagination,
  });
});

const listForOrderPicker = asyncHandler(async (req, res) => {
  const query = {
    ...(req.query || {}),
    page: req.query?.page || 1,
    limit: req.query?.limit || 50,
  };

  const result =
    typeof model.listForOrderPicker === "function"
      ? await model.listForOrderPicker(query)
      : await model.list(query);

  const rowsWithPrices = await attachPrices(result.data || []);

  return sendSuccess(
    res,
    200,
    `${TABLE_LABEL} order picker list loaded`,
    rowsWithPrices,
    {
      variants: rowsWithPrices,
      rows: rowsWithPrices,
      pagination: result.pagination,
    }
  );
});

const getById = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);

  if (!row) throw notFoundError();

  const rowWithPrice = await attachPrice(row);

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, rowWithPrice, {
    variant: rowWithPrice,
  });
});

const create = asyncHandler(async (req, res) => {
  const created = await model.create(req.body || {}, {
    userId: getUserId(req),
  });

  await saveVariantPrice(req, created);

  const createdWithPrice = await attachPrice(created);

  await writeProductLog(
    req,
    "CREATE_PRODUCT_VARIANT",
    created?.id || req.params.id || null,
    null,
    createdWithPrice
  );

  return sendSuccess(
    res,
    201,
    `${TABLE_LABEL} created successfully`,
    createdWithPrice,
    {
      variant: createdWithPrice,
    }
  );
});

const update = asyncHandler(async (req, res) => {
  const before = await model.findById(req.params.id);

  if (!before) throw notFoundError();

  const beforeWithPrice = await attachPrice(before);

  const updated = await model.updateById(req.params.id, req.body || {}, {
    userId: getUserId(req),
  });

  if (!updated) throw notFoundError();

  await saveVariantPrice(req, updated);

  const updatedWithPrice = await attachPrice(updated);

  await writeProductLog(
    req,
    "UPDATE_PRODUCT_VARIANT",
    req.params.id,
    beforeWithPrice,
    updatedWithPrice
  );

  return sendSuccess(
    res,
    200,
    `${TABLE_LABEL} updated successfully`,
    updatedWithPrice,
    {
      variant: updatedWithPrice,
    }
  );
});

const patch = update;

const remove = asyncHandler(async (req, res) => {
  const removed = await model.removeById(req.params.id, {
    userId: getUserId(req),
  });

  if (!removed) throw notFoundError();

  const removedWithPrice = await attachPrice(removed);

  await writeProductLog(
    req,
    "DELETE_PRODUCT_VARIANT",
    req.params.id,
    removedWithPrice,
    null
  );

  return sendSuccess(
    res,
    200,
    `${TABLE_LABEL} deleted successfully`,
    removedWithPrice,
    {
      variant: removedWithPrice,
    }
  );
});

module.exports = {
  list,
  listForOrderPicker,
  getById,
  create,
  update,
  patch,
  remove,
};