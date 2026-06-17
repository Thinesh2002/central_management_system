const accountModel = require("../../../models/daraz/daraz_account/daraz_account_model");
const inventoryModel = require("../../../models/daraz/inventory/daraz_inventory_model");

exports.getOosSkus = async (req, res) => {
  try {
    const rows = await inventoryModel.getOosSkus({
      account_code: req.query.account_code,
      search: req.query.search,
      limit: req.query.limit
    });
    return res.status(200).json({ success: true, total: rows.length, skus: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz OOS SKUs", error: error.message });
  }
};

exports.addStockUpdateQueue = async (req, res) => {
  try {
    const { account_code, item_id, update_type } = req.body;
    if (!account_code || !item_id || !update_type) {
      return res.status(400).json({ success: false, message: "account_code, item_id and update_type are required" });
    }

    const account = await accountModel.getAccountByCode(account_code);
    const id = await inventoryModel.addStockUpdateQueue({
      ...req.body,
      account_id: account?.id || null,
      requested_by: req.user?.email || req.body.requested_by || "system"
    });

    return res.status(201).json({ success: true, message: "Stock/price update queued", id });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to queue stock update", error: error.message });
  }
};

exports.getStockQueue = async (req, res) => {
  try {
    const rows = await inventoryModel.getStockQueue({ status: req.query.status || "pending", limit: req.query.limit });
    return res.status(200).json({ success: true, total: rows.length, queue: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch stock queue", error: error.message });
  }
};
