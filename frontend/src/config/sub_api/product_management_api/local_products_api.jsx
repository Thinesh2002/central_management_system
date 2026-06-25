import api from "../../api";

export const unwrap = (response) =>
  response?.data?.data ?? response?.data?.rows ?? response?.data?.items ?? response?.data ?? [];

async function tryGet(paths, params = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      const response = await api.get(path, { params });
      return unwrap(response);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status !== 404) throw error;
    }
  }

  throw lastError;
}

async function tryPost(paths, payload, config = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      const response = await api.post(path, payload, config);
      return unwrap(response);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status && status !== 404) throw error;
    }
  }

  throw lastError;
}

export const localProductsApi = {
  // Masters. Fallback paths included because your older master APIs are mounted separately.
  getCategories: (params = {}) =>
    tryGet(["/product/categories", "/product/categories", "/product/category"], params),

  getSubCategories: (params = {}) =>
    tryGet(["/product/sub-categories", "/product/sub-categories", "/product/sub_categories"], params),

  getProductModels: (params = {}) =>
    tryGet(["/product-management/models", "/product/product-models", "/product/models"], params),

  getColours: (params = {}) =>
    tryGet(["/product-management/colours", "/product/product-colours", "/product/colours"], params),

  getAttributes: (params = {}) =>
    tryGet(["/product-management/attributes", "/product/attributes"], params),

  getAttributeValues: (params = {}) =>
    tryGet(["/product-management/attribute-values", "/product/attribute-values"], params),

  createAttribute: (payload) =>
    tryPost(["/product-management/attributes", "/product/attributes"], payload),

  createAttributeValue: (payload) =>
    tryPost(["/product-management/attribute-values", "/product/attribute-values"], payload),

  // Products
  getProducts: (params = {}) => api.get("/product-management/products", { params }),
  getProductById: (id) => api.get(`/product-management/products/${id}`),
  createProduct: (payload) => api.post("/product-management/products", payload),
  updateProduct: (id, payload) => api.put(`/product-management/products/${id}`, payload),
  patchProduct: (id, payload) => api.patch(`/product-management/products/${id}`, payload),
  deleteProduct: (id) => api.delete(`/product-management/products/${id}`),

  // Variants
  getVariants: (params = {}) => api.get("/product-management/product-variants", { params }),
  getVariantById: (id) => api.get(`/product-management/product-variants/${id}`),
  createVariant: (payload) => api.post("/product-management/product-variants", payload),
  updateVariant: (id, payload) => api.put(`/product-management/product-variants/${id}`, payload),
  deleteVariant: (id) => api.delete(`/product-management/product-variants/${id}`),

  // Inventory
  getInventory: (params = {}) => api.get("/product-management/product-inventory", { params }),
  createInventory: (payload) => api.post("/product-management/product-inventory", payload),
  updateInventory: (id, payload) => api.put(`/product-management/product-inventory/${id}`, payload),
  deleteInventory: (id) => api.delete(`/product-management/product-inventory/${id}`),

  // Prices
  getPrices: (params = {}) => api.get("/product-management/product-prices", { params }),
  createPrice: (payload) => api.post("/product-management/product-prices", payload),
  updatePrice: (id, payload) => api.put(`/product-management/product-prices/${id}`, payload),
  deletePrice: (id) => api.delete(`/product-management/product-prices/${id}`),

  // Product attributes
  getProductAttributeValues: (params = {}) =>
    api.get("/product-management/product-attribute-values", { params }),
  createProductAttributeValue: (payload) =>
    api.post("/product-management/product-attribute-values", payload),
  updateProductAttributeValue: (id, payload) =>
    api.put(`/product-management/product-attribute-values/${id}`, payload),
  deleteProductAttributeValue: (id) =>
    api.delete(`/product-management/product-attribute-values/${id}`),

  // Images
  getImages: (params = {}) => api.get("/product-management/product-images", { params }),
  uploadImage: (formData) =>
    api.post("/product-management/product-images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateImage: (id, formData) =>
    api.put(`/product-management/product-images/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteImage: (id) => api.delete(`/product-management/product-images/${id}`),

  // Logs
  getProductLogs: (params = {}) => api.get("/product-management/product-logs", { params }),
  getProductImageLogs: (params = {}) => api.get("/product-management/product-image-logs", { params }),
};

export default localProductsApi;
