const skuMapping = require("../../../models/product_management/sku_mapping/sku_mapping_model");

function getUserId(req) {
  return req?.user?.id || req?.user?.user_id || null;
}

function getErrorStatus(error) {
  const message = String(error.message || "").toLowerCase();

  if (
    message.includes("required") ||
    message.includes("cannot be the same") ||
    message.includes("already exists")
  ) {
    return 400;
  }

  if (message.includes("not found")) {
    return 404;
  }

  return 500;
}

function sendError(res, error) {
  const statusCode = getErrorStatus(error);

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
}

async function listMappings(req, res) {
  try {
    const result = await skuMapping.list(req.query);

    return res.json({
      success: true,
      message: "SKU mappings loaded successfully.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[SKU_MAPPING_LIST_ERROR]", error);
    return sendError(res, error);
  }
}

async function getMapping(req, res) {
  try {
    const mapping = await skuMapping.getById(req.params.id);

    if (!mapping) {
      return res.status(404).json({ success: false, message: "SKU mapping not found." });
    }

    return res.json({
      success: true,
      message: "SKU mapping loaded successfully.",
      data: mapping,
    });
  } catch (error) {
    console.error("[SKU_MAPPING_GET_ERROR]", error);
    return sendError(res, error);
  }
}

async function createMapping(req, res) {
  try {
    const mapping = await skuMapping.create(req.body, { userId: getUserId(req) });

    return res.status(201).json({
      success: true,
      message: "SKU mapping created successfully.",
      data: mapping,
    });
  } catch (error) {
    console.error("[SKU_MAPPING_CREATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function updateMapping(req, res) {
  try {
    const mapping = await skuMapping.update(req.params.id, req.body, { userId: getUserId(req) });

    return res.json({
      success: true,
      message: "SKU mapping updated successfully.",
      data: mapping,
    });
  } catch (error) {
    console.error("[SKU_MAPPING_UPDATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function deleteMapping(req, res) {
  try {
    const deleted = await skuMapping.remove(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "SKU mapping not found." });
    }

    return res.json({ success: true, message: "SKU mapping deleted successfully." });
  } catch (error) {
    console.error("[SKU_MAPPING_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

module.exports = {
  listMappings,
  getMapping,
  createMapping,
  updateMapping,
  deleteMapping,
};
