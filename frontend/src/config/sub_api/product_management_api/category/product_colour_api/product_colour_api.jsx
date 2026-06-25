import api from "../../../../api";

const PRODUCT_COLOUR_BASE_URL = "/product-management/colours";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const productColourApi = {
  async getAll(params = {}) {
    const response = await api.get(PRODUCT_COLOUR_BASE_URL, {
      params: cleanParams(params),
    });

    return response.data;
  },

  async getById(id) {
    const response = await api.get(`${PRODUCT_COLOUR_BASE_URL}/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await api.post(PRODUCT_COLOUR_BASE_URL, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await api.put(`${PRODUCT_COLOUR_BASE_URL}/${id}`, payload);
    return response.data;
  },

  async delete(id) {
    const response = await api.delete(`${PRODUCT_COLOUR_BASE_URL}/${id}`);
    return response.data;
  },

  async restore(id) {
    const response = await api.patch(`${PRODUCT_COLOUR_BASE_URL}/${id}/restore`);
    return response.data;
  },

  async forceDelete(id) {
    const response = await api.delete(`${PRODUCT_COLOUR_BASE_URL}/${id}/force`);
    return response.data;
  },
};

export default productColourApi;

export async function getProductColours(params = {}) {
  return productColourApi.getAll(params);
}

export async function getProductColourById(id) {
  return productColourApi.getById(id);
}

export async function createProductColour(payload) {
  return productColourApi.create(payload);
}

export async function updateProductColour(id, payload) {
  return productColourApi.update(id, payload);
}

export async function deleteProductColour(id) {
  return productColourApi.delete(id);
}

export async function restoreProductColour(id) {
  return productColourApi.restore(id);
}

export async function forceDeleteProductColour(id) {
  return productColourApi.forceDelete(id);
}