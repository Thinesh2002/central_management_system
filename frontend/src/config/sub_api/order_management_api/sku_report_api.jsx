import api from "../../../config/api";

export const skuReportApi = {
  get: (sku) => api.get(`/order-management/sku-report/${encodeURIComponent(sku)}`),
};

export default skuReportApi;
