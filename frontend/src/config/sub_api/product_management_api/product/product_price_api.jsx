import api from "../../../api";

export const productPriceApi = {
  getAll(params = {}) {
    return api.get("/product/product-prices", { params });
  },

  getById(id) {
    return api.get(`/product/product-prices/${id}`);
  },

  create(data) {
    return api.post("/product/product-prices", data);
  },

  update(id, data) {
    return api.put(`/product/product-prices/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-prices/${id}`);
  },
};