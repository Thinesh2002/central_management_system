import api from "../../api";

export const unwrap = (response) =>
  response?.data?.data ??
  response?.data?.rows ??
  response?.data?.items ??
  response?.data ??
  [];

async function tryGet(paths, params = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      const response = await api.get(path, { params });
      return unwrap(response);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;

      if (status && status !== 404) {
        throw error;
      }
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

      if (status && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
}

function safeValue(value) {
  return encodeURIComponent(String(value || "").trim());
}

export const localProductsApi = {
  getCategories: (params = {}) =>
    tryGet(["/product/categories", "/product/category"], params),

  getSubCategories: (params = {}) =>
    tryGet(["/product/sub-categories", "/product/sub_categories"], params),

  getProductModels: (params = {}) =>
    tryGet(
      [
        "/product-management/models",
        "/product/product-models",
        "/product/models",
      ],
      params
    ),

  getColours: (params = {}) =>
    tryGet(
      [
        "/product-management/colours",
        "/product/product-colours",
        "/product/colours",
      ],
      params
    ),

  getAttributes: (params = {}) =>
    tryGet(["/product-management/attributes", "/product/attributes"], params),

  getAttributeValues: (params = {}) =>
    tryGet(
      ["/product-management/attribute-values", "/product/attribute-values"],
      params
    ),

  createAttribute: (payload) =>
    tryPost(["/product-management/attributes", "/product/attributes"], payload),

  createAttributeValue: (payload) =>
    tryPost(
      ["/product-management/attribute-values", "/product/attribute-values"],
      payload
    ),

  getProducts: (params = {}) =>
    api.get("/product-management/products", { params }),

  getProductById: (id) =>
    api.get(`/product-management/products/${safeValue(id)}`),

  createProduct: (payload) =>
    api.post("/product-management/products", payload),

  updateProduct: (id, payload) =>
    api.put(`/product-management/products/${safeValue(id)}`, payload),

  patchProduct: (id, payload) =>
    api.patch(`/product-management/products/${safeValue(id)}`, payload),

  deleteProduct: (id) =>
    api.delete(`/product-management/products/${safeValue(id)}`),

  getVariants: (params = {}) =>
    api.get("/product-management/product-variants", { params }),

  getVariantById: (id) =>
    api.get(`/product-management/product-variants/${safeValue(id)}`),

  createVariant: (payload) =>
    api.post("/product-management/product-variants", payload),

  updateVariant: (id, payload) =>
    api.put(
      `/product-management/product-variants/${safeValue(id)}`,
      payload
    ),

  patchVariant: (id, payload) =>
    api.patch(
      `/product-management/product-variants/${safeValue(id)}`,
      payload
    ),

  deleteVariant: (id) =>
    api.delete(
      `/product-management/product-variants/${safeValue(id)}`
    ),

  getInventory: (params = {}) =>
    api.get("/product-management/product-inventory", { params }),

  getInventoryById: (id) =>
    api.get(`/product-management/product-inventory/${safeValue(id)}`),

  getInventoryBySku: (sku) =>
    api.get(`/product-management/product-inventory/sku/${safeValue(sku)}`),

  createInventory: (payload) =>
    api.post("/product-management/product-inventory", payload),

  updateInventory: (id, payload) =>
    api.put(
      `/product-management/product-inventory/${safeValue(id)}`,
      payload
    ),

  patchInventory: (id, payload) =>
    api.patch(
      `/product-management/product-inventory/${safeValue(id)}`,
      payload
    ),

  deleteInventory: (id) =>
    api.delete(
      `/product-management/product-inventory/${safeValue(id)}`
    ),

  updateInventoryBySku: (sku, payload) =>
    api.put(
      `/product-management/product-inventory/sku/${safeValue(sku)}`,
      payload
    ),

  patchInventoryBySku: (sku, payload) =>
    api.patch(
      `/product-management/product-inventory/sku/${safeValue(sku)}`,
      payload
    ),

  deleteInventoryBySku: (sku) =>
    api.delete(
      `/product-management/product-inventory/sku/${safeValue(sku)}`
    ),

  getPrices: (params = {}) =>
    api.get("/product-management/product-prices", { params }),

  getPriceById: (id) =>
    api.get(`/product-management/product-prices/${safeValue(id)}`),

  getPriceBySku: (sku) =>
    api.get(
      `/product-management/product-prices/sku/${safeValue(sku)}`
    ),

  createPrice: (payload) =>
    api.post("/product-management/product-prices", payload),

  updatePrice: (id, payload) =>
    api.put(
      `/product-management/product-prices/${safeValue(id)}`,
      payload
    ),

  patchPrice: (id, payload) =>
    api.patch(
      `/product-management/product-prices/${safeValue(id)}`,
      payload
    ),

  deletePrice: (id) =>
    api.delete(
      `/product-management/product-prices/${safeValue(id)}`
    ),

  updatePriceBySku: (sku, payload) =>
    api.put(
      `/product-management/product-prices/sku/${safeValue(sku)}`,
      payload
    ),

  patchPriceBySku: (sku, payload) =>
    api.patch(
      `/product-management/product-prices/sku/${safeValue(sku)}`,
      payload
    ),

  deletePriceBySku: (sku) =>
    api.delete(
      `/product-management/product-prices/sku/${safeValue(sku)}`
    ),

  getProductPrices: (params = {}) =>
    api.get("/product-management/product-prices", { params }),

  getProductPriceById: (id) =>
    api.get(`/product-management/product-prices/${safeValue(id)}`),

  getProductPriceBySku: (sku) =>
    api.get(
      `/product-management/product-prices/sku/${safeValue(sku)}`
    ),

  createProductPrice: (payload) =>
    api.post("/product-management/product-prices", payload),

  updateProductPrice: (id, payload) =>
    api.put(
      `/product-management/product-prices/${safeValue(id)}`,
      payload
    ),

  patchProductPrice: (id, payload) =>
    api.patch(
      `/product-management/product-prices/${safeValue(id)}`,
      payload
    ),

  deleteProductPrice: (id) =>
    api.delete(
      `/product-management/product-prices/${safeValue(id)}`
    ),

  updateProductPriceBySku: (sku, payload) =>
    api.put(
      `/product-management/product-prices/sku/${safeValue(sku)}`,
      payload
    ),

  patchProductPriceBySku: (sku, payload) =>
    api.patch(
      `/product-management/product-prices/sku/${safeValue(sku)}`,
      payload
    ),

  deleteProductPriceBySku: (sku) =>
    api.delete(
      `/product-management/product-prices/sku/${safeValue(sku)}`
    ),

  getProductAttributeValues: (params = {}) =>
    api.get("/product-management/product-attribute-values", { params }),

  createProductAttributeValue: (payload) =>
    api.post("/product-management/product-attribute-values", payload),

  updateProductAttributeValue: (id, payload) =>
    api.put(
      `/product-management/product-attribute-values/${safeValue(id)}`,
      payload
    ),

  patchProductAttributeValue: (id, payload) =>
    api.patch(
      `/product-management/product-attribute-values/${safeValue(id)}`,
      payload
    ),

  deleteProductAttributeValue: (id) =>
    api.delete(
      `/product-management/product-attribute-values/${safeValue(id)}`
    ),

  getImages: (params = {}) =>
    api.get("/product-management/product-images", { params }),

  uploadImage: (formData) =>
    api.post("/product-management/product-images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateImage: (id, formData) =>
    api.put(
      `/product-management/product-images/${safeValue(id)}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    ),

  deleteImage: (id) =>
    api.delete(`/product-management/product-images/${safeValue(id)}`),

  getProductLogs: (params = {}) =>
    api.get("/product-management/product-logs", { params }),

  getProductImageLogs: (params = {}) =>
    api.get("/product-management/product-image-logs", { params }),
};

export default localProductsApi;