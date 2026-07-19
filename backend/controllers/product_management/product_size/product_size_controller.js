const productSize = require("../../../models/product_management/product_size/product_size_model");

function getErrorStatus(error) {
  const message = String(error.message || "").toLowerCase();

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("already exists") ||
    message.includes("assigned")
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

async function listSizes(req, res) {
  try {
    const result = await productSize.list(req.query);

    return res.json({
      success: true,
      message: "Product sizes loaded successfully.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_LIST_ERROR]", error);
    return sendError(res, error);
  }
}

async function getSize(req, res) {
  try {
    const size = await productSize.getById(req.params.id);

    if (!size) {
      return res.status(404).json({
        success: false,
        message: "Product size not found.",
      });
    }

    return res.json({
      success: true,
      message: "Product size loaded successfully.",
      data: size,
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_GET_ERROR]", error);
    return sendError(res, error);
  }
}

async function createSize(req, res) {
  try {
    const size = await productSize.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Product size created successfully.",
      data: size,
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_CREATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function updateSize(req, res) {
  try {
    const size = await productSize.update(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Product size updated successfully.",
      data: size,
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_UPDATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function deleteSize(req, res) {
  try {
    const deleted = await productSize.softDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product size not found or already deleted.",
      });
    }

    return res.json({
      success: true,
      message: "Product size deleted successfully.",
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

async function restoreSize(req, res) {
  try {
    const restored = await productSize.restore(req.params.id);

    if (!restored) {
      return res.status(404).json({
        success: false,
        message: "Product size not found or already active.",
      });
    }

    const size = await productSize.getById(req.params.id);

    return res.json({
      success: true,
      message: "Product size restored successfully.",
      data: size,
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_RESTORE_ERROR]", error);
    return sendError(res, error);
  }
}

async function forceDeleteSize(req, res) {
  try {
    const deleted = await productSize.forceDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product size not found.",
      });
    }

    return res.json({
      success: true,
      message: "Product size permanently deleted successfully.",
    });
  } catch (error) {
    console.error("[PRODUCT_SIZE_FORCE_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

module.exports = {
  listSizes,
  getSize,
  createSize,
  updateSize,
  deleteSize,
  restoreSize,
  forceDeleteSize,
};
