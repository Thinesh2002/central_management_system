const skuModel = require("../../../models/product/sku_mapping/sku_mapping_model");

exports.saveMapping = async (req, res) => {
  try {
    const { account_code } = req.body;
    const daraz_sku = req.body.daraz_sku || req.body.daraz_seller_sku;
    const correct_sku = req.body.correct_sku || req.body.system_sku;

    if (!account_code || !daraz_sku || !correct_sku) {
      return res.status(400).json({ success: false, message: "Account code, Daraz SKU and correct system SKU are required." });
    }
    await skuModel.upsertMapping({ ...req.body, daraz_sku, correct_sku });
    res.json({ success: true, message: "SKU mapping saved successfully." });
  } catch (error) {
    console.error("SKU MAPPING SAVE ERROR:", error.message);
    res.status(500).json({ success: false, message: "SKU mapping could not be saved. Please check the SKU mapping table." });
  }
};

exports.getMappings = async (req, res) => {
  try {
    const account_code = req.query.account_code || req.params.account_code || null;
    const data = await skuModel.getMappings(account_code);
    res.json({ success: true, data, rows: data, count: data.length });
  } catch (error) {
    console.error("SKU MAPPING GET ERROR:", error.message);
    res.status(500).json({ success: false, message: "Failed to load SKU mappings." });
  }
};

exports.deleteMapping = async (req, res) => {
  try {
    const { account_code, daraz_sku, daraz_seller_sku } = req.body;
    await skuModel.deleteMapping(account_code, daraz_sku || daraz_seller_sku);
    res.json({ success: true, message: "SKU mapping deleted successfully." });
  } catch (error) {
    console.error("SKU MAPPING DELETE ERROR:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete SKU mapping." });
  }
};
