const axios = require("axios");

const DEFAULT_BASE_URL = "https://admin.brighthub.lk/api/v1";

function cleanBaseUrl(baseUrl) {
  let url = String(baseUrl || DEFAULT_BASE_URL).trim();

  if (!url) url = DEFAULT_BASE_URL;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

function createBrightHubClient({ api_base_url, api_key }) {
  if (!api_key) throw new Error("BrightHub API key is required.");

  return axios.create({
    baseURL: cleanBaseUrl(api_base_url),
    timeout: 30000,
    headers: {
      Accept: "application/json",
      "X-API-Key": api_key,
    },
  });
}

function getBrightHubError(error) {
  return {
    status_code: error.response?.status || 500,
    message:
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "BrightHub API request failed.",
    response: error.response?.data || null,
  };
}

async function testConnection(credentials) {
  const client = createBrightHubClient(credentials);

  try {
    const response = await client.get("/products", { params: { page: 1, limit: 1 } });

    return {
      success: true,
      status_code: response.status,
      message: "BrightHub connected successfully.",
      sample_count: Array.isArray(response.data?.data) ? response.data.data.length : 0,
    };
  } catch (error) {
    const brightHubError = getBrightHubError(error);

    return {
      success: false,
      status_code: brightHubError.status_code,
      message: brightHubError.message,
      response: brightHubError.response,
    };
  }
}

async function getProducts(credentials, query = {}) {
  const client = createBrightHubClient(credentials);

  const response = await client.get("/products", {
    params: {
      page: query.page || 1,
      limit: query.limit || 20,
      search: query.search || undefined,
      category_id: query.category_id || undefined,
      status: query.status || undefined,
      sort: query.sort || undefined,
    },
  });

  const body = response.data || {};

  return {
    data: Array.isArray(body.data) ? body.data : [],
    total: Number(body.pagination?.total || 0),
    total_pages: Number(body.pagination?.totalPages || 0),
  };
}

async function getProduct(credentials, bhid) {
  const client = createBrightHubClient(credentials);
  const response = await client.get(`/products/${encodeURIComponent(bhid)}`);
  return response.data?.data || null;
}

async function createProduct(credentials, payload) {
  const client = createBrightHubClient(credentials);
  const response = await client.post("/products", payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data?.data || null;
}

// PUT is a full replace on BrightHub's side - the caller must send the
// complete product object (fields it omits get cleared), not a partial diff.
async function updateProduct(credentials, bhid, payload) {
  const client = createBrightHubClient(credentials);
  const response = await client.put(`/products/${encodeURIComponent(bhid)}`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data?.data || null;
}

async function deleteProduct(credentials, bhid) {
  const client = createBrightHubClient(credentials);
  const response = await client.delete(`/products/${encodeURIComponent(bhid)}`);
  return response.data || { success: true };
}

async function getOrders(credentials, query = {}) {
  const client = createBrightHubClient(credentials);

  const response = await client.get("/orders", {
    params: {
      page: query.page || 1,
      limit: query.limit || 20,
      status: query.status || undefined,
    },
  });

  const body = response.data || {};

  return {
    data: Array.isArray(body.data) ? body.data : [],
    total: Number(body.pagination?.total || 0),
    total_pages: Number(body.pagination?.totalPages || 0),
  };
}

async function getOrder(credentials, orderId) {
  const client = createBrightHubClient(credentials);
  const response = await client.get(`/orders/${encodeURIComponent(orderId)}`);
  return response.data?.data || null;
}

// There is no delete endpoint for orders - "Cancelled" is a status value,
// set via this same PUT, that releases the stock/sales committed at creation.
async function updateOrderStatus(credentials, orderId, status) {
  const client = createBrightHubClient(credentials);
  const response = await client.put(
    `/orders/${encodeURIComponent(orderId)}/status`,
    { status },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data?.data || null;
}

module.exports = {
  DEFAULT_BASE_URL,
  cleanBaseUrl,
  testConnection,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  getOrder,
  updateOrderStatus,
};
