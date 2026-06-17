import API from "../../config/api";

export const extractError = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong. Please check backend logs.";

const unwrap = (res) => res.data || {};
const list = (res) => {
  const data = unwrap(res);
  return {
    rows: data.rows || data.data || [],
    total: data.total ?? data.count ?? (data.rows || data.data || []).length,
    raw: data,
  };
};

export const enterpriseApi = {
  bootstrap: async () => unwrap(await API.post("/enterprise/bootstrap")),
  dashboard: async () => unwrap(await API.get("/enterprise/dashboard")),
  generateSku: async (params = {}) => unwrap(await API.get("/enterprise/generate-sku", { params })),
  products: async (params = {}) => list(await API.get("/enterprise/products", { params })),
  saveProduct: async (payload = {}) => unwrap(await API.post("/enterprise/products", payload)),
  updateProduct: async (sku, payload = {}) => unwrap(await API.put(`/enterprise/products/${encodeURIComponent(sku)}`, payload)),
  deactivateProduct: async (sku) => unwrap(await API.post(`/enterprise/products/${encodeURIComponent(sku)}/deactivate`)),
  deleteProduct: async (sku, hard = false) => unwrap(await API.delete(`/enterprise/products/${encodeURIComponent(sku)}`, { params: { hard } })),
  updateStock: async (payload = {}) => unwrap(await API.put("/enterprise/stock", payload)),
  categories: async () => unwrap(await API.get("/enterprise/categories")),
  saveCategory: async (payload = {}) => unwrap(await API.post("/enterprise/categories", payload)),
  saveSubCategory: async (payload = {}) => unwrap(await API.post("/enterprise/sub-categories", payload)),
  deleteCategory: async (code) => unwrap(await API.delete(`/enterprise/categories/${encodeURIComponent(code)}`)),
  deleteSubCategory: async (code) => unwrap(await API.delete(`/enterprise/sub-categories/${encodeURIComponent(code)}`)),
  mappings: async (params = {}) => list(await API.get("/enterprise/sku-mapping", { params })),
  saveMapping: async (payload = {}) => unwrap(await API.post("/enterprise/sku-mapping", payload)),
  categoryMappings: async (params = {}) => list(await API.get("/enterprise/category-mapping", { params })),
  saveCategoryMapping: async (payload = {}) => unwrap(await API.post("/enterprise/category-mapping", payload)),
  images: async (params = {}) => list(await API.get("/enterprise/images", { params })),
  orders: async (params = {}) => list(await API.get("/enterprise/orders", { params })),
  updateOrderStatus: async (payload = {}) => unwrap(await API.put("/enterprise/orders/status", payload)),
  finance: async (params = {}) => unwrap(await API.get("/enterprise/finance", { params })),
  packRules: async () => list(await API.get("/enterprise/pack-rules")),
  savePackRule: async (payload = {}) => unwrap(await API.post("/enterprise/pack-rules", payload)),
  logs: async (params = {}) => list(await API.get("/enterprise/logs", { params })),
};
