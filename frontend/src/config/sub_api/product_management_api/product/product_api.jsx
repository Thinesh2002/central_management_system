import api from "../../../api";

export const productApi = {
  getAll(params = {}) {
    return api.get("/product/products", { params });
  },

  getById(id) {
    return api.get(`/product/products/${id}`);
  },

  create(data) {
    return api.post("/product/products", data);
  },

  update(id, data) {
    return api.put(`/product/products/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/products/${id}`);
  },
};