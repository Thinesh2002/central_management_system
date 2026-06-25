export const PAGE_SIZES = [25, 50, 100, 200];

export const STATUS_TABS = [
  { key: "", countKey: "all", label: "All" },
  { key: "pending", countKey: "pending", label: "Pending" },
  { key: "packed", countKey: "packed", label: "Packed" },
  { key: "ready_to_ship", countKey: "ready_to_ship", label: "Ready To Ship" },
  { key: "shipped", countKey: "shipped", label: "Shipped" },
  { key: "delivered", countKey: "delivered", label: "Delivered" },
  { key: "canceled", countKey: "canceled", label: "Cancelled" },
];

export const EMPTY_TAB_COUNTS = {
  all: 0,
  pending: 0,
  packed: 0,
  ready_to_ship: 0,
  shipped: 0,
  delivered: 0,
  canceled: 0,
};

export const EMPTY_FILTERS = {
  search: "",
  sku: "",
  order_id: "",
  status: "",
  date_from: "",
  date_to: "",
  page: 1,
  limit: 25,
};
