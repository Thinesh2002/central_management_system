import api from "../../../config/api";

const LONG_TIMEOUT = 300000;

export const darazContentOptimizerApi = {
  scan: (payload = {}) => api.post("/daraz/content-optimizer/scan", payload, { timeout: LONG_TIMEOUT }),
  listSuggestions: (params = {}) => api.get("/daraz/content-optimizer/suggestions", { params }),
  getSuggestion: (id) => api.get(`/daraz/content-optimizer/suggestions/${id}`),
  applyDescription: (id) => api.post(`/daraz/content-optimizer/suggestions/${id}/apply-description`),
  reject: (id) => api.post(`/daraz/content-optimizer/suggestions/${id}/reject`),
};

export default darazContentOptimizerApi;
