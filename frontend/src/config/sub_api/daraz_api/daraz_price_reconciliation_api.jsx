import api from "../../../config/api";

const LONG_TIMEOUT = 300000;

export const darazPriceReconciliationApi = {
  run: () => api.post("/daraz/price-reconciliation/run", {}, { timeout: LONG_TIMEOUT }),
};

export default darazPriceReconciliationApi;
