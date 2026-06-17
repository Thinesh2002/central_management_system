const skuModel = require("../../../models/product/sku_mapping/sku_mapping_model");

// Create or Update
exports.saveMapping = async (req, res) => {
  try {
    const { account_code, daraz_sku, correct_sku, product_id } = req.body;

    if (!account_code || !daraz_sku || !correct_sku) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    await skuModel.upsertMapping({
      account_code,
      daraz_sku,
      correct_sku,
      product_id
    });

    res.json({ message: "Mapping saved successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get mappings
exports.getMappings = async (req, res) => {
  try {
    const { account_code } = req.params;

    const data = await skuModel.getMappings(account_code);

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete mapping
exports.deleteMapping = async (req, res) => {
  try {
    const { account_code, daraz_sku } = req.body;

    await skuModel.deleteMapping(account_code, daraz_sku);

    res.json({ message: "Mapping deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
