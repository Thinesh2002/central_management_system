import api from "../../../api";

export const productAttributeValueApi = {
  getAll(params = {}) {
    return api.get("/product/product-attribute-values", { params });
  },

  getById(id) {
    return api.get(`/product/product-attribute-values/${id}`);
  },

  create(data) {
    return api.post("/product/product-attribute-values", data);
  },

  update(id, data) {
    return api.put(`/product/product-attribute-values/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-attribute-values/${id}`);
  },
};