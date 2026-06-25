import api from "../../../api";

export const productVariantApi = {
  getAll(params = {}) {
    return api.get("/product/product-variants", { params });
  },

  getOrderPickerProducts(params = {}) {
    return api.get("/product/product-variants/order-picker", { params });
  },

  getById(id) {
    return api.get(`/product/product-variants/${encodeURIComponent(id)}`);
  },

  create(data) {
    return api.post("/product/product-variants", data);
  },

  update(id, data) {
    return api.put(`/product/product-variants/${encodeURIComponent(id)}`, data);
  },

  patch(id, data) {
    return api.patch(`/product/product-variants/${encodeURIComponent(id)}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-variants/${encodeURIComponent(id)}`);
  },
};

export default productVariantApi;