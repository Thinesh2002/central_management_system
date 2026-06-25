import api from "../../../api";

export const productInventoryApi = {
  getAll(params = {}) {
    return api.get("/product/product-inventory", { params });
  },

  getById(id) {
    return api.get(`/product/product-inventory/${id}`);
  },

  create(data) {
    return api.post("/product/product-inventory", data);
  },

  update(id, data) {
    return api.put(`/product/product-inventory/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-inventory/${id}`);
  },
};