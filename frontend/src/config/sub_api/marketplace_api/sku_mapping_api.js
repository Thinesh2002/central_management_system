import api from "../../api";

export const skuMappingApi = {
  list: (params = {}) => api.get("/marketplace/sku-mappings", { params }),
  save: (payload = {}) => api.post("/marketplace/sku-mappings", payload),
  bulk: (rows = []) => api.post("/marketplace/sku-mappings/bulk", { rows }),
  remove: (id) => api.delete(`/marketplace/sku-mappings/${id}`),
  duplicateCheck: (payload = {}) => api.post("/marketplace/sku-mappings/duplicate-check", payload),
  unmapped: (params = {}) => api.get("/marketplace/sku-mappings/unmapped", { params }),
  suggestions: (params = {}) => api.get("/marketplace/sku-mappings/suggestions/local-skus", { params }),
};

export default skuMappingApi;
