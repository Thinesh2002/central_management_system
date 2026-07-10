import api from "../../../config/api";

export const darazSellerMetricsApi = {
  get: (accountId) => api.get(`/daraz/seller-metrics/${accountId}`),
};

export default darazSellerMetricsApi;
