import api from "../../../config/api";

const LONG_TIMEOUT = 300000;

export const darazTitleOptimizerApi = {
  scan: (payload = {}) => api.post("/daraz/title-optimizer/scan", payload, { timeout: LONG_TIMEOUT }),
  listSuggestions: (params = {}) => api.get("/daraz/title-optimizer/suggestions", { params }),
  approve: (id) => api.post(`/daraz/title-optimizer/suggestions/${id}/approve`),
  reject: (id) => api.post(`/daraz/title-optimizer/suggestions/${id}/reject`),
  getImpact: (logId) => api.get(`/daraz/title-optimizer/logs/${logId}/impact`),
};

export default darazTitleOptimizerApi;
