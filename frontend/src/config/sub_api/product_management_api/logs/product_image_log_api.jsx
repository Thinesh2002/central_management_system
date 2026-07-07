import api from "../../../api";

export const productImageLogApi = {
  getAll(params = {}) {
    return api.get("/product/product-image-logs", { params });
  },

  getById(id) {
    return api.get(`/product/product-image-logs/${id}`);
  },

  create(data) {
    return api.post("/product/product-image-logs", data);
  },

  update(id, data) {
    return api.put(`/product/product-image-logs/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-image-logs/${id}`);
  },
};