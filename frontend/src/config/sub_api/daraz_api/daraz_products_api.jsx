import api from "../../../config/api";

function requireId(id, label = "ID") {
  if (
    id === undefined ||
    id === null ||
    id === "" ||
    id === "undefined" ||
    id === "null"
  ) {
    throw new Error(`${label} missing.`);
  }

  return id;
}

const LONG_TIMEOUT = 300000;

export const darazProductsApi = {
  sync: (accountId, payload = {}, params = {}) => {
    return api.post(
      `/daraz-products/sync/${requireId(accountId, "Account ID")}`,
      payload,
      {
        params,
        timeout: LONG_TIMEOUT,
      }
    );
  },

  syncWithOptions: ({
    accountId,
    filter = "all_products",
    withDetail = true,
  } = {}) => {
    return api.post(
      `/daraz-products/sync/${requireId(accountId, "Account ID")}`,
      {
        filter,
        withDetail,
      },
      {
        timeout: LONG_TIMEOUT,
      }
    );
  },

  preview: (params = {}) => {
    return api.get("/daraz-products/preview", {
      params,
      timeout: LONG_TIMEOUT,
    });
  },

  runs: (params = {}) => {
    return api.get("/daraz-products/runs", {
      params,
      timeout: LONG_TIMEOUT,
    });
  },

  stats: (params = {}) => {
    return api.get("/daraz-products/stats", {
      params,
      timeout: LONG_TIMEOUT,
    });
  },

  view: (id) => {
    return api.get(`/daraz-products/view/${requireId(id, "Daraz product ID")}`, {
      timeout: LONG_TIMEOUT,
    });
  },

  viewByItemId: (accountId, itemId) => {
    return api.get(
      `/daraz-products/item/${requireId(accountId, "Account ID")}/${requireId(
        itemId,
        "Daraz item ID"
      )}`,
      {
        timeout: LONG_TIMEOUT,
      }
    );
  },

  raw: (id) => {
    return api.get(`/daraz-products/raw/${requireId(id, "Daraz product ID")}`, {
      timeout: LONG_TIMEOUT,
    });
  },

  updateStatus: (id, payload = {}) => {
    return api.patch(
      `/daraz-products/status/${requireId(id, "Daraz product ID")}`,
      payload,
      {
        timeout: LONG_TIMEOUT,
      }
    );
  },

  updateLocalLink: (id, payload = {}) => {
    return api.patch(
      `/daraz-products/local-link/${requireId(id, "Daraz product ID")}`,
      payload,
      {
        timeout: LONG_TIMEOUT,
      }
    );
  },

  delete: (id) => {
    return api.delete(
      `/daraz-products/delete/${requireId(id, "Daraz product ID")}`,
      {
        timeout: LONG_TIMEOUT,
      }
    );
  },

  bulkDelete: (payload = {}) => {
    return api.delete("/daraz-products/bulk-delete", {
      data: payload,
      timeout: LONG_TIMEOUT,
    });
  },
};