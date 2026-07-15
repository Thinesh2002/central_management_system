const accountModel = require("../../../models/marketplace/account_model");
const tokenService = require("../../../services/marketplace/token_service");
const orderSyncService = require("../../../services/daraz/order_management/daraz_order_sync_service");
const webhookLogModel = require("../../../models/daraz/order_management/daraz_webhook_log_model");
const { verifyDarazWebhookSignature } = require("../../../services/daraz/order_management/daraz_webhook_verification_service");

// Best-effort field extraction - Daraz's Open Platform message-push
// convention typically wraps the actual notification in a `data` field
// that arrives as a JSON string, alongside top-level app_key/sign/topic/
// msg_id. Falls back to top-level fields if `data` isn't present, since
// the exact shape hasn't been confirmed against live traffic yet.
function parseWebhookPayload(body = {}) {
  let data = body.data;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  const sellerId = data?.seller_id || data?.sellerId || body.seller_id || body.sellerId || null;
  const orderId = data?.order_id || data?.trade_order_id || data?.orderId || body.order_id || null;

  return { data, sellerId: sellerId ? String(sellerId) : null, orderId: orderId ? String(orderId) : null };
}

// Public endpoint (registered directly in index.js, no `protect`
// middleware) - Daraz's push notification can't carry our JWT, so this
// is verified by HMAC signature instead, same trust model as the OAuth
// callback routes right above it in index.js. Always responds fast so
// Daraz doesn't retry-storm a slow/failing receiver; every call is
// logged with its raw body regardless of outcome so a bad assumption
// about the payload shape or signature scheme is diagnosable rather
// than silently dropped.
async function handleOrderWebhook(req, res) {
  const rawBody = JSON.stringify(req.body || {});
  let logId = null;

  try {
    const { data, sellerId, orderId } = parseWebhookPayload(req.body);

    logId = await webhookLogModel.create({
      topic: req.body?.topic || null,
      msg_id: req.body?.msg_id || null,
      seller_id: sellerId,
      order_id: orderId,
      raw_body: rawBody,
      status: "received",
    });

    res.status(200).json({ success: true });

    if (!sellerId) {
      await webhookLogModel.updateStatus(logId, { status: "parse_failed", message: "No seller_id found in payload." });
      return;
    }

    const account = await accountModel.findBySellerId(sellerId);

    if (!account) {
      await webhookLogModel.updateStatus(logId, {
        status: "account_not_found",
        message: `No Daraz account linked to seller_id ${sellerId}.`,
      });
      return;
    }

    const { credentials } = await tokenService.getValidCredentialsForAccount(account.id);
    const appSecret = credentials?.app_secret || credentials?.appSecret;
    const signatureValid = verifyDarazWebhookSignature(req.body, appSecret);

    if (!signatureValid) {
      await webhookLogModel.updateStatus(logId, {
        status: "signature_invalid",
        message: "Webhook signature did not match - ignoring payload.",
        account_id: account.id,
        signature_valid: false,
      });
      return;
    }

    if (!orderId) {
      await webhookLogModel.updateStatus(logId, { status: "parse_failed", message: "No order_id found in payload." });
      return;
    }

    await orderSyncService.syncSingleOrderById({ account, credentials, orderId });

    await webhookLogModel.updateStatus(logId, {
      status: "processed",
      message: `Order ${orderId} synced from webhook.`,
      account_id: account.id,
      signature_valid: true,
    });
  } catch (error) {
    console.error("[DARAZ_WEBHOOK_ERROR]", error.message);

    if (logId) {
      await webhookLogModel.updateStatus(logId, { status: "processing_failed", message: error.message }).catch(() => {});
    }

    if (!res.headersSent) {
      res.status(200).json({ success: true });
    }
  }
}

module.exports = { handleOrderWebhook };
