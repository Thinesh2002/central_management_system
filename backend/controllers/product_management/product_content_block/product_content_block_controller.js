const productContentBlock = require("../../../models/product_management/product_content_block/product_content_block_model");

function getUserId(req) {
  return req.user?.id || req.user?.user_id || null;
}

function getErrorStatus(error) {
  const message = String(error.message || "").toLowerCase();

  if (message.includes("required") || message.includes("invalid")) return 400;
  if (message.includes("not found")) return 404;

  return 500;
}

function sendError(res, error) {
  return res.status(getErrorStatus(error)).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
}

async function listBlocks(req, res) {
  try {
    const productId = req.query.product_id;

    if (!productId) {
      return res.status(400).json({ success: false, message: "product_id is required." });
    }

    const blocks = await productContentBlock.listByProduct(productId, { includeInactive: true });

    return res.json({
      success: true,
      message: "Content blocks loaded successfully.",
      data: blocks,
    });
  } catch (error) {
    console.error("[PRODUCT_CONTENT_BLOCK_LIST_ERROR]", error);
    return sendError(res, error);
  }
}

async function createBlock(req, res) {
  try {
    const block = await productContentBlock.create({
      ...req.body,
      created_by: getUserId(req),
      updated_by: getUserId(req),
    });

    return res.status(201).json({
      success: true,
      message: "Content block created successfully.",
      data: block,
    });
  } catch (error) {
    console.error("[PRODUCT_CONTENT_BLOCK_CREATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function updateBlock(req, res) {
  try {
    const block = await productContentBlock.updateById(req.params.id, {
      ...req.body,
      updated_by: getUserId(req),
    });

    return res.json({
      success: true,
      message: "Content block updated successfully.",
      data: block,
    });
  } catch (error) {
    console.error("[PRODUCT_CONTENT_BLOCK_UPDATE_ERROR]", error);
    return sendError(res, error);
  }
}

async function deleteBlock(req, res) {
  try {
    const deleted = await productContentBlock.removeById(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Content block not found." });
    }

    return res.json({ success: true, message: "Content block deleted successfully." });
  } catch (error) {
    console.error("[PRODUCT_CONTENT_BLOCK_DELETE_ERROR]", error);
    return sendError(res, error);
  }
}

async function reorderBlocks(req, res) {
  try {
    const { product_id: productId, ordered_ids: orderedIds } = req.body || {};

    if (!productId || !Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: "product_id and ordered_ids (array) are required.",
      });
    }

    const blocks = await productContentBlock.reorder(productId, orderedIds);

    return res.json({
      success: true,
      message: "Content blocks reordered successfully.",
      data: blocks,
    });
  } catch (error) {
    console.error("[PRODUCT_CONTENT_BLOCK_REORDER_ERROR]", error);
    return sendError(res, error);
  }
}

module.exports = {
  listBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
};
