const darazTransferService = require("../../../services/daraz/product_management/daraz_transfer_service");
const darazTransferAiService = require("../../../services/daraz/product_management/daraz_transfer_ai_service");
const productModel = require("../../../models/product_management/product/product_model");

async function transfer(req, res) {
  try {
    const {
      productId,
      accountIds,
      categoryId,
      categoryName,
      title,
      brand,
      model,
      shortDescription,
      attributes,
      skuAttributes,
      accountContent,
    } = req.body || {};

    const result = await darazTransferService.transferLocalProductToDaraz({
      productId,
      accountIds: Array.isArray(accountIds) ? accountIds : [],
      categoryId,
      categoryName,
      title,
      brand,
      model,
      shortDescription,
      attributes,
      skuAttributes,
      accountContent,
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

async function generateContent(req, res) {
  try {
    const {
      productId,
      accountNames,
      categoryName,
      brand,
      attributeFields,
      existingDescription,
    } = req.body || {};

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required." });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Local product not found." });
    }

    const result = await darazTransferAiService.generateTransferContent({
      product,
      accountNames: Array.isArray(accountNames) ? accountNames : [],
      categoryName,
      brand,
      attributeFields: Array.isArray(attributeFields) ? attributeFields : [],
      existingDescription,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[DARAZ_TRANSFER_AI_FILL_ERROR]", { message: error?.message });

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate AI content for this transfer.",
    });
  }
}

module.exports = { transfer, generateContent };
