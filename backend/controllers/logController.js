const logModel = require("../models/logModel");
const inventoryLogModel = require("../models/order_management/inventory_log_model");
const titleOptimizerLogModel = require("../models/daraz/product_management/daraz_title_optimizer_log_model");
const priceReconciliationModel = require("../models/daraz/pricing/daraz_price_reconciliation_model");
const webhookLogModel = require("../models/daraz/order_management/daraz_webhook_log_model");
const darazInventorySyncModel = require("../models/daraz/inventory/daraz_inventory_sync_model");
const accountModel = require("../models/marketplace/account_model");
const userModel = require("../models/userModel");

// Deduction failures log both attempted SKUs (Daraz's shop_sku and sku
// fields don't always agree - see order_inventory_deduction_service.js)
// quoted in the message, e.g. SKU "X" / "Y" is missing. Extract both so a
// group is keyed on the full pair, not just whichever one the sku column
// happened to store.
function extractCandidateSkus(row) {
  const quoted = String(row.message || "").match(/"([^"]+)"/g) || [];
  const cleaned = quoted.map((value) => value.slice(1, -1));
  const candidates = cleaned.length ? cleaned : [row.sku].filter(Boolean);
  return [...new Set(candidates.filter(Boolean))];
}

function groupMissingInventoryLogs(logs) {
  const groups = new Map();

  logs.forEach((row) => {
    const candidates = extractCandidateSkus(row);
    if (!candidates.length) return;

    const key = [...candidates].sort().join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        skus: candidates,
        order_ids: new Set(),
        occurrence_count: 0,
        first_seen: row.created_at,
        last_seen: row.created_at,
      });
    }

    const group = groups.get(key);
    group.occurrence_count += 1;
    if (row.source_order_id) group.order_ids.add(row.source_order_id);
    if (new Date(row.created_at) < new Date(group.first_seen)) group.first_seen = row.created_at;
    if (new Date(row.created_at) > new Date(group.last_seen)) group.last_seen = row.created_at;
  });

  return [...groups.values()];
}

async function getLogs(req, res) {
  const logs = await logModel.listLogs({ limit: req.query.limit || 100 });
  return res.json({ success: true, logs });
}

async function getLoginLogs(req, res) {
  const logs = await logModel.listLoginLogs(req.query.limit || 100);
  return res.json({ success: true, logs });
}

async function getSystemLogs(req, res) {
  const logs = await logModel.listSystemLogs(req.query.limit || 100);
  return res.json({ success: true, logs });
}

async function getInventoryLogs(req, res) {
  const logs = await inventoryLogModel.listRecent({
    status: req.query.status,
    sku: req.query.sku,
    limit: req.query.limit || 200,
  });
  return res.json({ success: true, logs });
}

async function getTitleOptimizerLogs(req, res) {
  const logs = await titleOptimizerLogModel.listRecent({
    event_type: req.query.event_type,
    account_id: req.query.account_id,
    status: req.query.status,
    limit: req.query.limit || 200,
  });

  const [accounts, users] = await Promise.all([accountModel.getAllAccounts(), userModel.listUsers()]);

  const accountNameById = new Map(accounts.map((account) => [account.id, account.account_name || account.account_code]));
  const userNameById = new Map(users.map((user) => [user.id, user.name || user.email]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    account_name: accountNameById.get(log.account_id) || null,
    reviewed_by_name: userNameById.get(log.reviewed_by) || null,
  }));

  return res.json({ success: true, logs: enrichedLogs });
}

async function getPriceReconciliationLogs(req, res) {
  const logs = await priceReconciliationModel.listRecent({
    status: req.query.status,
    seller_sku: req.query.sku,
    limit: req.query.limit || 200,
  });

  return res.json({ success: true, logs });
}

// Every SKU that's recently failed stock deduction because it has no
// local inventory record at all (not a SKU Mapping problem - there's no
// "correct SKU" to point to), grouped so the same listing's repeated
// failures across multiple orders show up once with an order count, and
// enriched with the Daraz listing's name/image so it's identifiable
// without leaving this page.
async function getMissingInventoryReport(req, res) {
  const days = req.query.days || 14;
  const logs = await inventoryLogModel.listMissingSince({ days, limit: 2000 });
  const groups = groupMissingInventoryLogs(logs);

  const allSkus = [...new Set(groups.flatMap((group) => group.skus))];
  const listings = allSkus.length ? await darazInventorySyncModel.findDarazListingsBySkus(allSkus) : [];

  const listingBySku = new Map();
  listings.forEach((listing) => {
    const key = String(listing.seller_sku || "").toLowerCase();
    if (!listingBySku.has(key)) listingBySku.set(key, listing);
  });

  const accounts = await accountModel.getAllAccounts();
  const accountNameById = new Map(accounts.map((account) => [account.id, account.account_name || account.account_code]));

  const report = groups
    .map((group) => {
      const matchedListing = group.skus.map((sku) => listingBySku.get(sku.toLowerCase())).find(Boolean) || null;

      return {
        skus: group.skus,
        order_count: group.order_ids.size,
        occurrence_count: group.occurrence_count,
        first_seen: group.first_seen,
        last_seen: group.last_seen,
        product_name: matchedListing?.name || null,
        image_url: matchedListing?.main_image || null,
        matched_seller_sku: matchedListing?.seller_sku || null,
        account_id: matchedListing?.account_id || null,
        account_name: matchedListing ? accountNameById.get(matchedListing.account_id) || null : null,
        current_daraz_quantity: matchedListing?.current_quantity ?? null,
      };
    })
    .sort((a, b) => b.order_count - a.order_count || new Date(b.last_seen) - new Date(a.last_seen));

  return res.json({ success: true, data: report });
}

async function getDarazWebhookLogs(req, res) {
  const logs = await webhookLogModel.listRecent({
    status: req.query.status,
    limit: req.query.limit || 200,
  });

  return res.json({ success: true, logs });
}

module.exports = {
  getLogs,
  getLoginLogs,
  getSystemLogs,
  getInventoryLogs,
  getTitleOptimizerLogs,
  getPriceReconciliationLogs,
  getDarazWebhookLogs,
  getMissingInventoryReport,
};
