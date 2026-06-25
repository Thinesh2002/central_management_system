const accountModel = require("../../models/marketplace/account_model");
const syncLogModel = require("../../models/marketplace/sync_log_model");
const tokenService = require("./token_service");
const darazApiService = require("./daraz_api_service");
const { createJobUid } = require("../../utils/marketplace_management/job_uid");

function createSyncError(message, statusCode = 400, code = "SYNC_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getPayload(response) {
  /*
    daraz_api_service new response:
    {
      success: true,
      message,
      request_uid,
      response_code,
      data: actualDarazResponse
    }

    old response:
    actualDarazResponse
  */
  return response?.data || response || {};
}

function getDarazOrdersFromPayload(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.order)) return data.order;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload)) return payload;

  return [];
}

function getDarazProductsFromPayload(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.product)) return data.product;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;

  return [];
}

function buildErrorDetails(error) {
  return JSON.stringify({
    message: error?.message || "Sync failed",
    code: error?.code || null,
    type: error?.type || null,
    statusCode: error?.statusCode || null,
    request_id: error?.request_id || null,
    trace_id: error?.trace_id || null,
    daraz: error?.daraz || null,
    response: error?.response?.data || null,
  });
}

async function safeCreateSyncJobItem(payload) {
  try {
    if (syncLogModel?.createSyncJobItem) {
      await syncLogModel.createSyncJobItem(payload);
    }
  } catch (error) {
    console.error("[SYNC_JOB_ITEM_LOG_FAIL]:", {
      message: error?.message,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function manualSyncAccount({ accountId, syncType, userId = null }) {
  if (!accountId) {
    throw createSyncError("Account ID is required.", 400, "ACCOUNT_ID_REQUIRED");
  }

  if (!syncType) {
    throw createSyncError("Sync type is required.", 400, "SYNC_TYPE_REQUIRED");
  }

  const { account, credentials } =
    await tokenService.getValidCredentialsForAccount(accountId);

  if (!account) {
    throw createSyncError("Marketplace account not found.", 404, "ACCOUNT_NOT_FOUND");
  }

  if (!credentials) {
    throw createSyncError(
      "Marketplace credentials not found.",
      404,
      "CREDENTIALS_NOT_FOUND"
    );
  }

  const jobUid = createJobUid({
    platformCode: account.platform_code,
    accountUid: account.account_uid,
    syncType,
  });

  const jobId = await syncLogModel.createSyncJob({
    job_uid: jobUid,
    account_id: account.id,
    platform_code: account.platform_code,
    sync_type: syncType,
    direction: "pull",
    status: "running",
    triggered_by_type: "manual",
    triggered_by_user_id: userId,
    message: `Manual ${syncType} sync started`,
  });

  try {
    let result;

    const platformCode = String(account.platform_code || "").toUpperCase();

    if (platformCode === "DARAZ") {
      result = await runDarazSync({
        account,
        credentials,
        syncType,
        jobId,
      });
    } else if (platformCode === "WOO") {
      result = {
        total_records: 0,
        success_records: 0,
        failed_records: 0,
        skipped_records: 0,
        message: "WooCommerce sync service not implemented yet.",
      };
    } else {
      throw createSyncError(
        `Unsupported platform: ${account.platform_code}`,
        400,
        "UNSUPPORTED_PLATFORM"
      );
    }

    const finalStatus = result.failed_records > 0 ? "partial_success" : "success";

    await syncLogModel.finishSyncJob(jobId, {
      status: finalStatus,
      total_records: result.total_records || 0,
      success_records: result.success_records || 0,
      failed_records: result.failed_records || 0,
      skipped_records: result.skipped_records || 0,
      message: result.message || `${syncType} sync completed.`,
    });

    await accountModel.updateLastSync(account.id);

    return {
      success: true,
      message: result.message || `${syncType} sync completed successfully.`,
      job_id: jobId,
      job_uid: jobUid,
      status: finalStatus,
      sync_type: syncType,
      account: {
        id: account.id,
        account_uid: account.account_uid || null,
        account_code: account.account_code || null,
        account_name: account.account_name || null,
        platform_code: account.platform_code,
      },
      ...result,
    };
  } catch (error) {
    const errorMessage = error?.message || `${syncType} sync failed.`;

    await syncLogModel.finishSyncJob(jobId, {
      status: "failed",
      total_records: 0,
      success_records: 0,
      failed_records: 1,
      skipped_records: 0,
      message: errorMessage,
      error_details: buildErrorDetails(error),
    });

    const finalError = createSyncError(
      errorMessage,
      error?.statusCode || 500,
      error?.code || "SYNC_FAILED"
    );

    finalError.details = {
      job_id: jobId,
      job_uid: jobUid,
      sync_type: syncType,
      account_id: account?.id || accountId,
      account_code: account?.account_code || null,
      daraz: error?.daraz || null,
      request_id: error?.request_id || null,
      trace_id: error?.trace_id || null,
    };

    throw finalError;
  }
}

async function runDarazSync({ account, credentials, syncType, jobId }) {
  const type = String(syncType || "").toLowerCase();

  if (type === "orders") {
    return syncDarazOrders({ account, credentials, jobId });
  }

  if (type === "products") {
    return syncDarazProducts({ account, credentials, jobId });
  }

  if (type === "categories") {
    return syncDarazCategories({ account, credentials, jobId });
  }

  if (type === "brands") {
    return syncDarazBrands({ account, credentials, jobId });
  }

  if (type === "inventory" || type === "price") {
    return {
      total_records: 0,
      success_records: 0,
      failed_records: 0,
      skipped_records: 0,
      message: `${syncType} sync placeholder ready. Add local product push logic next.`,
    };
  }

  throw createSyncError(
    `Unsupported Daraz sync type: ${syncType}`,
    400,
    "UNSUPPORTED_DARAZ_SYNC_TYPE"
  );
}

async function syncDarazOrders({ account, credentials, jobId }) {
  const response = await darazApiService.callDarazApi({
    account,
    credentials,
    apiPath: "/orders/get",
    method: "GET",
    requestType: "orders",
    query: {
      sort_direction: "DESC",
      limit: 50,
    },
  });

  const payload = getPayload(response);
  const orders = getDarazOrdersFromPayload(payload);

  const total = orders.length;

  for (const order of orders) {
    await safeCreateSyncJobItem({
      job_id: jobId,
      account_id: account.id,
      item_type: "order",
      marketplace_reference:
        order.order_id ||
        order.order_number ||
        order.orderNumber ||
        order.id ||
        null,
      status: "success",
      message: "Order fetched from Daraz.",
    });
  }

  return {
    total_records: total,
    success_records: total,
    failed_records: 0,
    skipped_records: 0,
    message: `Daraz orders sync completed successfully. ${total} orders fetched.`,
    request_uid: response?.request_uid || null,
  };
}

async function syncDarazProducts({ account, credentials, jobId }) {
  const response = await darazApiService.callDarazApi({
    account,
    credentials,
    apiPath: "/products/get",
    method: "GET",
    requestType: "products",
    query: {
      limit: 50,
      offset: 0,
    },
  });

  const payload = getPayload(response);
  const products = getDarazProductsFromPayload(payload);

  const total = products.length;

  for (const product of products) {
    await safeCreateSyncJobItem({
      job_id: jobId,
      account_id: account.id,
      item_type: "product",
      marketplace_reference:
        product.item_id ||
        product.product_id ||
        product.itemId ||
        product.id ||
        null,
      sku:
        product.sku ||
        product.SellerSku ||
        product.seller_sku ||
        product.sellerSku ||
        null,
      status: "success",
      message: "Product fetched from Daraz.",
    });
  }

  return {
    total_records: total,
    success_records: total,
    failed_records: 0,
    skipped_records: 0,
    message: `Daraz products sync completed successfully. ${total} products fetched.`,
    request_uid: response?.request_uid || null,
  };
}

async function syncDarazCategories({ account, credentials, jobId }) {
  const response = await darazApiService.callDarazApi({
    account,
    credentials,
    apiPath: "/category/tree/get",
    method: "GET",
    requestType: "categories",
  });

  await safeCreateSyncJobItem({
    job_id: jobId,
    account_id: account.id,
    item_type: "category",
    status: "success",
    message: "Daraz category tree fetched successfully.",
  });

  return {
    total_records: 1,
    success_records: 1,
    failed_records: 0,
    skipped_records: 0,
    message: "Daraz categories sync completed successfully.",
    request_uid: response?.request_uid || null,
    raw: getPayload(response),
  };
}

async function syncDarazBrands({ account, credentials, jobId }) {
  const response = await darazApiService.callDarazApi({
    account,
    credentials,
    apiPath: "/brands/get",
    method: "GET",
    requestType: "brands",
  });

  await safeCreateSyncJobItem({
    job_id: jobId,
    account_id: account.id,
    item_type: "brand",
    status: "success",
    message: "Daraz brands fetched successfully.",
  });

  return {
    total_records: 1,
    success_records: 1,
    failed_records: 0,
    skipped_records: 0,
    message: "Daraz brands sync completed successfully.",
    request_uid: response?.request_uid || null,
    raw: getPayload(response),
  };
}

module.exports = {
  manualSyncAccount,
};