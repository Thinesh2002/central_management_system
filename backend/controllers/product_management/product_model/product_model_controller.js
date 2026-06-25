const productModel = require("../../../models/product_management/product_model/product_model");

function getErrorStatus(error) {
  const message = String(error.message || "").toLowerCase();

  if (
    message.includes("required") ||
    message.includes("invalid") ||
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

async function listModels(req, res) {
  try {
    const result = await productModel.list(req.query);

    return res.json({
      success: true,
      message: "Product models loaded successfully.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_LIST_ERROR]", error);
    return sendError(res, error);
  }
}

async function getModel(req, res) {
  try {
    const model = await productModel.getById(req.params.id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Product model not found.",
      });
    }

    return res.json({
      success: true,
      message: "Product model loaded successfully.",
      data: model,
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_GET_ERROR]", error);
    return sendError(res, error);
  }
}

async function createModel(req, res) {
  try {
    const model = await productModel.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Product model created successfully.",
      data: model,
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_CREATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function updateModel(req, res) {
  try {
    const model = await productModel.update(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Product model updated successfully.",
      data: model,
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_UPDATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function deleteModel(req, res) {
  try {
    const deleted = await productModel.softDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product model not found or already deleted.",
      });
    }

    return res.json({
      success: true,
      message: "Product model deleted successfully.",
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

async function restoreModel(req, res) {
  try {
    const restored = await productModel.restore(req.params.id);

    if (!restored) {
      return res.status(404).json({
        success: false,
        message: "Product model not found or already active.",
      });
    }

    const model = await productModel.getById(req.params.id);

    return res.json({
      success: true,
      message: "Product model restored successfully.",
      data: model,
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_RESTORE_ERROR]", error);
    return sendError(res, error);
  }
}

async function forceDeleteModel(req, res) {
  try {
    const deleted = await productModel.forceDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product model not found.",
      });
    }

    return res.json({
      success: true,
      message: "Product model permanently deleted successfully.",
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_FORCE_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

async function replaceModelColours(req, res) {
  try {
    const model = await productModel.replaceColours(
      req.params.id,
      req.body.colour_ids
    );

    return res.json({
      success: true,
      message: "Model colours updated successfully.",
      data: model,
    });
  } catch (error) {
    console.error("[PRODUCT_MODEL_COLOURS_UPDATE_ERROR]", error);
    return sendError(res, error);
  }
}

module.exports = {
  listModels,
  getModel,
  createModel,
  updateModel,
  deleteModel,
  restoreModel,
  forceDeleteModel,
  replaceModelColours,
};