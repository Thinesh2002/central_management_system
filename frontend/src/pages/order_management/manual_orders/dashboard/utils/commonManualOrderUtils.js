import { unwrapApiResponse } from "./orderFrontendHelpers";

export function unwrap(response) {
  try {
    return unwrapApiResponse(response);
  } catch {
    return response?.data ?? response;
  }
}

export function isEmpty(value) {
  const cleanValue = String(value ?? "").trim();

  return (
    value === undefined ||
    value === null ||
    cleanValue === "" ||
    cleanValue === "null" ||
    cleanValue === "undefined" ||
    cleanValue === "[object Object]"
  );
}

export function pick(...values) {
  return values.find((value) => !isEmpty(value)) || "";
}

export function keyValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeList(response) {
  const data = unwrap(response);
  const value = data?.data ?? data;

  const keys = [
    "orders",
    "rows",
    "records",
    "list",
    "items",
    "products",
    "images",
    "data",
  ];

  if (Array.isArray(value)) return value;

  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data?.[key])) return value.data[key];
  }

  if (value && typeof value === "object" && (value.order_id || value.id)) {
    return [value];
  }

  return [];
}

export function getPagination(response, filters, rowCount) {
  const data = unwrap(response);

  const meta =
    data?.pagination ||
    data?.meta ||
    data?.data?.pagination ||
    data?.data?.meta ||
    {};

  const page = Number(meta.page || meta.current_page || filters.page || 1);
  const limit = Number(meta.limit || meta.per_page || filters.limit || 25);

  const total = Number(
    meta.total ||
      meta.count ||
      data?.total ||
      data?.data?.total ||
      rowCount ||
      0
  );

  return {
    page,
    limit,
    total,
    total_pages: Number(
      meta.total_pages || meta.last_page || Math.ceil(total / limit) || 1
    ),
  };
}

export function buildParams(filters) {
  const params = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (!isEmpty(value)) params[key] = value;
  });

  params.page = Number(filters.page || 1);
  params.limit = Number(filters.limit || 25);

  return params;
}
