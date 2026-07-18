const wooModel = require("../../../models/marketplace/woo/woo_model");
const wooApi = require("../../marketplace/woo/woo_api_service");
const wooOrderSyncModel = require("../../../models/order_management/woo_order_sync_model");
const orderInventoryDeductionService = require("../../order_management/order_inventory_deduction_service");
const orderSyncSettingsModel = require("../../../models/order_management/order_sync_settings_model");

const PAGE_SIZE = 50;

// Same shared order_sync_settings row Daraz's own sync job reads from -
// "how many days back to sync" isn't a per-marketplace concept.
function resolveSyncDays(settings) {
  const candidateKeys = ["fetch_order_days", "sync_days", "days_back", "lookback_days", "sync_range_days", "order_sync_days"];

  for (const key of candidateKeys) {
    const value = Number(settings?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 7;
}

// Mirrors daraz_order_sync_service's processOneOrder: upsert the order +
// items, deduct stock only for items newly seen this call.
async function processOneOrder({ account, order }) {
  const localOrder = await wooOrderSyncModel.upsertOrder(order, account);
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const newlyCreatedItems = await wooOrderSyncModel.upsertItems(items, localOrder.id);

  for (const newItem of newlyCreatedItems) {
    try {
      await orderInventoryDeductionService.deductStockForNewItem({
        source: "woocommerce",
        sourceOrderId: order.number || order.id,
        orderItemId: newItem.order_item_id,
        sku: newItem.sku,
        qty: newItem.qty,
      });
    } catch (deductionError) {
      console.error(
        `[WOO_ORDER_SYNC] Inventory deduction failed for order ${order.id} item ${newItem.order_item_id}:`,
        deductionError.message
      );
    }
  }

  return { local_order: localOrder, item_count: items.length };
}

async function fetchWooOrders({ account, credentials, sinceDate }) {
  let page = 1;
  let totalPages = 1;
  let ordersFetched = 0;
  let itemsFetched = 0;

  do {
    const result = await wooApi.getOrders(credentials, {
      page,
      per_page: PAGE_SIZE,
      modifiedAfter: sinceDate.toISOString(),
    });

    totalPages = result.total_pages || 1;
    const orders = Array.isArray(result.data) ? result.data : [];

    for (const order of orders) {
      const { item_count: itemCount } = await processOneOrder({ account, order });
      itemsFetched += itemCount;
      ordersFetched += 1;
    }

    page += 1;
  } while (page <= totalPages);

  return { orders_synced: ordersFetched, items_synced: itemsFetched };
}

async function syncOneAccount(account, sinceDate) {
  const credentials = await wooModel.getWooCredentials(account.id);
  return fetchWooOrders({ account, credentials, sinceDate });
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

module.exports = { syncAllAccounts, syncOneAccount, fetchWooOrders, resolveSyncDays };
