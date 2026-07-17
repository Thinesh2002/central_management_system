const axios = require("axios");

function cleanStoreUrl(storeUrl) {
  if (!storeUrl || typeof storeUrl !== "string") {
    throw new Error("WooCommerce store URL is required.");
  }

  let url = storeUrl.trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, "");
}

function createWooClient({ store_url, consumer_key, consumer_secret }) {
  const storeUrl = cleanStoreUrl(store_url);

  if (!consumer_key) throw new Error("WooCommerce consumer key is required.");
  if (!consumer_secret) throw new Error("WooCommerce consumer secret is required.");

  const config = {
    baseURL: `${storeUrl}/wp-json/wc/v3`,
    timeout: 30000,
    headers: {
      Accept: "application/json",
      "User-Agent": "Central-Management-WooCommerce/1.0",
    },
  };

  if (storeUrl.startsWith("https://")) {
    config.auth = {
      username: consumer_key,
      password: consumer_secret,
    };
  } else {
    config.params = {
      consumer_key,
      consumer_secret,
    };
  }

  return axios.create(config);
}

function getWooError(error) {
  return {
    status_code: error.response?.status || 500,
    message:
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "WooCommerce API request failed.",
    response: error.response?.data || null,
  };
}

async function testConnection(credentials) {
  const client = createWooClient(credentials);

  try {
    const response = await client.get("/products", {
      params: {
        page: 1,
        per_page: 1,
      },
    });

    return {
      success: true,
      status_code: response.status,
      message: "WooCommerce connected successfully.",
      sample_count: Array.isArray(response.data) ? response.data.length : 0,
    };
  } catch (error) {
    const wooError = getWooError(error);

    return {
      success: false,
      status_code: wooError.status_code,
      message: wooError.message,
      response: wooError.response,
    };
  }
}

async function getProducts(credentials, query = {}) {
  const client = createWooClient(credentials);

  const response = await client.get("/products", {
    params: {
      page: query.page || 1,
      per_page: query.per_page || 20,
      status: query.status || undefined,
      search: query.search || undefined,
      sku: query.sku || undefined,
      orderby: query.orderby || "date",
      order: query.order || "desc",
    },
  });

  return {
    data: response.data,
    total: Number(response.headers["x-wp-total"] || 0),
    total_pages: Number(response.headers["x-wp-totalpages"] || 0),
  };
}

async function getOrders(credentials, query = {}) {
  const client = createWooClient(credentials);

  const response = await client.get("/orders", {
    params: {
      page: query.page || 1,
      per_page: query.per_page || 50,
      status: query.status || undefined,
      after: query.after || undefined,
      before: query.before || undefined,
      modified_after: query.modifiedAfter || undefined,
      orderby: query.orderby || "date",
      order: query.order || "desc",
    },
  });

  return {
    data: response.data,
    total: Number(response.headers["x-wp-total"] || 0),
    total_pages: Number(response.headers["x-wp-totalpages"] || 0),
  };
}

async function getOrder(credentials, orderId) {
  const client = createWooClient(credentials);
  const response = await client.get(`/orders/${orderId}`);
  return response.data;
}

async function getCategories(credentials, query = {}) {
  const client = createWooClient(credentials);

  const response = await client.get("/products/categories", {
    params: {
      page: query.page || 1,
      per_page: query.per_page || 100,
      search: query.search || undefined,
      orderby: query.orderby || "name",
      order: query.order || "asc",
    },
  });

  return {
    data: response.data,
    total: Number(response.headers["x-wp-total"] || 0),
    total_pages: Number(response.headers["x-wp-totalpages"] || 0),
  };
}

async function getProductVariations(credentials, productId, query = {}) {
  const client = createWooClient(credentials);

  const response = await client.get(`/products/${productId}/variations`, {
    params: {
      page: query.page || 1,
      per_page: query.per_page || 100,
    },
  });

  return {
    data: response.data,
    total: Number(response.headers["x-wp-total"] || 0),
    total_pages: Number(response.headers["x-wp-totalpages"] || 0),
  };
}

async function createProduct(credentials, payload = {}) {
  const client = createWooClient(credentials);

  try {
    const response = await client.post("/products", payload);
    return response.data;
  } catch (error) {
    throw Object.assign(new Error(getWooError(error).message), { woo: getWooError(error) });
  }
}

async function updateProduct(credentials, productId, payload = {}) {
  const client = createWooClient(credentials);

  try {
    const response = await client.put(`/products/${productId}`, payload);
    return response.data;
  } catch (error) {
    throw Object.assign(new Error(getWooError(error).message), { woo: getWooError(error) });
  }
}

async function updateProductVariation(credentials, productId, variationId, payload = {}) {
  const client = createWooClient(credentials);

  try {
    const response = await client.put(`/products/${productId}/variations/${variationId}`, payload);
    return response.data;
  } catch (error) {
    throw Object.assign(new Error(getWooError(error).message), { woo: getWooError(error) });
  }
}

module.exports = {
  cleanStoreUrl,
  testConnection,
  getProducts,
  getCategories,
  getProductVariations,
  createProduct,
  updateProduct,
  updateProductVariation,
  getOrders,
  getOrder,
};