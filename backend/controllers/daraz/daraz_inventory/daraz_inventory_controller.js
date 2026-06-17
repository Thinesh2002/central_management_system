const accountModel = require("../../../models/daraz/daraz_account/daraz_account_model");
const inventoryModel = require("../../../models/daraz/inventory/daraz_inventory_model");

const fail = (res, message, error, status = 500) => res.status(status).json({ success: false, message, error: error?.message || error || undefined });

exports.getInventoryHealth = async (req, res) => {
  try {
    const data = await inventoryModel.getInventoryHealth({
      page: req.query.page,
      limit: req.query.limit,
      account_code: req.query.account_code,
      search: req.query.search,
      mismatch: req.query.mismatch || "all"
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return fail(res, "Daraz inventory health could not be loaded. Check daraz_skus and local inventory tables.", error);
  }
};

exports.getOosSkus = async (req, res) => {
  try {
    const rows = await inventoryModel.getOosSkus({ account_code: req.query.account_code, search: req.query.search, limit: req.query.limit });
    return res.status(200).json({ success: true, total: rows.length, skus: rows, rows });
  } catch (error) {
    return fail(res, "Out-of-stock Daraz SKU list could not be loaded.", error);
  }
};

exports.queueLocalInventorySync = async (req, res) => {
  try {
    const result = await inventoryModel.queueLocalInventorySync({
      account_code: req.body.account_code || req.query.account_code || null,
      requested_by: req.user?.email || req.body.requested_by || "system"
    });
    return res.status(200).json({
      success: true,
      message: `${result.queued} stock/price updates were added to the Daraz update queue.`,
      result
    });
  } catch (error) {
    return fail(res, "Local inventory could not be queued for Daraz sync.", error);
  }
};

exports.addStockUpdateQueue = async (req, res) => {
  try {
    const { account_code, item_id, update_type } = req.body;
    if (!account_code || !item_id || !update_type) return fail(res, "account_code, item_id and update_type are required.", null, 400);

    const account = await accountModel.getAccountByCode(account_code);
    const id = await inventoryModel.addStockUpdateQueue({
      ...req.body,
      account_id: account?.id || account?.account_id || null,
      requested_by: req.user?.email || req.body.requested_by || "system"
    });

    return res.status(201).json({ success: true, message: "Stock/price update added to Daraz queue.", id });
  } catch (error) {
    return fail(res, "Stock update could not be queued.", error);
  }
};

exports.getStockQueue = async (req, res) => {
  try {
    const rows = await inventoryModel.getStockQueue({ status: req.query.status || "pending", limit: req.query.limit });
    return res.status(200).json({ success: true, total: rows.length, queue: rows, rows });
  } catch (error) {
    return fail(res, "Daraz stock queue could not be loaded.", error);
  }
};

exports.getInventoryHistory = async (req, res) => {
  try {
    const rows = await inventoryModel.getInventoryHistory({ account_code: req.query.account_code, seller_sku: req.query.seller_sku, limit: req.query.limit });
    return res.status(200).json({ success: true, total: rows.length, history: rows, rows });
  } catch (error) {
    return fail(res, "Daraz inventory history could not be loaded.", error);
  }
};
