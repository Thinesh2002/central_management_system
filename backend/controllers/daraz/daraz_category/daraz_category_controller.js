const accountModel = require("../../../models/daraz/daraz_account/daraz_account_model");
const categoryModel = require("../../../models/daraz/categories/daraz_category_model");
const categorySyncService = require("../../../services/daraz/daraz_category_sync_service");

const getAccount = async (accountCode) => {
  if (accountCode) return accountModel.getAccountByCode(accountCode);
  return accountModel.getDefaultAccount();
};

exports.syncCategoryTree = async (req, res) => {
  try {
    const account = await getAccount(req.query.account_code);
    const result = await categorySyncService.syncCategoryTree(account);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to sync Daraz category tree", error: error.message });
  }
};

exports.getCategoryTree = async (req, res) => {
  try {
    if (req.query.live === "true") {
      const account = await getAccount(req.query.account_code);
      const result = await categorySyncService.syncCategoryTree(account);
      return res.status(200).json(result);
    }

    const categories = await categoryModel.getCategories({
      country_code: req.query.country_code || "LK",
      leaf_only: req.query.leaf_only,
      search: req.query.search,
      limit: req.query.limit
    });

    return res.status(200).json({ success: true, total: categories.length, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz categories", error: error.message });
  }
};

exports.getCategoryAttributes = async (req, res) => {
  try {
    const { category_id } = req.query;
    if (!category_id) return res.status(400).json({ success: false, message: "category_id is required" });

    if (req.query.live === "true") {
      const account = await getAccount(req.query.account_code);
      const result = await categorySyncService.syncCategoryAttributes(category_id, account);
      return res.status(200).json(result);
    }

    const attributes = await categoryModel.getAttributes(category_id, req.query.country_code || "LK");
    return res.status(200).json({ success: true, category_id, total: attributes.length, attributes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz category attributes", error: error.message });
  }
};

exports.syncCategoryAttributes = async (req, res) => {
  try {
    const { category_id } = req.params;
    const account = await getAccount(req.query.account_code);
    const result = await categorySyncService.syncCategoryAttributes(category_id, account);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to sync Daraz category attributes", error: error.message });
  }
};

exports.getCategoryBrands = async (req, res) => {
  try {
    const { category_id } = req.query;
    if (!category_id) return res.status(400).json({ success: false, message: "category_id is required" });

    if (req.query.live === "true") {
      const account = await getAccount(req.query.account_code);
      const result = await categorySyncService.syncCategoryBrands(category_id, account);
      return res.status(200).json(result);
    }

    const brands = await categoryModel.getBrands(category_id, req.query.country_code || "LK");
    return res.status(200).json({ success: true, category_id, total: brands.length, brands });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Daraz category brands", error: error.message });
  }
};

exports.syncCategoryBrands = async (req, res) => {
  try {
    const { category_id } = req.params;
    const account = await getAccount(req.query.account_code);
    const result = await categorySyncService.syncCategoryBrands(category_id, account);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to sync Daraz category brands", error: error.message });
  }
};
