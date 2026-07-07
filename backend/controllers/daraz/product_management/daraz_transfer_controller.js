const darazTransferService = require("../../../services/daraz/product_management/daraz_transfer_service");

async function transfer(req, res) {
  try {
    const {
      productId,
      accountIds,
      categoryId,
      categoryName,
      brand,
      model,
      shortDescription,
      attributes,
      skuAttributes,
    } = req.body || {};

    const result = await darazTransferService.transferLocalProductToDaraz({
      productId,
      accountIds: Array.isArray(accountIds) ? accountIds : [],
      categoryId,
      categoryName,
      brand,
      model,
      shortDescription,
      attributes,
      skuAttributes,
      updatedBy: req.user?.id || null,
      publicBaseUrl: `${req.protocol}://${req.get("host")}`,
    });

    return res.json({ success: true, message: "Transfer completed.", data: result.results });
  } catch (error) {
    console.error("[DARAZ_TRANSFER_ERROR]", { message: error?.message });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to transfer product to Daraz.",
    });
  }
}

module.exports = { transfer };
