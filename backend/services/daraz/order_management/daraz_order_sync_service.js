const tokenService = require("../../marketplace/token_service");
const orderSyncSettingsModel = require("../../../models/order_management/order_sync_settings_model");
const darazOrderApiService = require("./daraz_order_api_service");
const darazOrderSyncModel = require("../../../models/order_management/daraz_order_sync_model");
const orderInventoryDeductionService = require("../../order_management/order_inventory_deduction_service");

const PAGE_SIZE = 100;

// Upserts one raw Daraz order + its items, deducting stock only for items
// newly seen this call. Shared by the polling loop below and by the
// webhook receiver (daraz_webhook_controller.js), so an order synced in
// via a push notification goes through the exact same idempotent path a
// polled order does — no separate/duplicated processing logic.
async function processOneOrder({ account, credentials, order }) {
  const localOrder = await darazOrderSyncModel.upsertOrder(order, account);
  let itemCount = 0;

  try {
    const itemsResponse = await darazOrderApiService.getOrderItems({
      account,
      credentials,
      orderId: order.order_id,
    });

    const items = itemsResponse?.data?.data || [];
    const newlyCreatedItems = await darazOrderSyncModel.upsertItems(items, localOrder.id);
    itemCount = items.length;

    for (const newItem of newlyCreatedItems) {
      try {
        await orderInventoryDeductionService.deductStockForNewItem({
          source: "daraz",
          sourceOrderId: order.order_number || order.order_id,
          orderItemId: newItem.order_item_id,
          sku: newItem.sku,
          qty: newItem.qty,
        });
      } catch (deductionError) {
        console.error(
          `[DARAZ_ORDER_SYNC] Inventory deduction failed for order ${order.order_id} item ${newItem.order_item_id}:`,
          deductionError.message
        );
      }
    }
  } catch (itemError) {
    console.error(`[DARAZ_ORDER_SYNC] Failed to fetch items for order ${order.order_id}:`, itemError.message);
  }

  return { localOrder, item_count: itemCount };
}

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
      const { item_count: itemCount } = await processOneOrder({ account, credentials, order });
      itemsFetched += itemCount;
      ordersFetched += 1;
    }

    if (!orders.length) break;
    offset += PAGE_SIZE;
  }

  return { orders_synced: ordersFetched, items_synced: itemsFetched };
}

// Webhook path: Daraz's push notification only tells us an order_id
// changed, not the full order - fetch it fresh via the same authoritative
// order/get API the poller effectively pages through, then reuse
// processOneOrder unchanged.
async function syncSingleOrderById({ account, credentials, orderId }) {
  const response = await darazOrderApiService.getOrder({ account, credentials, orderId });
  const order = response?.data?.data;

  if (!order || !order.order_id) {
    throw new Error(`Daraz order/get returned no order for order_id ${orderId}.`);
  }

  const { item_count: itemCount } = await processOneOrder({ account, credentials, order });
  return { order_id: order.order_id, items_synced: itemCount };
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

module.exports = {
  syncAllAccounts,
  syncOneAccount,
  resolveSyncDays,
  fetchDarazOrders,
  syncSingleOrderById,
};
