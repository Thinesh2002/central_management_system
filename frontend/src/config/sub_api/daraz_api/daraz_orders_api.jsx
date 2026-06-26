import api from "../../api";

const BASE_PATH = "/daraz/orders";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function cleanParams(params = {}) {
  const cleaned = {};

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (key === "page" || key === "limit" || key === "offset") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) return;
      cleaned[key] = numberValue;
      return;
    }

    cleaned[key] = value;
  });

  const page = Number(cleaned.page || 1);
  const limit = Number(cleaned.limit || 25);

  if (page > 0 && limit > 0 && cleaned.offset === undefined) {
    cleaned.offset = (page - 1) * limit;
  }

  return cleaned;
}

function safeId(value, fieldName = "id") {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${fieldName} is required`);
  }

  return encodeURIComponent(String(value));
}

function unwrapResponse(response) {
  return response?.data ?? response;
}

function unwrapFinal(response, preferredKeys = []) {
  let payload = unwrapResponse(response);

  if (payload === undefined || payload === null) return payload;
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return payload;

  for (const key of preferredKeys) {
    if (hasOwn(payload, key)) return payload[key];
  }

  const wrapperKeys = ["data", "result", "payload", "response"];

  for (const key of wrapperKeys) {
    if (!hasOwn(payload, key)) continue;

    const value = payload[key];

    if (value === undefined || value === null) return value;
    if (Array.isArray(value)) return value;
    if (!isObject(value)) return value;

    for (const preferredKey of preferredKeys) {
      if (hasOwn(value, preferredKey)) return value[preferredKey];
    }

    return value;
  }

  return payload;
}

export const darazOrdersApi = {
  getOrders: async (params = {}) => {
    const response = await api.get(BASE_PATH, {
      params: cleanParams(params),
    });

    return unwrapResponse(response);
  },

  getOrderById: async (orderId) => {
    const response = await api.get(`${BASE_PATH}/${safeId(orderId, "orderId")}`);

    return unwrapFinal(response, ["order", "detail", "data"]);
  },

  syncOrders: async (payload = {}) => {
    const accountCode = payload.account_code || payload.accountCode;

    if (!accountCode) {
      throw new Error("Please select account name before syncing.");
    }

    const response = await api.post(BASE_PATH + "/sync", {
      ...payload,
      account_code: accountCode,
    });

    return unwrapFinal(response, ["sync", "summary", "result", "results"]);
  },

  syncAccountOrders: async (accountCode, payload = {}) => {
    if (!accountCode) {
      throw new Error("accountCode is required");
    }

    const response = await api.post(BASE_PATH + "/sync", {
      ...payload,
      account_code: accountCode,
    });

    return unwrapFinal(response, ["sync", "summary", "result", "results"]);
  },

  syncTracking: async (orderId) => {
    const response = await api.post(
      `${BASE_PATH}/${safeId(orderId, "orderId")}/tracking/sync`
    );

    return unwrapFinal(response, ["tracking", "result"]);
  },

  generateAwb: async (orderId) => {
    const response = await api.post(
      `${BASE_PATH}/${safeId(orderId, "orderId")}/awb`
    );

    return unwrapFinal(response, ["awb", "result"]);
  },

  bulkGenerateAwb: async (orderIds = []) => {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error("orderIds array is required");
    }

    const response = await api.post(`${BASE_PATH}/bulk/awb`, {
      order_ids: orderIds,
    });

    return unwrapFinal(response, ["results", "result"]);
  },

  changeStatus: async (orderId, status, payload = {}) => {
    if (!status) {
      throw new Error("status is required");
    }

    const response = await api.post(
      `${BASE_PATH}/${safeId(orderId, "orderId")}/status`,
      { ...payload, status }
    );

    return unwrapFinal(response, ["order", "result"]);
  },

  bulkChangeStatus: async (orderIds = [], status, payload = {}) => {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error("orderIds array is required");
    }

    if (!status) {
      throw new Error("status is required");
    }

    const response = await api.post(`${BASE_PATH}/bulk/status`, {
      ...payload,
      order_ids: orderIds,
      status,
    });

    return unwrapFinal(response, ["results", "result"]);
  },

  getApiLogs: async (params = {}) => {
    const response = await api.get(`${BASE_PATH}/logs/api`, {
      params: cleanParams(params),
    });

    return unwrapFinal(response, ["logs", "rows", "items", "list"]);
  },

  getSyncLogs: async (params = {}) => {
    const response = await api.get(`${BASE_PATH}/logs/sync`, {
      params: cleanParams(params),
    });

    return unwrapFinal(response, ["logs", "rows", "items", "list"]);
  },
};

export default darazOrdersApi;