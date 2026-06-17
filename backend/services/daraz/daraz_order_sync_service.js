const accountModel = require("../../models/daraz/daraz_account/daraz_account_model");
const orderModel = require("../../models/daraz/orders/daraz_order_sync_model");
const productSyncModel = require("../../models/daraz/products_models/sync/daraz_product_sync_model");
const darazApi = require("./daraz_api_client");

const DEFAULT_LIMIT = Number(process.env.DARAZ_ORDER_BATCH_SIZE || 50);
const DEFAULT_CONCURRENCY = Number(process.env.DARAZ_ACCOUNT_SYNC_CONCURRENCY || 2);

const runWithConcurrency = async (items, limit, worker) => {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};

const toDarazDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().replace(/\.\d{3}Z$/, "+0000");
};

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - Number(process.env.DARAZ_ORDER_SYNC_LOOKBACK_HOURS || 48) * 60 * 60 * 1000);
  return { start, end };
};

const fetchOrdersPage = async (account, { offset = 0, limit = DEFAULT_LIMIT, start, end } = {}) => {
  return darazApi.callDarazApi({
    account,
    apiPath: "/orders/get",
    method: "GET",
    params: {
      created_after: toDarazDate(start),
      created_before: toDarazDate(end),
      sort_by: "created_at",
      sort_direction: "DESC",
      limit: String(limit),
      offset: String(offset)
    },
    requiresAuth: true,
    retry: 1
  });
};

const fetchOrderItems = async (account, orderId) => {
  const response = await darazApi.callDarazApi({
    account,
    apiPath: "/order/items/get",
    method: "GET",
    params: { order_id: String(orderId) },
    requiresAuth: true,
    retry: 1
  });

  return response.data || response;
};

const extractOrders = (response) => response.data?.orders || response.data?.Orders || response.orders || [];
const extractOrderItems = (responseData) => responseData?.order_items || responseData?.OrderItems || responseData?.items || responseData || [];

const syncSingleAccountOrders = async (account, { syncType = "cron", start = null, end = null } = {}) => {
  const startedAt = new Date();
  const range = start && end ? { start: new Date(start), end: new Date(end) } : getDefaultDateRange();
  let offset = 0;
  let totalOrders = 0;
  let syncedOrders = 0;
  let syncedItems = 0;
  let failedRecords = 0;

  try {
    while (true) {
      const response = await fetchOrdersPage(account, { offset, limit: DEFAULT_LIMIT, start: range.start, end: range.end });
      const orders = extractOrders(response);
      totalOrders = Number(response.data?.countTotalRecords || response.data?.total || response.data?.Total || orders.length || 0);

      if (!Array.isArray(orders) || orders.length === 0) break;

      for (const order of orders) {
        try {
          const orderId = order.order_id || order.OrderId || order.orderNumber || order.order_number;
          const orderDbId = await orderModel.upsertOrder(account, order);

          try {
            const orderItemsData = await fetchOrderItems(account, orderId);
            const items = extractOrderItems(orderItemsData);
            syncedItems += await orderModel.upsertOrderItems(orderDbId, account, orderId, Array.isArray(items) ? items : []);
          } catch (itemError) {
            console.error(`[DARAZ_ORDER_ITEM_SYNC_FAIL][${account.account_code}][${orderId}]`, itemError.message);
            failedRecords += 1;
          }

          syncedOrders += 1;
        } catch (recordError) {
          failedRecords += 1;
          console.error(`[DARAZ_ORDER_RECORD_FAIL][${account.account_code}]`, recordError.message);
        }
      }

      offset += DEFAULT_LIMIT;
      if (orders.length < DEFAULT_LIMIT || (totalOrders > 0 && offset >= totalOrders)) break;
    }

    await accountModel.updateLastSync(account, "last_order_sync_at");
    await productSyncModel.createSyncLog({
      account_id: account.id || null,
      account_code: account.account_code,
      account_name: account.account_name,
      module: "orders",
      sync_type: syncType,
      status: failedRecords > 0 ? "partial" : "success",
      total_orders: totalOrders,
      synced_orders: syncedOrders,
      failed_records: failedRecords,
      message: "Daraz order sync completed",
      started_at: startedAt,
      finished_at: new Date()
    });

    return { success: failedRecords === 0, partial: failedRecords > 0, account_code: account.account_code, total_orders: totalOrders, synced_orders: syncedOrders, synced_items: syncedItems, failed_records: failedRecords };
  } catch (error) {
    await productSyncModel.createSyncLog({
      account_id: account?.id || null,
      account_code: account?.account_code,
      account_name: account?.account_name,
      module: "orders",
      sync_type: syncType,
      status: "failed",
      total_orders: totalOrders,
      synced_orders: syncedOrders,
      failed_records: failedRecords + 1,
      message: error.message,
      error,
      started_at: startedAt,
      finished_at: new Date()
    });

    return { success: false, account_code: account?.account_code, total_orders: totalOrders, synced_orders: syncedOrders, failed_records: failedRecords, message: error.message };
  }
};

const syncAllOrders = async ({ syncType = "cron", accountCode = null, start = null, end = null } = {}) => {
  const accounts = accountCode
    ? [await accountModel.getAccountByCode(accountCode)]
    : await accountModel.getAllAccounts({ activeOnly: true, includeTokens: true });

  const activeAccounts = accounts.filter(Boolean);
  const results = await runWithConcurrency(activeAccounts, DEFAULT_CONCURRENCY, (account) =>
    syncSingleAccountOrders(account, { syncType, start, end })
  );

  return {
    total_accounts: activeAccounts.length,
    successful_syncs: results.filter((r) => r.success).length,
    partial_syncs: results.filter((r) => r.partial).length,
    failed_syncs: results.filter((r) => !r.success && !r.partial).length,
    results
  };
};

module.exports = {
  syncAllOrders,
  syncSingleAccountOrders,
  fetchOrdersPage,
  fetchOrderItems
};
