import api from "../../../config/api";

const LONG_TIMEOUT = 300000;

export const darazFinanceApi = {
  listPayouts: (params = {}) => api.get("/daraz/finance/payouts", { params }),
  listTransactions: (params = {}) => api.get("/daraz/finance/transactions", { params }),
  listSyncLogs: (params = {}) => api.get("/daraz/finance/sync-logs", { params }),
  getPayoutSummary: (params = {}) => api.get("/daraz/finance/payouts/summary", { params }),
  getTransactionSummary: (params = {}) => api.get("/daraz/finance/transactions/summary", { params }),

  syncPayoutsNow: (accountId) =>
    api.post(`/daraz/finance/payouts/sync/${accountId}`, {}, { timeout: LONG_TIMEOUT }),

  syncTransactionsNow: (accountId, payload = {}) =>
    api.post(`/daraz/finance/transactions/sync/${accountId}`, payload, { timeout: LONG_TIMEOUT }),
};

export default darazFinanceApi;
