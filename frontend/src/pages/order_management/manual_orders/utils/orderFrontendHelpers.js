export const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Packed",
  "Ready To Ship",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
  "Failed",
];

export const ORDER_STATUS_TABS = [
  { key: "", label: "All", countKey: "total_orders" },
  { key: "Pending", label: "Pending", countKey: "pending_orders" },
  { key: "Processing", label: "Processing", countKey: "processing_orders" },
  { key: "Packed", label: "Packed", countKey: "packed_orders" },
  { key: "Ready To Ship", label: "Ready To Ship", countKey: "ready_to_ship_orders" },
  { key: "Shipped", label: "Shipped", countKey: "shipped_orders" },
  { key: "Delivered", label: "Delivered", countKey: "delivered_orders" },
  { key: "Cancelled", label: "Cancelled", countKey: "cancelled_orders" },
  { key: "Returned", label: "Returned", countKey: "returned_orders" },
  { key: "Failed", label: "Failed", countKey: "failed_orders" },
];

export const ORDER_TYPES = ["MANUAL", "CUSTOM"];
export const PAYMENT_METHODS = ["COD", "CARD"];
export const PAGE_SIZES = [25, 50, 100, 200];

export function unwrapApiResponse(response) {
  const body = response?.data ?? response;

  return {
    success: body?.success,
    message: body?.message,
    data: body?.data ?? body,
    pagination: body?.pagination ?? null,
  };
}

export function normalizeListResponse(response) {
  const unwrapped = unwrapApiResponse(response);
  const value = unwrapped.data;

  if (Array.isArray(value)) {
    return {
      data: value,
      pagination: unwrapped.pagination,
      message: unwrapped.message,
    };
  }

  if (Array.isArray(value?.data)) {
    return {
      data: value.data,
      pagination: value.pagination ?? unwrapped.pagination,
      message: unwrapped.message,
    };
  }

  if (Array.isArray(value?.rows)) {
    return {
      data: value.rows,
      pagination: value.pagination ?? unwrapped.pagination,
      message: unwrapped.message,
    };
  }

  if (Array.isArray(value?.products)) {
    return {
      data: value.products,
      pagination: value.pagination ?? unwrapped.pagination,
      message: unwrapped.message,
    };
  }

  if (Array.isArray(value?.items)) {
    return {
      data: value.items,
      pagination: value.pagination ?? unwrapped.pagination,
      message: unwrapped.message,
    };
  }

  return {
    data: [],
    pagination: unwrapped.pagination,
    message: unwrapped.message,
  };
}

export function normalizeError(error, fallback = "Something went wrong") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export function money(value) {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return "0.00";
  return numberValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function moneyNumber(value) {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Number(numberValue.toFixed(2));
}

export function dateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString();
}

export function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function imageFromProduct(product = {}) {
  if (!product) return "";

  const direct =
    product.image_url ||
    product.image ||
    product.main_image ||
    product.main_image_url ||
    product.product_image ||
    product.product_image_url ||
    product.thumbnail ||
    product.thumbnail_url ||
    product.imageUrl;

  if (direct) return direct;

  const imageList = product.images || product.product_images || product.image_urls;
  if (Array.isArray(imageList) && imageList.length) {
    const first = imageList[0];
    if (typeof first === "string") return first;
    return first?.image_url || first?.url || first?.src || "";
  }

  return "";
}

export function skuFromProduct(product = {}) {
  return (
    product.sku ||
    product.SKU ||
    product.product_sku ||
    product.local_sku ||
    product.child_sku ||
    product.parent_sku ||
    product.model_sku ||
    ""
  );
}

export function titleFromProduct(product = {}) {
  return (
    product.product_name ||
    product.name ||
    product.title ||
    product.product_title ||
    product.item_name ||
    product.model_name ||
    skuFromProduct(product) ||
    "Unnamed Product"
  );
}

export function priceFromProduct(product = {}) {
  return moneyNumber(
    product.product_price ??
      product.sale_price ??
      product.selling_price ??
      product.price ??
      product.unit_price ??
      product.regular_price ??
      0
  );
}

export function normalizeProductForOrder(product = {}) {
  const quantity = 1;
  const unitPrice = priceFromProduct(product);

  return {
    temp_id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sku: skuFromProduct(product),
    product_name: titleFromProduct(product),
    description: product.description || product.short_description || "",
    image_url: imageFromProduct(product),
    quantity,
    unit_price: unitPrice,
    item_total: moneyNumber(quantity * unitPrice),
    item_status: "Active",
  };
}

export function recalcItem(item = {}) {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const unitPrice = moneyNumber(item.unit_price);
  return {
    ...item,
    quantity,
    unit_price: unitPrice,
    item_total: moneyNumber(quantity * unitPrice),
  };
}

export function emptyOrderForm() {
  return {
    order_type: "MANUAL",
    customer_code: "",
    customer_name: "",
    customer_phone: "",
    customer_phone_2: "",
    customer_address: "",
    customer_city: "",
    customer_district: "",
    customer_province: "",
    payment_method: "COD",
    order_status: "Pending",
    order_date: "",
    due_date: "",
    note: "",
    discount: 0,
    shipping_cost_actual: 450,
    shipping_cost_paid_by_buyer: 0,
    paid_amount: 0,
    tracking_number: "",
    items: [],
  };
}

export function buildOrderPayload(form = {}) {
  const items = (form.items || [])
    .filter((item) => !item._deleted)
    .map((item) => recalcItem(item))
    .map((item) => ({
      sku: item.sku || null,
      product_name: item.product_name || "Manual Item",
      description: item.description || null,
      image_url: item.image_url || null,
      quantity: Number(item.quantity || 1),
      unit_price: moneyNumber(item.unit_price),
      item_total: moneyNumber(item.item_total),
      item_status: item.item_status || "Active",
    }));

  return {
    order_type: form.order_type || "MANUAL",
    customer_code: form.customer_code || null,
    customer_name: form.customer_name,
    customer_phone: form.customer_phone,
    customer_phone_2: form.customer_phone_2 || null,
    customer_address: form.customer_address,
    customer_city: form.customer_city || null,
    customer_district: form.customer_district || null,
    customer_province: form.customer_province || null,
    payment_method: form.payment_method || "COD",
    order_status: form.order_status || "Pending",
    order_date: form.order_date || null,
    due_date: form.due_date || null,
    note: form.note || null,
    discount: moneyNumber(form.discount),
    shipping_cost_actual: moneyNumber(form.shipping_cost_actual || 450),
    shipping_cost_paid_by_buyer: moneyNumber(form.shipping_cost_paid_by_buyer),
    paid_amount: moneyNumber(form.paid_amount),
    tracking_number: form.tracking_number || null,
    items,
  };
}

export function buildOrderUpdatePayload(form = {}) {
  const payload = buildOrderPayload(form);
  delete payload.items;
  return payload;
}

export function calculateLocalTotals(form = {}) {
  const itemTotal = (form.items || [])
    .filter((item) => !item._deleted && item.item_status !== "Deleted")
    .reduce((total, item) => total + moneyNumber(recalcItem(item).item_total), 0);

  const discount = moneyNumber(form.discount);
  const subtotal = Math.max(0, moneyNumber(itemTotal - discount));
  const shippingPaid = moneyNumber(form.shipping_cost_paid_by_buyer);
  const orderTotal = moneyNumber(subtotal + shippingPaid);

  return {
    item_total: moneyNumber(itemTotal),
    discount,
    subtotal,
    shipping_cost_paid_by_buyer: shippingPaid,
    order_total: orderTotal,
  };
}
