const brighthubModel = require("../../../models/marketplace/brighthub/brighthub_model");
const brighthubApi = require("../../../services/marketplace/brighthub/brighthub_api_service");

async function connectBrightHubAccount(req, res) {
  const startedAt = new Date();

  try {
    const body = req.body || {};

    const test = await brighthubApi.testConnection({
      api_base_url: body.api_base_url,
      api_key: body.api_key,
    });

    if (!test.success) {
      await brighthubModel.logApiRequest({
        endpoint: "/products",
        http_method: "GET",
        request_type: "auth",
        response_status_code: test.status_code,
        api_status: "failed",
        error_message: test.message,
        request_summary: { api_base_url: body.api_base_url, account_code: body.account_code },
        response_summary: test,
        request_time: startedAt,
        response_time: new Date(),
        duration_ms: new Date() - startedAt,
      });

      return res.status(400).json({
        success: false,
        message: "BrightHub connection failed. Check API Base URL and API Key.",
        error: test.message,
      });
    }

    const account = await brighthubModel.createOrUpdateBrightHubAccount(body);

    await brighthubModel.logApiRequest({
      account_id: account.account_id,
      endpoint: "/products",
      http_method: "GET",
      request_type: "auth",
      response_status_code: test.status_code,
      api_status: "success",
      request_summary: { api_base_url: body.api_base_url, account_code: body.account_code },
      response_summary: test,
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.status(201).json({
      success: true,
      message: "BrightHub account connected successfully.",
      account,
      test,
    });
  } catch (error) {
    console.error("[CONNECT_BRIGHTHUB_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to connect BrightHub account.",
      error: error.message,
    });
  }
}

async function listBrightHubAccounts(req, res) {
  try {
    const accounts = await brighthubModel.listBrightHubAccounts();

    return res.json({ success: true, count: accounts.length, data: accounts });
  } catch (error) {
    console.error("[LIST_BRIGHTHUB_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load BrightHub accounts.",
      error: error.message,
    });
  }
}

async function testBrightHubAccount(req, res) {
  const startedAt = new Date();
  const accountId = req.params.accountId;

  try {
    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const test = await brighthubApi.testConnection(credentials);

    await brighthubModel.markBrightHubConnection(accountId, test.success, test.message);

    await brighthubModel.logApiRequest({
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

    return res.status(test.success ? 200 : 400).json({ success: test.success, message: test.message, data: test });
  } catch (error) {
    console.error("[TEST_BRIGHTHUB_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to test BrightHub account.",
      error: error.message,
    });
  }
}

async function getBrightHubProducts(req, res) {
  const startedAt = new Date();
  const accountId = req.params.accountId;

  try {
    const credentials = await brighthubModel.getBrightHubCredentials(accountId);
    const result = await brighthubApi.getProducts(credentials, req.query);

    await brighthubModel.logApiRequest({
      account_id: accountId,
      endpoint: "/products",
      http_method: "GET",
      request_type: "products",
      response_status_code: 200,
      api_status: "success",
      request_summary: req.query,
      response_summary: { total: result.total, total_pages: result.total_pages },
      request_time: startedAt,
      response_time: new Date(),
      duration_ms: new Date() - startedAt,
    });

    return res.json({ success: true, total: result.total, total_pages: result.total_pages, data: result.data });
  } catch (error) {
    console.error("[GET_BRIGHTHUB_PRODUCTS_ERROR]:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load BrightHub products.",
      error: error.message,
    });
  }
}

module.exports = {
  connectBrightHubAccount,
  listBrightHubAccounts,
  testBrightHubAccount,
  getBrightHubProducts,
};
