import api from "../../../config/api";

const CUSTOMERS_BASE_URL = "/order-management/customers";

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

const customersApi = {
  async getAll(params = {}) {
    const response = await api.get(CUSTOMERS_BASE_URL, { params: cleanParams(params) });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`${CUSTOMERS_BASE_URL}/${id}`);
    return response.data;
  },
};

export default customersApi;
