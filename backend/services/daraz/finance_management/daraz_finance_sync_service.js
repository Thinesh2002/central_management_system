const darazFinanceApiService = require("./daraz_finance_api_service");
const payoutModel = require("../../../models/daraz/finance_management/daraz_finance_payout_model");
const transactionModel = require("../../../models/daraz/finance_management/daraz_finance_transaction_model");
const accountTransactionModel = require("../../../models/daraz/finance_management/daraz_finance_account_transaction_model");
const syncLogModel = require("../../../models/daraz/finance_management/daraz_finance_sync_log_model");

const PAYOUT_LOOKBACK_DAYS = 90;
const TRANSACTION_LOOKBACK_DAYS = 7;
const TRANSACTION_PAGE_SIZE = 500;
const ACCOUNT_TRANSACTION_PAGE_SIZE = 100;

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

async function syncAccountTransactions({ account, credentials, sync_type = "auto", startTime, endTime }) {
  const runId = await syncLogModel.createSyncRun({
    account_id: account.id,
    sync_scope: "account_transaction",
    sync_type,
  });
  let totalFound = 0;
  let totalSaved = 0;

  try {
    const end = endTime || toDateParam(new Date());
    const start = startTime || daysAgo(TRANSACTION_LOOKBACK_DAYS);
    let pageNum = 1;
    let totalPages = 1;

    do {
      const response = await darazFinanceApiService.queryAccountTransactions({
        account,
        credentials,
        startTime: start.replaceAll("-", ""),
        endTime: end.replaceAll("-", ""),
        pageNum,
        pageSize: ACCOUNT_TRANSACTION_PAGE_SIZE,
      });
      const payload = response?.data?.data || {};
      const rows = Array.isArray(payload.transactions) ? payload.transactions : [];
      totalFound += rows.length;
      for (const row of rows) {
        const saved = await accountTransactionModel.upsertAccountTransaction(account.id, row);
        if (saved) totalSaved += 1;
      }
      totalPages = Math.max(Number(payload.page_info?.total_page || 1), 1);
      if (!rows.length) break;
      pageNum += 1;
    } while (pageNum <= totalPages);

    await syncLogModel.finishSyncRun({ run_id: runId, status: "success", total_found: totalFound, total_saved: totalSaved });
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

// QueryTransactionDetails rejects windows of 180+ days (error 1000012), so
// long backfills are split into 30-day chunks, oldest first.
const RANGE_CHUNK_DAYS = 30;

function addDaysIso(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function syncTransactionsRange({ account, credentials, sync_type = "manual", dateFrom, dateTo, onChunk }) {
  let totalFound = 0;
  let totalSaved = 0;

  for (let start = dateFrom; start <= dateTo; start = addDaysIso(start, RANGE_CHUNK_DAYS)) {
    const chunkEnd = addDaysIso(start, RANGE_CHUNK_DAYS - 1);
    const end = chunkEnd < dateTo ? chunkEnd : dateTo;
    const result = await syncTransactions({ account, credentials, sync_type, startTime: start, endTime: end });
    totalFound += result.total_found;
    totalSaved += result.total_saved;
    if (onChunk) onChunk({ start, end, ...result });
  }

  return { success: true, total_found: totalFound, total_saved: totalSaved };
}

async function syncAccountTransactionsRange({ account, credentials, sync_type = "manual", dateFrom, dateTo }) {
  let totalFound = 0;
  let totalSaved = 0;
  for (let start = dateFrom; start <= dateTo; start = addDaysIso(start, RANGE_CHUNK_DAYS)) {
    const chunkEnd = addDaysIso(start, RANGE_CHUNK_DAYS - 1);
    const end = chunkEnd < dateTo ? chunkEnd : dateTo;
    const result = await syncAccountTransactions({ account, credentials, sync_type, startTime: start, endTime: end });
    totalFound += result.total_found;
    totalSaved += result.total_saved;
  }
  return { success: true, total_found: totalFound, total_saved: totalSaved };
}

module.exports = {
  syncPayouts,
  syncTransactions,
  syncTransactionsRange,
  syncAccountTransactions,
  syncAccountTransactionsRange,
};
