const accountModel = require("../../models/daraz/daraz_account/daraz_account_model");
const categoryModel = require("../../models/daraz/categories/daraz_category_model");
const productSyncModel = require("../../models/daraz/products_models/sync/daraz_product_sync_model");
const darazApi = require("./daraz_api_client");

const getCountryCode = (account = {}) => account.country_code || "LK";

const flattenAndSaveCategories = async ({ categories = [], countryCode = "LK", parentId = null, parentPath = "", level = 1 }) => {
  let count = 0;

  for (const category of categories) {
    const categoryId = category.category_id || category.categoryId || category.id;
    const categoryName = category.name || category.category_name || category.label;
    const children = category.children || category.ChildCategory || category.child_categories || [];
    const isLeaf = category.leaf === true || category.is_leaf === true || !children.length;
    const path = parentPath ? `${parentPath} > ${categoryName}` : categoryName;

    if (categoryId && categoryName) {
      await categoryModel.upsertCategory({
        country_code: countryCode,
        category_id: categoryId,
        parent_category_id: parentId,
        category_name: categoryName,
        category_path: path,
        is_leaf: isLeaf,
        level_no: level,
        raw_json: category
      });
      count += 1;
    }

    if (Array.isArray(children) && children.length > 0) {
      count += await flattenAndSaveCategories({ categories: children, countryCode, parentId: categoryId, parentPath: path, level: level + 1 });
    }
  }

  return count;
};

const fetchCategoryTree = async (account) => {
  return darazApi.callDarazApi({
    account,
    apiPath: "/category/tree/get",
    method: "GET",
    params: {},
    requiresAuth: false,
    retry: 1
  });
};

const syncCategoryTree = async (account = null) => {
  const startedAt = new Date();
  const activeAccount = account || await accountModel.getDefaultAccount() || {};

  try {
    const response = await fetchCategoryTree(activeAccount);
    const categories = response.data || response.categories || [];
    const synced = await flattenAndSaveCategories({ categories, countryCode: getCountryCode(activeAccount) });

    if (activeAccount.id) await accountModel.updateLastSync(activeAccount, "last_category_sync_at");

    await productSyncModel.createSyncLog({
      account_id: activeAccount.id || null,
      account_code: activeAccount.account_code || null,
      account_name: activeAccount.account_name || null,
      module: "categories",
      sync_type: "manual",
      status: "success",
      message: `Category tree synced. Total categories: ${synced}`,
      started_at: startedAt,
      finished_at: new Date()
    });

    return { success: true, total_categories: synced, raw: response };
  } catch (error) {
    await productSyncModel.createSyncLog({
      account_id: activeAccount.id || null,
      account_code: activeAccount.account_code || null,
      account_name: activeAccount.account_name || null,
      module: "categories",
      sync_type: "manual",
      status: "failed",
      message: error.message,
      error,
      started_at: startedAt,
      finished_at: new Date()
    });
    throw error;
  }
};

const fetchCategoryAttributes = async (account, categoryId) => {
  return darazApi.callDarazApi({
    account,
    apiPath: "/category/attributes/get",
    method: "GET",
    params: {
      primary_category_id: String(categoryId),
      language_code: "en_US"
    },
    requiresAuth: false,
    retry: 1
  });
};

const syncCategoryAttributes = async (categoryId, account = null) => {
  const activeAccount = account || await accountModel.getDefaultAccount() || {};
  const response = await fetchCategoryAttributes(activeAccount, categoryId);
  const attributes = response.data || response.attributes || [];

  for (const attribute of attributes) {
    await categoryModel.upsertAttribute({
      country_code: getCountryCode(activeAccount),
      category_id: categoryId,
      attribute
    });
  }

  return { success: true, category_id: categoryId, total_attributes: attributes.length, attributes, raw: response };
};

const fetchCategoryBrands = async (account, categoryId) => {
  return darazApi.callDarazApi({
    account,
    apiPath: "/category/brands/query",
    method: "GET",
    params: { category_id: String(categoryId) },
    requiresAuth: false,
    retry: 1
  });
};

const syncCategoryBrands = async (categoryId, account = null) => {
  const activeAccount = account || await accountModel.getDefaultAccount() || {};
  const response = await fetchCategoryBrands(activeAccount, categoryId);
  const brands = response.data || response.brands || [];

  for (const brand of brands) {
    await categoryModel.upsertBrand({
      country_code: getCountryCode(activeAccount),
      category_id: categoryId,
      brand
    });
  }

  return { success: true, category_id: categoryId, total_brands: brands.length, brands, raw: response };
};

module.exports = {
  syncCategoryTree,
  syncCategoryAttributes,
  syncCategoryBrands,
  fetchCategoryTree,
  fetchCategoryAttributes,
  fetchCategoryBrands
};
