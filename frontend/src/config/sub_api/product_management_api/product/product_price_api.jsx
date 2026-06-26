import api from "../../../api";

export const productPriceApi = {
  getAll(params = {}) {
    return api.get("/product-management/product-prices", { params });
  },

  getById(id) {
    return api.get(
      `/product-management/product-prices/${encodeURIComponent(id)}`
    );
  },

  getBySku(sku) {
    return api.get(
      `/product-management/product-prices/sku/${encodeURIComponent(sku)}`
    );
  },

  create(data) {
    return api.post("/product-management/product-prices", data);
  },

  update(id, data) {
    return api.put(
      `/product-management/product-prices/${encodeURIComponent(id)}`,
      data
    );
  },

  patch(id, data) {
    return api.patch(
      `/product-management/product-prices/${encodeURIComponent(id)}`,
      data
    );
  },

  updateBySku(sku, data) {
    return api.put(
      `/product-management/product-prices/sku/${encodeURIComponent(sku)}`,
      data
    );
  },

  patchBySku(sku, data) {
    return api.patch(
      `/product-management/product-prices/sku/${encodeURIComponent(sku)}`,
      data
    );
  },

  delete(id) {
    return api.delete(
      `/product-management/product-prices/${encodeURIComponent(id)}`
    );
  },

  deleteBySku(sku) {
    return api.delete(
      `/product-management/product-prices/sku/${encodeURIComponent(sku)}`
    );
  },
};

export default productPriceApi;