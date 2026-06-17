import API from "../../config/api";

export const extractApiMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error) return fallback;
  const data = error?.response?.data || error?.data || error;
  if (data?.user_message) return data.user_message;
  if (data?.daraz_message && data?.message) return `${data.message} Daraz says: ${data.daraz_message}`;
  if (data?.message && data?.error) return `${data.message}: ${data.error}`;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (error?.message === "Network Error") return "Unable to connect to the backend server. Please check the server/API URL.";
  return error?.message || fallback;
};

export const successMessage = (message, fallback = "Request completed successfully.") => message || fallback;

const pickArray = (payload, keys = []) => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], payload);
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(payload)) return payload;
  return [];
};

export const normalizeListResponse = (payload, listKeys = []) => ({
  raw: payload,
  rows: pickArray(payload, listKeys),
  total: Number(payload?.total ?? payload?.count ?? payload?.pagination?.total ?? 0),
  page: Number(payload?.page ?? payload?.pagination?.page ?? 1),
  limit: Number(payload?.limit ?? payload?.pagination?.limit ?? 50),
  totalPages: Number(payload?.total_pages ?? payload?.totalPages ?? payload?.pagination?.total_pages ?? 1),
  message: payload?.message || ""
});

export const formatDateTime = (value) => {
  if (!value) return "-";
  let date;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    date = new Date(numeric > 9999999999 ? numeric : numeric * 1000);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const formatDateOnly = (value) => {
  if (!value) return "-";
  let date;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    date = new Date(numeric > 9999999999 ? numeric : numeric * 1000);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const safeJsonParse = (value, fallback = null) => {
  try {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const extractProductImages = (product = {}) => {
  const images = [];
  const add = (url) => {
    if (typeof url === "string" && url.trim().startsWith("http")) images.push(url.trim());
  };
  const parse = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((img) => {
        if (typeof img === "string") add(img);
        else add(img?.image_url || img?.url || img?.daraz_image_url);
      });
      return;
    }
    if (typeof value === "object") {
      parse(value.images || value.Images || value.marketImages || value.urls);
      add(value.image_url || value.url || value.daraz_image_url);
      return;
    }
    if (typeof value === "string") {
      if (value.trim().startsWith("http")) return add(value);
      const parsed = safeJsonParse(value, null);
      if (parsed) parse(parsed);
      else value.split(",").forEach(add);
    }
  };
  parse(product.images);
  parse(product.images_json);
  parse(product.raw_json);
  return [...new Set(images)];
};

export const normalizeStatus = (value) => String(value || "").toLowerCase().replace(/[\s_-]/g, "");

export const darazApi = {
  dashboard: async () => {
    const res = await API.get("/daraz/dashboard/summary");
    return res.data?.data || res.data || {};
  },

  getAccounts: async (params = {}) => {
    const res = await API.get("/accounts", { params });
    return normalizeListResponse(res.data, ["accounts", "data"]);
  },

  createAccount: async (payload) => {
    const res = await API.post("/accounts", payload);
    return res.data;
  },

  updateAccount: async (accountCode, payload) => {
    const res = await API.put(`/accounts/${accountCode}`, payload);
    return res.data;
  },

  refreshAccountToken: async (accountCode) => {
    const res = await API.post(`/accounts/${accountCode}/refresh-token`);
    return res.data;
  },

  getAccountAuthUrl: async (accountCode) => {
    const res = await API.get(`/accounts/${accountCode}/auth-url`);
    return res.data;
  },

  completeDarazAuth: async (accountCode, code) => {
    const res = await API.get(`/accounts/${accountCode}/auth/callback`, {
      params: { code }
    });
    return res.data;
  },

  getProducts: async (params = {}) => {
    const res = await API.get("/daraz/products", { params });
    return normalizeListResponse(res.data, ["products", "data", "rows"]);
  },

  getProduct: async (productId) => {
    const res = await API.get(`/daraz/products/${productId}`);
    return res.data?.product || res.data?.data || res.data;
  },

  syncProducts: async (accountCode = null, force = false) => {
    const url = accountCode && accountCode !== "all" ? `/daraz/sync/${accountCode}` : "/daraz/sync";
    const res = await API.post(url, null, { params: { force: force ? "true" : "false" } });
    return res.data;
  },

  getOrders: async (params = {}) => {
    const res = await API.get("/daraz/orders", { params });
    return normalizeListResponse(res.data, ["orders", "data", "data.orders", "rows"]);
  },

  getOrder: async (orderId) => {
    const res = await API.get(`/daraz/orders/${orderId}`);
    return res.data?.order || res.data?.data || res.data;
  },

  syncOrders: async (accountCode = null, params = {}) => {
    const url = accountCode && accountCode !== "all" ? `/daraz/orders/sync/${accountCode}` : "/daraz/orders/sync";
    const res = await API.post(url, null, { params });
    return res.data;
  },

  getOosSkus: async (params = {}) => {
    const res = await API.get("/daraz/inventory/oos", { params });
    return normalizeListResponse(res.data, ["skus", "data", "rows"]);
  },

  getStockQueue: async (params = {}) => {
    const res = await API.get("/daraz/inventory/stock-queue", { params });
    return normalizeListResponse(res.data, ["queue", "data", "rows"]);
  },

  addStockQueue: async (payload) => {
    const res = await API.post("/daraz/inventory/stock-queue", payload);
    return res.data;
  },

  getCategories: async (params = {}) => {
    const res = await API.get("/daraz/categories", { params });
    return normalizeListResponse(res.data, ["categories", "data", "rows"]);
  },

  syncCategories: async () => {
    const res = await API.post("/daraz/categories/sync-tree");
    return res.data;
  },

  getCategoryAttributes: async (categoryId) => {
    const res = await API.get("/daraz/category-attributes", { params: { category_id: categoryId } });
    return normalizeListResponse(res.data, ["attributes", "data", "rows"]);
  },

  syncCategoryAttributes: async (categoryId) => {
    const res = await API.post(`/daraz/category-attributes/${categoryId}/sync`);
    return res.data;
  },

  getCategoryBrands: async (categoryId) => {
    const res = await API.get("/daraz/category-brands", { params: { category_id: categoryId } });
    return normalizeListResponse(res.data, ["brands", "data", "rows"]);
  },

  syncCategoryBrands: async (categoryId) => {
    const res = await API.post(`/daraz/category-brands/${categoryId}/sync`);
    return res.data;
  },

  getFinance: async () => {
    const res = await API.get("/daraz/finance/all-with-image");
    return normalizeListResponse(res.data, ["data", "transactions", "rows"]);
  }
};
