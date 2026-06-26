import api from "../../../api";

function safeId(id) {
  return encodeURIComponent(id);
}

export const productInventoryApi = {
  getAll(params = {}) {
    return api.get("/product/product-inventory", { params });
  },

  getById(id) {
    return api.get(`/product/product-inventory/${safeId(id)}`);
  },

  getByProductId(productId, params = {}) {
    return api.get("/product/product-inventory", {
      params: {
        product_id: productId,
        local_product_id: productId,
        ...params,
      },
    });
  },

  getByVariantId(variantId, params = {}) {
    return api.get("/product/product-inventory", {
      params: {
        variant_id: variantId,
        product_variant_id: variantId,
        ...params,
      },
    });
  },

  create(data) {
    return api.post("/product/product-inventory", data);
  },

  update(id, data) {
    return api.put(`/product/product-inventory/${safeId(id)}`, data);
  },

  patch(id, data) {
    return api.patch(`/product/product-inventory/${safeId(id)}`, data);
  },

  delete(id) {
    return api.delete(`/product/product-inventory/${safeId(id)}`);
  },
};

export default productInventoryApi;