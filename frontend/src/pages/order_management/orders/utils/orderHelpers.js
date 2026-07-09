export function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function money(value, currency = "LKR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function niceDate(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: "-", time: "" };

    return {
      date: `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`,
      time: date
        .toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })
        .toLowerCase(),
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

// Buckets for the status tabs. "unpaid" and "pending" (Daraz's own raw
// statuses) are merged into one "To Pack" bucket — they were split into
// separate "New"/"To Pack" tabs before, but that distinction wasn't
// meaningful in practice (same eligible action, same UI), so it's one tab
// now. "packed" is a status this app writes locally after a successful Pack
// action (see daraz_order_action_controller's runPack) — it's the
// "To Arrange Shipment" bucket, i.e. packed but not yet RTS-confirmed.
// These mirror canDarazPack/canDarazReady below so the tab an order sits in
// always matches which bulk action it's eligible for.
const STATUS_BUCKETS = {
  to_pack: (order) =>
    ["unpaid", "pending", "new"].includes(normalize(order.order_status)) && !order.waybill_id,
  to_arrange_shipment: (order) => normalize(order.order_status) === "packed",
  ready_to_ship: (order) => normalize(order.order_status) === "ready_to_ship",
  shipped: (order) => ["shipped", "dispatched"].includes(normalize(order.order_status)),
  delivered: (order) => normalize(order.order_status) === "delivered",
  cancelled: (order) => ["cancelled", "canceled", "failed"].includes(normalize(order.order_status)),
  returned: (order) => ["returned", "shipped_back_success"].includes(normalize(order.order_status)),
};

const STATUS_LABELS = {
  to_pack: "To Pack",
  to_arrange_shipment: "To Arrange Shipment",
  ready_to_ship: "Ready To Ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

const STATUS_COLOR_CLASS = {
  to_pack: "text-amber-400",
  to_arrange_shipment: "text-amber-400",
  ready_to_ship: "text-sky-400",
  shipped: "text-sky-400",
  delivered: "text-emerald-400",
  cancelled: "text-red-400",
  returned: "text-red-400",
};

// The row's status column shows this bucket label ("To Arrange Shipment"),
// not the raw internal order_status value ("packed") — the two only line up
// by coincidence for a couple of statuses, so this must stay in sync with
// STATUS_BUCKETS above rather than re-deriving from the raw string.
export function statusBucketKey(order) {
  return Object.keys(STATUS_BUCKETS).find((key) => STATUS_BUCKETS[key](order)) || null;
}

export function statusLabel(order) {
  const key = statusBucketKey(order);
  return key ? STATUS_LABELS[key] : order?.order_status || "-";
}

export function statusBadgeClass(order) {
  const key = statusBucketKey(order);
  return key ? STATUS_COLOR_CLASS[key] : "text-slate-400";
}

// Single contextual "what's next" step for a Daraz order — replaces
// showing Pack/Ready-To-Ship as two separately-gated buttons with one
// button whose label/action tracks the order's current bucket. Daraz has
// no seller-triggered API for the step after Ready To Ship (the courier's
// own pickup scan is what flips it to Shipped on Daraz's side), so
// "Handover" only updates our own local order_status — it does not call
// Daraz at all.
export function nextDarazStep(order) {
  if (normalize(order.source) !== "daraz") return null;

  const key = statusBucketKey(order);
  if (key === "to_pack") return { kind: "action", action: "pack", label: "Pack" };
  if (key === "to_arrange_shipment") return { kind: "action", action: "ready_to_ship", label: "Ready To Ship" };
  if (key === "ready_to_ship") return { kind: "status", status: "shipped", label: "Handover" };
  return null;
}

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
