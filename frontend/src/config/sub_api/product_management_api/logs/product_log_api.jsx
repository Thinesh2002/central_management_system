import api from "../../../api";

export const productLogApi = {
  getAll(params = {}) {
    return api.get("/product/product-logs", { params });
  },

  getById(id) {
    return api.get(`/product/product-logs/${id}`);
  },

  create(data) {
    return api.post("/product/product-logs", data);
  },

  update(id, data) {
    return api.put(`/product/product-logs/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-logs/${id}`);
  },
};