const asyncHandler = require("../../../middleware/async_handler");
const accountModel = require("../../../models/marketplace/account_model");
const credentialModel = require("../../../models/marketplace/credential_model");
const payoutModel = require("../../../models/daraz/finance_management/daraz_finance_payout_model");
const transactionModel = require("../../../models/daraz/finance_management/daraz_finance_transaction_model");
const syncLogModel = require("../../../models/daraz/finance_management/daraz_finance_sync_log_model");
const darazFinanceSyncService = require("../../../services/daraz/finance_management/daraz_finance_sync_service");

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
  const { account_id: accountId, limit, offset } = req.query || {};
  const data = await payoutModel.listPayouts({ account_id: accountId, limit, offset });
  return res.json({ success: true, data });
});

const listTransactions = asyncHandler(async (req, res) => {
  const { account_id: accountId, order_no: orderNo, limit, offset } = req.query || {};
  const data = await transactionModel.listTransactions({ account_id: accountId, order_no: orderNo, limit, offset });
  return res.json({ success: true, data });
});

const listSyncLogs = asyncHandler(async (req, res) => {
  const { account_id: accountId, sync_scope: syncScope, limit } = req.query || {};
  const data = await syncLogModel.listRuns({ account_id: accountId, sync_scope: syncScope, limit });
  return res.json({ success: true, data });
});

const runPayoutSyncNow = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { account, credentials } = await loadAccountWithCredentials(accountId);

  const result = await darazFinanceSyncService.syncPayouts({ account, credentials, sync_type: "manual" });

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
  listSyncLogs,
  runPayoutSyncNow,
  runTransactionSyncNow,
};
