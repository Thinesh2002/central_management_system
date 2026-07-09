const tokenService = require("../../marketplace/token_service");
const orderSyncSettingsModel = require("../../../models/order_management/order_sync_settings_model");
const darazOrderApiService = require("./daraz_order_api_service");
const darazOrderSyncModel = require("../../../models/order_management/daraz_order_sync_model");

const PAGE_SIZE = 100;

async function fetchDarazOrders({ account, credentials, sinceDate }) {
  let offset = 0;
  let countTotal = Infinity;
  let ordersFetched = 0;
  let itemsFetched = 0;

  while (offset < countTotal) {
    const response = await darazOrderApiService.getOrders({
      account,
      credentials,
      updateAfter: sinceDate.toISOString(),
      offset,
      limit: PAGE_SIZE,
    });

    const data = response?.data?.data || {};
    const orders = data.orders || [];
    countTotal = Number(data.countTotal || orders.length);

    for (const order of orders) {
      const localOrder = await darazOrderSyncModel.upsertOrder(order, account);

      try {
        const itemsResponse = await darazOrderApiService.getOrderItems({
          account,
          credentials,
          orderId: order.order_id,
        });

        const items = itemsResponse?.data?.data || [];
        await darazOrderSyncModel.upsertItems(items, localOrder.id);
        itemsFetched += items.length;
      } catch (itemError) {
        console.error(`[DARAZ_ORDER_SYNC] Failed to fetch items for order ${order.order_id}:`, itemError.message);
      }

      ordersFetched += 1;
    }

    if (!orders.length) break;
    offset += PAGE_SIZE;
  }

  return { orders_synced: ordersFetched, items_synced: itemsFetched };
}

function resolveSyncDays(settings) {
  const candidateKeys = [
    "sync_days",
    "days_back",
    "lookback_days",
    "sync_range_days",
    "order_sync_days",
  ];

  for (const key of candidateKeys) {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 7;
}

async function syncOneAccount(account, sinceDate) {
  const { credentials } = await tokenService.getValidCredentialsForAccount(account.id);
  return fetchDarazOrders({ account, credentials, sinceDate });
}

async function syncAllAccounts(accounts) {
  const settings = await orderSyncSettingsModel.getSettings();
  const days = resolveSyncDays(settings);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const results = [];

  for (const account of accounts) {
    try {
      const result = await syncOneAccount(account, sinceDate);
      results.push({ account_id: account.id, success: true, ...result });
    } catch (error) {
      results.push({ account_id: account.id, success: false, error: error.message });
    }
  }

  return { days, since: sinceDate, results };
}

module.exports = { syncAllAccounts, syncOneAccount, resolveSyncDays, fetchDarazOrders };
