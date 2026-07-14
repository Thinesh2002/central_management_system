const cron = require("node-cron");

const transExpressApi = require("../../services/trans_express/trans_express_api_service");
const syncModel = require("../../models/order_management/trans_express_sync_model");

let running = false;

async function syncTrackingStatuses() {
  if (running) {
    console.log("[TRANS_EXPRESS_TRACKING_SYNC_JOB] Previous run still in progress. Skipped.");
    return;
  }

  if (!transExpressApi.getToken()) {
    console.log("[TRANS_EXPRESS_TRACKING_SYNC_JOB] TRANS_EXPRESS_API_TOKEN not set. Skipped.");
    return;
  }

  running = true;

  try {
    const orders = await syncModel.getOrdersNeedingTracking();

    if (!orders.length) {
      console.log("[TRANS_EXPRESS_TRACKING_SYNC_JOB] No orders to track.");
      return;
    }

    let delivered = 0;

    for (const order of orders) {
      try {
        const tracking = await transExpressApi.trackOrder(order.waybill_id);

        if (transExpressApi.isDelivered(tracking)) {
          await syncModel.markDelivered(order.id);
          delivered += 1;
        }
      } catch (error) {
        console.error(`[TRANS_EXPRESS_TRACKING_SYNC_JOB] Order ${order.id} failed:`, error.message);
      }
    }

    console.log(
      `[TRANS_EXPRESS_TRACKING_SYNC_JOB] Checked ${orders.length} order(s), marked ${delivered} delivered.`
    );
  } catch (error) {
    console.error("[TRANS_EXPRESS_TRACKING_SYNC_JOB] Job failed:", error.message);
  } finally {
    running = false;
  }
}

function startTransExpressTrackingSyncJob() {
  cron.schedule("0 * * * *", syncTrackingStatuses, { timezone: "Asia/Colombo" });
  console.log(
    "[TRANS_EXPRESS_TRACKING_SYNC_JOB] Scheduler started. Runs every hour; stops per-order once Delivered."
  );
}

module.exports = { startTransExpressTrackingSyncJob, syncTrackingStatuses };
