export function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function money(value, currency = "LKR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function niceDate(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return {
      date: date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
      time: date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: "-", time: "" };
  }
}

export function orderSearchText(order = {}) {
  return [
    order.order_no,
    order.display_order_no,
    order.account_name,
    order.customer_name,
    order.shipping_name,
    order.customer_phone,
    order.shipping_phone,
    order.customer_email,
    order.waybill_id,
    order.tracking_number,
    order.first_item_title,
    ...(order.items || []).map((item) => item.sku || item.local_sku),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function orderKey(order = {}) {
  return `${order.source}:${order.source_order_id}`;
}

export function statusBadgeClass(status) {
  const s = normalize(status);
  if (["delivered", "completed", "success"].includes(s)) {
    return "text-emerald-400";
  }
  if (["cancelled", "canceled", "returned", "shipped_back_success", "failed"].includes(s)) {
    return "text-red-400";
  }
  if (["shipped", "ready_to_ship", "packed"].includes(s)) {
    return "text-sky-400";
  }
  return "text-amber-400";
}

export function sourceMeta(source) {
  const s = normalize(source);

  if (s === "daraz") return { label: "Daraz", className: "text-orange-400" };
  if (s === "woo") return { label: "WooCommerce", className: "text-violet-400" };
  if (s === "local") return { label: "Manual", className: "text-emerald-400" };

  return { label: source || "-", className: "text-slate-400" };
}

// Daraz-only status-gated actions — a package can't be packed twice, can't
// be shipped before it's packed, and a finished/cancelled order has nothing
// left to print an AWB for.
export function canDarazPack(order) {
  if (normalize(order.source) !== "daraz") return false;
  const s = normalize(order.order_status);
  return ["pending", "unpaid", "new"].includes(s) && !order.waybill_id;
}

export function canDarazReady(order) {
  if (normalize(order.source) !== "daraz") return false;
  return Boolean(order.waybill_id) && normalize(order.order_status) !== "ready_to_ship";
}

export function canDarazPrintAwb(order) {
  if (normalize(order.source) !== "daraz") return false;
  const s = normalize(order.order_status);
  if (["cancelled", "canceled", "delivered", "returned", "shipped_back_success"].includes(s)) return false;
  return Boolean(order.waybill_id);
}

// Buckets for the status tabs. "unpaid" (New) and "pending"-without-a-waybill
// (To Pack) are both Daraz's own raw statuses; "packed" is a status this app
// writes locally after a successful Pack action (see daraz_order_action_
// controller's runPack) — it's the "To Arrange Shipment" bucket, i.e.
// packed but not yet RTS-confirmed. These mirror canDarazPack/canDarazReady
// below so the tab an order sits in always matches which bulk action it's
// eligible for.
const STATUS_BUCKETS = {
  new: (order) => normalize(order.order_status) === "unpaid",
  to_pack: (order) =>
    ["pending", "new"].includes(normalize(order.order_status)) && !order.waybill_id,
  to_arrange_shipment: (order) => normalize(order.order_status) === "packed",
  ready_to_ship: (order) => normalize(order.order_status) === "ready_to_ship",
  shipped: (order) => ["shipped", "dispatched"].includes(normalize(order.order_status)),
  delivered: (order) => normalize(order.order_status) === "delivered",
  cancelled: (order) => ["cancelled", "canceled", "failed"].includes(normalize(order.order_status)),
  returned: (order) => ["returned", "shipped_back_success"].includes(normalize(order.order_status)),
};

export function matchesStatus(order, status) {
  if (status === "all") return true;
  const bucket = STATUS_BUCKETS[status];
  return bucket ? bucket(order) : normalize(order.order_status) === status;
}

export function countByStatus(orders = []) {
  const map = { all: orders.length };

  Object.keys(STATUS_BUCKETS).forEach((key) => {
    map[key] = orders.filter((order) => matchesStatus(order, key)).length;
  });

  return map;
}

export function fullAddress(order = {}) {
  return [
    order.shipping_address_line1,
    order.shipping_address_line2,
    order.shipping_city,
    order.shipping_postal_code,
    order.shipping_country,
  ]
    .filter(Boolean)
    .join(", ");
}
