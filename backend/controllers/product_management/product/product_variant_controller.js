const asyncHandler = require("../../../middleware/async_handler.js");
const model = require("../../../models/product_management/product/product_variant_model.js");
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
      before_data: beforeData ? JSON.stringify(beforeData) : null,
      after_data: afterData ? JSON.stringify(afterData) : null,
      old_data: beforeData ? JSON.stringify(beforeData) : null,
      new_data: afterData ? JSON.stringify(afterData) : null,
      changed_by: getUserId(req),
      user_id: getUserId(req),
      ip_address: req.ip || null,
      user_agent: req.get ? req.get("user-agent") : null,
    });
  } catch (error) {
    console.error("[PRODUCT_VARIANT_LOG_ERROR]", error.message);
  }
}

const list = asyncHandler(async (req, res) => {
  const result = await model.list(req.query || {});

  return sendSuccess(res, 200, `${TABLE_LABEL} list loaded`, result.data, {
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

  return sendSuccess(
    res,
    200,
    `${TABLE_LABEL} order picker list loaded`,
    result.data,
    {
      pagination: result.pagination,
    }
  );
});

const getById = asyncHandler(async (req, res) => {
  const row = await model.findById(req.params.id);

  if (!row) throw notFoundError();

  return sendSuccess(res, 200, `${TABLE_LABEL} loaded`, row);
});

const create = asyncHandler(async (req, res) => {
  const created = await model.create(req.body || {}, {
    userId: getUserId(req),
  });

  await writeProductLog(
    req,
    "CREATE_PRODUCT_VARIANT",
    created?.id || req.params.id || null,
    null,
    created
  );

  return sendSuccess(res, 201, `${TABLE_LABEL} created successfully`, created);
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
    "UPDATE_PRODUCT_VARIANT",
    req.params.id,
    before,
    updated
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} updated successfully`, updated);
});

const patch = update;

const remove = asyncHandler(async (req, res) => {
  const removed = await model.removeById(req.params.id, {
    userId: getUserId(req),
  });

  if (!removed) throw notFoundError();

  await writeProductLog(
    req,
    "DELETE_PRODUCT_VARIANT",
    req.params.id,
    removed,
    null
  );

  return sendSuccess(res, 200, `${TABLE_LABEL} deleted successfully`, removed);
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