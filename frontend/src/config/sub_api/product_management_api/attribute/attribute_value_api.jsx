import api from "../../../api";

export const attributeValueApi = {
  getAll(params = {}) {
    return api.get("/product/attribute-values", { params });
  },

  getById(id) {
    return api.get(`/product/attribute-values/${id}`);
  },

  create(data) {
    return api.post("/product/attribute-values", data);
  },

  update(id, data) {
    return api.put(`/product/attribute-values/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product/attribute-values/${id}`);
  },
};