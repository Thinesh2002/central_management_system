const asyncHandler = require("../../../middleware/async_handler");
const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const payoutModel = require("../../../models/daraz/finance_management/daraz_finance_payout_model");
const transactionModel = require("../../../models/daraz/finance_management/daraz_finance_transaction_model");
const syncLogModel = require("../../../models/daraz/finance_management/daraz_finance_sync_log_model");
const orderLookupModel = require("../../../models/daraz/finance_management/daraz_order_lookup_model");
const darazFinanceSyncService = require("../../../services/daraz/finance_management/daraz_finance_sync_service");

async function enrichGroupsWithOrderThumbnails(groups) {
  try {
    const thumbnails = await orderLookupModel.getOrderThumbnailsByOrderNos(
      groups.map((group) => group.order_no)
    );

    return groups.map((group) => ({
      ...group,
      thumbnail_url: thumbnails[group.order_no]?.thumbnail_url || null,
      product_title: thumbnails[group.order_no]?.product_title || null,
    }));
  } catch (error) {
    console.error("[DARAZ_FINANCE_THUMBNAIL_LOOKUP_FAILED]", error.message);
    return groups;
  }
}

async function loadAccountWithCredentials(accountId) {
  const account = await accountModel.findById(accountId);
  if (!account) {
    const error = new Error("Marketplace account not found.");
    error.statusCode = 404;
    throw error;
  }

  const credentials = await credentialModel.findByAccountId(accountId);
  if (!credentials?.access_token) {
    const error = new Error("Daraz access token missing for this account.");
    error.statusCode = 400;
    throw error;
  }

  return { account, credentials };
}

const listPayouts = asyncHandler(async (req, res) => {
  const { account_id: accountId, date_from: dateFrom, date_to: dateTo, limit, offset } = req.query || {};
  const data = await payoutModel.listPayouts({ account_id: accountId, date_from: dateFrom, date_to: dateTo, limit, offset });
  return res.json({ success: true, data });
});

const listTransactions = asyncHandler(async (req, res) => {
  const { account_id: accountId, order_no: orderNo, date_from: dateFrom, date_to: dateTo, limit, offset } = req.query || {};
  const data = await transactionModel.listTransactions({
    account_id: accountId,
    order_no: orderNo,
    date_from: dateFrom,
    date_to: dateTo,
    limit,
    offset,
  });
  return res.json({ success: true, data });
});

// One row per order (SQL-level SUM/COUNT), so totals stay accurate no
// matter how many raw transaction lines exist for a given order/date range.
const listTransactionOrderGroups = asyncHandler(async (req, res) => {
  const { account_id: accountId, date_from: dateFrom, date_to: dateTo, limit, offset } = req.query || {};

  const { rows, total } = await transactionModel.listOrderGroups({
    account_id: accountId,
    date_from: dateFrom,
    date_to: dateTo,
    limit,
    offset,
  });

  const data = await enrichGroupsWithOrderThumbnails(rows);
  return res.json({ success: true, data, total });
});

const listSyncLogs = asyncHandler(async (req, res) => {
  const { account_id: accountId, sync_scope: syncScope, limit } = req.query || {};
  const data = await syncLogModel.listRuns({ account_id: accountId, sync_scope: syncScope, limit });
  return res.json({ success: true, data });
});

const getPayoutSummary = asyncHandler(async (req, res) => {
  const { account_id: accountId, date_from: dateFrom, date_to: dateTo } = req.query || {};
  const data = await payoutModel.getPayoutSummary({ account_id: accountId, date_from: dateFrom, date_to: dateTo });
  return res.json({ success: true, data });
});

const getTransactionSummary = asyncHandler(async (req, res) => {
  const { account_id: accountId, date_from: dateFrom, date_to: dateTo } = req.query || {};
  const data = await transactionModel.getTransactionSummary({ account_id: accountId, date_from: dateFrom, date_to: dateTo });
  return res.json({ success: true, data });
});

const runPayoutSyncNow = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { created_after: createdAfter } = req.body || {};
  const { account, credentials } = await loadAccountWithCredentials(accountId);

  const result = await darazFinanceSyncService.syncPayouts({
    account,
    credentials,
    sync_type: "manual",
    createdAfter,
  });

  return res.json({ success: true, message: "Payout sync completed.", data: result });
});

const runTransactionSyncNow = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { start_time: startTime, end_time: endTime } = req.body || {};
  const { account, credentials } = await loadAccountWithCredentials(accountId);

  const result = await darazFinanceSyncService.syncTransactions({
    account,
    credentials,
    sync_type: "manual",
    startTime,
    endTime,
  });

  return res.json({ success: true, message: "Transaction sync completed.", data: result });
});

module.exports = {
  listPayouts,
  listTransactions,
  listTransactionOrderGroups,
  listSyncLogs,
  getPayoutSummary,
  getTransactionSummary,
  runPayoutSyncNow,
  runTransactionSyncNow,
};
