import api from "../../../api";

export const productImageApi = {
  getAll(params = {}) {
    return api.get("/product-management/product-images", { params });
  },

  getById(id) {
    return api.get(`/product-management/product-images/${id}`);
  },

  create(data) {
    return api.post("/product-management/product-images", data);
  },

  update(id, data) {
    return api.put(`/product-management/product-images/${id}`, data);
  },

  patch(id, data) {
    return api.patch(`/product-management/product-images/${id}`, data);
  },

  delete(id) {
    return api.delete(`/product-management/product-images/${id}`);
  },
};

export default productImageApi;