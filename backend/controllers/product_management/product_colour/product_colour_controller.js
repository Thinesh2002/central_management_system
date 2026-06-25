const productColour = require("../../../models/product_management/product_colour/product_colour_model");

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

async function listColours(req, res) {
  try {
    const result = await productColour.list(req.query);

    return res.json({
      success: true,
      message: "Product colours loaded successfully.",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_LIST_ERROR]", error);
    return sendError(res, error);
  }
}

async function getColour(req, res) {
  try {
    const colour = await productColour.getById(req.params.id);

    if (!colour) {
      return res.status(404).json({
        success: false,
        message: "Product colour not found.",
      });
    }

    return res.json({
      success: true,
      message: "Product colour loaded successfully.",
      data: colour,
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_GET_ERROR]", error);
    return sendError(res, error);
  }
}

async function createColour(req, res) {
  try {
    const colour = await productColour.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Product colour created successfully.",
      data: colour,
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_CREATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function updateColour(req, res) {
  try {
    const colour = await productColour.update(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Product colour updated successfully.",
      data: colour,
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_UPDATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function deleteColour(req, res) {
  try {
    const deleted = await productColour.softDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product colour not found or already deleted.",
      });
    }

    return res.json({
      success: true,
      message: "Product colour deleted successfully.",
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

async function restoreColour(req, res) {
  try {
    const restored = await productColour.restore(req.params.id);

    if (!restored) {
      return res.status(404).json({
        success: false,
        message: "Product colour not found or already active.",
      });
    }

    const colour = await productColour.getById(req.params.id);

    return res.json({
      success: true,
      message: "Product colour restored successfully.",
      data: colour,
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_RESTORE_ERROR]", error);
    return sendError(res, error);
  }
}

async function forceDeleteColour(req, res) {
  try {
    const deleted = await productColour.forceDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product colour not found.",
      });
    }

    return res.json({
      success: true,
      message: "Product colour permanently deleted successfully.",
    });
  } catch (error) {
    console.error("[PRODUCT_COLOUR_FORCE_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

module.exports = {
  listColours,
  getColour,
  createColour,
  updateColour,
  deleteColour,
  restoreColour,
  forceDeleteColour,
};