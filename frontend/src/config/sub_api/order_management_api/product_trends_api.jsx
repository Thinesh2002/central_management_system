import api from "../../../config/api";

const productTrendsApi = {
  async getAll() {
    const response = await api.get("/order-management/product-trends");
    return response.data;
  },
};

export default productTrendsApi;
