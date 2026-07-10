const darazFinanceApiService = require("./daraz_finance_api_service");
const payoutModel = require("../../../models/daraz/finance_management/daraz_finance_payout_model");
const transactionModel = require("../../../models/daraz/finance_management/daraz_finance_transaction_model");
const syncLogModel = require("../../../models/daraz/finance_management/daraz_finance_sync_log_model");

const PAYOUT_LOOKBACK_DAYS = 90;
const TRANSACTION_LOOKBACK_DAYS = 7;
const TRANSACTION_PAGE_SIZE = 500;

function toDateParam(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days) {
  return toDateParam(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

function extractRows(responseData) {
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData)) return responseData;
  return [];
}

async function syncPayouts({ account, credentials, sync_type = "auto", createdAfter }) {
  const runId = await syncLogModel.createSyncRun({
    account_id: account.id,
    sync_scope: "payout",
    sync_type,
  });

  let totalFound = 0;
  let totalSaved = 0;

  try {
    const after = createdAfter || daysAgo(PAYOUT_LOOKBACK_DAYS);

    const response = await darazFinanceApiService.getPayoutStatus({
      account,
      credentials,
      createdAfter: after,
    });

    const rows = extractRows(response?.data);
    totalFound = rows.length;

    for (const row of rows) {
      const saved = await payoutModel.upsertPayout(account.id, row);
      if (saved) totalSaved += 1;
    }

    await syncLogModel.finishSyncRun({
      run_id: runId,
      status: "success",
      total_found: totalFound,
      total_saved: totalSaved,
    });

    return { success: true, total_found: totalFound, total_saved: totalSaved };
  } catch (error) {
    await syncLogModel.finishSyncRun({
      run_id: runId,
      status: "failed",
      total_found: totalFound,
      total_saved: totalSaved,
      error_message: error.message,
    });

    throw error;
  }
}

async function syncTransactions({ account, credentials, sync_type = "auto", startTime, endTime }) {
  const runId = await syncLogModel.createSyncRun({
    account_id: account.id,
    sync_scope: "transaction",
    sync_type,
  });

  let totalFound = 0;
  let totalSaved = 0;

  try {
    const end = endTime || toDateParam(new Date());
    const start = startTime || daysAgo(TRANSACTION_LOOKBACK_DAYS);

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await darazFinanceApiService.getTransactionDetails({
        account,
        credentials,
        startTime: start,
        endTime: end,
        offset,
        limit: TRANSACTION_PAGE_SIZE,
      });

      const rows = extractRows(response?.data);
      totalFound += rows.length;

      for (const row of rows) {
        const saved = await transactionModel.upsertTransaction(account.id, row);
        if (saved) totalSaved += 1;
      }

      hasMore = rows.length === TRANSACTION_PAGE_SIZE;
      offset += TRANSACTION_PAGE_SIZE;
    }

    await syncLogModel.finishSyncRun({
      run_id: runId,
      status: "success",
      total_found: totalFound,
      total_saved: totalSaved,
    });

    return { success: true, total_found: totalFound, total_saved: totalSaved };
  } catch (error) {
    await syncLogModel.finishSyncRun({
      run_id: runId,
      status: "failed",
      total_found: totalFound,
      total_saved: totalSaved,
      error_message: error.message,
    });

    throw error;
  }
}

module.exports = { syncPayouts, syncTransactions };
