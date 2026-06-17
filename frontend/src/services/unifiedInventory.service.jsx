import API from "../config/api";
import { extractApiMessage, normalizeListResponse } from "./daraz/darazCentral.service";

export const unifiedInventoryApi = {
  bootstrap: async () => {
    const res = await API.post("/system-inventory/bootstrap");
    return res.data;
  },
  dashboard: async () => {
    const res = await API.get("/system-inventory/dashboard");
    return res.data?.data || {};
  },
  products: async (params = {}) => {
    const res = await API.get("/system-inventory/products", { params });
    return normalizeListResponse(res.data, ["rows", "data"]);
  },
  categories: async () => {
    const res = await API.get("/system-inventory/categories");
    return res.data || { categories: [], sub_categories: [] };
  },
  addProduct: async (payload = {}) => {
    const res = await API.post("/system-inventory/products", payload);
    return res.data;
  },
  updateStock: async (payload = {}) => {
    const res = await API.put("/system-inventory/stock", payload);
    return res.data;
  },
  mappings: async (params = {}) => {
    const res = await API.get("/system-inventory/sku-mapping", { params });
    return normalizeListResponse(res.data, ["rows", "data"]);
  },
  saveMapping: async (payload = {}) => {
    const res = await API.post("/system-inventory/sku-mapping", payload);
    return res.data;
  },
  packRules: async () => {
    const res = await API.get("/system-inventory/pack-rules");
    return normalizeListResponse(res.data, ["rows", "data"]);
  },
  savePackRule: async (payload = {}) => {
    const res = await API.post("/system-inventory/pack-rules", payload);
    return res.data;
  },
  logs: async (params = {}) => {
    const res = await API.get("/system-inventory/logs", { params });
    return normalizeListResponse(res.data, ["rows", "data"]);
  }
};

export { extractApiMessage };
