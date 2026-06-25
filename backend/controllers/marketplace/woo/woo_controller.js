const wooModel = require("../../../models/marketplace/woo/woo_model");
const wooApi = require("../../../services/marketplace/woo/woo_api_service");

async function connectWooAccount(req, res) {
  const startedAt = new Date();

  try {
    const body = req.body || {};

    const test = await wooApi.testConnection({
      store_url: body.store_url,
      consumer_key: body.consumer_key,
      consumer_secret: body.consumer_secret,
    });

    if (!test.success) {
      await wooModel.logApiRequest({
        endpoint: "/products",
        http_method: "GET",
        request_type: "auth",
        response_status_code: test.status_code,
        api_status: "failed",
        error_message: test.message,
        request_summary: {
          store_url: body.store_url,
          account_code: body.account_code,
        },
        response_summary: test,
        request_time: startedAt,
        response_time: new Date(),
        duration_ms: new Date() - startedAt,
      });

      return res.status(400).json({
        success: false,
        message:
          "WooCommerce connection failed. Check Store URL, Consumer Key and Consumer Secret.",
        error: test.message,
      });
    }

    const account = await wooModel.createOrUpdateWooAccount(body);

    await wooModel.logApiRequest({
      account_id: account.account_id,
      endpoint: "/products",
      http_method: "GET",
      request_type: "auth",
      response_status_code: test.status_code,
      api_status: "success",
      request_summary: {
        store_url: body.store_url,
        account_code: body.account_code,
      },
      response_summary: test,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(201).json({
      success: true,
      message: "WooCommerce account connected successfully.",
      account,
      test,
    });
  } catch (error) {
    console.error("[CONNECT_WOO_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to connect WooCommerce account.",
      error: error.message,
    });
  }
}

async function listWooAccounts(req, res) {
  try {
    const accounts = await wooModel.listWooAccounts();

    return res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("[LIST_WOO_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load WooCommerce accounts.",
      error: error.message,
    });
  }
}

async function testWooAccount(req, res) {
  const startedAt = new Date();
  const accountId = req.params.accountId;

  try {
    const credentials = await wooModel.getWooCredentials(accountId);
    const test = await wooApi.testConnection(credentials);

    await wooModel.markWooConnection(accountId, test.success, test.message);

    await wooModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products",
      http_method: "GET",
      request_type: "auth",
      response_status_code: test.status_code,
      api_status: test.success ? "success" : "failed",
      error_message: test.success ? null : test.message,
      response_summary: test,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(test.success ? 200 : 400).json({
      success: test.success,
      message: test.message,
      data: test,
    });
  } catch (error) {
    console.error("[TEST_WOO_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to test WooCommerce account.",
      error: error.message,
    });
  }
}

async function getWooProducts(req, res) {
  const startedAt = new Date();
  const accountId = req.params.accountId;

  try {
    const credentials = await wooModel.getWooCredentials(accountId);
    const result = await wooApi.getProducts(credentials, req.query);

    await wooModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products",
      http_method: "GET",
      request_type: "products",
      response_status_code: 200,
      api_status: "success",
      request_summary: req.query,
      response_summary: {
        total: result.total,
        total_pages: result.total_pages,
      },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({
      success: true,
      total: result.total,
      total_pages: result.total_pages,
      data: result.data,
    });
  } catch (error) {
    console.error("[GET_WOO_PRODUCTS_ERROR]:", error);

    await wooModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products",
      http_method: "GET",
      request_type: "products",
      api_status: "failed",
      error_message: error.message,
      request_summary: req.query,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load WooCommerce products.",
      error: error.message,
    });
  }
}

async function getWooOrders(req, res) {
  const startedAt = new Date();
  const accountId = req.params.accountId;

  try {
    const credentials = await wooModel.getWooCredentials(accountId);
    const result = await wooApi.getOrders(credentials, req.query);

    await wooModel.logApiRequest({
      account_id: accountId,
      endpoint: "/orders",
      http_method: "GET",
      request_type: "orders",
      response_status_code: 200,
      api_status: "success",
      request_summary: req.query,
      response_summary: {
        total: result.total,
        total_pages: result.total_pages,
      },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({
      success: true,
      total: result.total,
      total_pages: result.total_pages,
      data: result.data,
    });
  } catch (error) {
    console.error("[GET_WOO_ORDERS_ERROR]:", error);

    await wooModel.logApiRequest({
      account_id: accountId,
      endpoint: "/orders",
      http_method: "GET",
      request_type: "orders",
      api_status: "failed",
      error_message: error.message,
      request_summary: req.query,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to load WooCommerce orders.",
      error: error.message,
    });
  }
}

async function getWooCategories(req, res) {
  const startedAt = new Date();
  const accountId = req.params.accountId;

  try {
    const credentials = await wooModel.getWooCredentials(accountId);
    const result = await wooApi.getCategories(credentials, req.query);

    await wooModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products/categories",
      http_method: "GET",
      request_type: "products",
      response_status_code: 200,
      api_status: "success",
      request_summary: req.query,
      response_summary: {
        total: result.total,
        total_pages: result.total_pages,
      },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({
      success: true,
      total: result.total,
      total_pages: result.total_pages,
      data: result.data,
    });
  } catch (error) {
    console.error("[GET_WOO_CATEGORIES_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load WooCommerce categories.",
      error: error.message,
    });
  }
}

module.exports = {
  connectWooAccount,
  listWooAccounts,
  testWooAccount,
  getWooProducts,
  getWooOrders,
  getWooCategories,
};