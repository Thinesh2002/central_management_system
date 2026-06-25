export function valueOf(obj, keys, fallback = "-") {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

export function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function isTimeoutError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(
    error?.friendlyMessage ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      ""
  ).toLowerCase();

  return code === "ECONNABORTED" || code === "ETIMEDOUT" || message.includes("timeout") || message.includes("exceeded");
}

export function extractList(payload, listKeys = []) {
  const queue = [payload];
  const seen = new Set();

  while (queue.length) {
    const node = queue.shift();
    if (!node || seen.has(node)) continue;
    if (Array.isArray(node)) return node;
    if (typeof node !== "object") continue;

    seen.add(node);

    for (const key of listKeys) {
      if (Array.isArray(node[key])) return node[key];
    }

    for (const key of ["data", "result", "body", "payload", "response"]) {
      if (node[key] && typeof node[key] === "object") queue.push(node[key]);
    }
  }

  return [];
}

export function normalizeStatusKey(status) {
  const normal = String(status || "").toLowerCase().replace(/[\s-]+/g, "_");

  if (normal.includes("cancel")) return "canceled";
  if (normal.includes("deliver") || normal.includes("complete")) return "delivered";
  if (normal.includes("ready_to_ship") || normal.includes("readytoship") || (normal.includes("ready") && normal.includes("ship")) || normal === "rts") return "ready_to_ship";
  if (normal.includes("pack") || normal.includes("process") || normal.includes("progress")) return "packed";
  if (normal.includes("ship") || normal.includes("dispatch")) return "shipped";

  return "pending";
}

function normalizeCountObject(rawCounts, fallbackTotal = 0) {
  if (!rawCounts || typeof rawCounts !== "object") return null;

  return {
    all: numberValue(rawCounts.all ?? rawCounts.total ?? rawCounts.all_orders ?? rawCounts.orders, fallbackTotal),
    pending: numberValue(rawCounts.pending ?? rawCounts.new ?? rawCounts.unpaid, 0),
    packed: numberValue(rawCounts.packed ?? rawCounts.pack ?? rawCounts.package ?? rawCounts.processing ?? rawCounts.in_progress, 0),
    ready_to_ship: numberValue(rawCounts.ready_to_ship ?? rawCounts.readyToShip ?? rawCounts.readytoship ?? rawCounts.rts ?? rawCounts.ready, 0),
    shipped: numberValue(rawCounts.shipped ?? rawCounts.dispatch ?? rawCounts.dispatched, 0),
    delivered: numberValue(rawCounts.delivered ?? rawCounts.completed, 0),
    canceled: numberValue(rawCounts.canceled ?? rawCounts.cancelled ?? rawCounts.cancel, 0),
  };
}

function extractStatusCounts(root, body, pagination, total) {
  const rawCounts =
    root?.status_counts ||
    root?.statusCounts ||
    root?.counts ||
    root?.summary?.status_counts ||
    root?.summary?.statusCounts ||
    body?.status_counts ||
    body?.statusCounts ||
    body?.counts ||
    body?.summary?.status_counts ||
    body?.summary?.statusCounts ||
    pagination?.status_counts ||
    pagination?.statusCounts ||
    pagination?.counts;

  return normalizeCountObject(rawCounts, total);
}

export function normalizeOrders(payload) {
  const root = payload || {};
  const body = root.data ?? root.result ?? root;
  const orders = extractList(root, ["orders", "rows", "records", "order_rows", "items"]);
  const pagination = body?.pagination || body?.meta || root?.pagination || root?.meta || {};
  const total = Number(root?.total || body?.total || pagination?.total || orders?.length || 0);

  return {
    orders: asArray(orders),
    total,
    page: Number(root?.page || body?.page || pagination?.page || 1),
    limit: Number(root?.limit || body?.limit || pagination?.limit || 25),
    statusCounts: extractStatusCounts(root, body, pagination, total),
  };
}

export function normalizeAccounts(payload) {
  const accounts = extractList(payload || {}, ["accounts", "rows", "items"]);

  return asArray(accounts)
    .map((account) => {
      const code = String(valueOf(account, ["account_code", "accountCode", "code", "store_code"], "")).trim();
      const name = String(valueOf(account, ["account_name", "accountName", "store_name", "shop_name", "seller_name", "name"], code)).trim();
      const platform = String(valueOf(account, ["platform_code", "platformCode", "platform_name", "platform", "marketplace"], "")).toLowerCase();

      return {
        id: valueOf(account, ["id", "account_id", "accountId"], code),
        code,
        name: name || code,
        platform,
        status: valueOf(account, ["status", "active_status"], ""),
        connection_status: valueOf(account, ["connection_status", "connectionStatus"], ""),
        raw: account,
      };
    })
    .filter((account) => account.code && (!account.platform || account.platform.includes("daraz")));
}

export function currencySymbol(currency = "LKR") {
  const key = String(currency || "LKR").toUpperCase();
  if (key === "GBP") return "£";
  if (key === "USD") return "$";
  if (key === "EUR") return "€";
  if (key === "LKR") return "Rs.";
  return key;
}

export function money(value, currency = "LKR") {
  const number = Number(value || 0);
  return `${currencySymbol(currency)} ${number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "-";

  const raw = String(value).trim();
  const date = /^\d{13,}$/.test(raw)
    ? new Date(Number(raw))
    : /^\d{10}$/.test(raw)
      ? new Date(Number(raw) * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getOrderRouteId(order) {
  return valueOf(order, ["id", "order_db_id", "db_id", "local_order_id", "order_pk_id"], "");
}

export function getOrderNumber(order) {
  return valueOf(order, ["daraz_order_id", "darazOrderId", "order_number", "orderNumber", "daraz_order_number", "darazOrderNumber", "OrderId", "order_id"], "-");
}

export function getCreatedDate(order) {
  return valueOf(order, ["order_created_at", "created_at", "created_time", "create_time", "order_date"], "");
}

export function getAccountCode(order) {
  return valueOf(order, ["account_code", "accountCode", "store_code"], "");
}

export function getAccountName(order, accountsByCode) {
  const directName = valueOf(order, ["account_name", "store_name", "shop_name", "seller_name", "accountName", "storeName"], "");
  if (directName) return directName;
  const code = getAccountCode(order);
  return accountsByCode?.[code]?.name || code || "-";
}

export function getCustomerName(order) {
  return valueOf(order, ["customer_full_name", "customer_name", "shipping_name", "buyer_name"], "-");
}

export function getCustomerPhone(order) {
  return valueOf(order, ["customer_phone", "shipping_phone", "phone", "buyer_phone"], "-");
}

export function getShippingCity(order) {
  return valueOf(order, ["shipping_city", "city", "town"], "-");
}

export function getShippingMethod(order) {
  return valueOf(order, ["shipping_type", "delivery_type", "shipping_method", "delivery_method", "shipment_type"], "Standard");
}

export function getTrackingNumber(order) {
  return valueOf(order, ["tracking_number", "TrackingCode", "tracking_code", "awb_number"], "-");
}

export function getShippingProvider(order) {
  return valueOf(order, ["shipment_provider", "shipping_provider", "delivery_provider"], "-");
}

export function getOrderStatus(order) {
  return valueOf(order, ["local_status", "daraz_status", "status", "order_status"], "pending");
}

export function getOrderCurrency(order) {
  return valueOf(order, ["currency", "Currency"], "LKR");
}

export function getOrderTotal(order) {
  return valueOf(order, ["total_amount", "order_total", "total", "paid_price", "order_amount", "grand_total"], 0);
}

function parsePossibleArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-" || trimmed === "null") return [];
    try {
      return parsePossibleArray(JSON.parse(trimmed));
    } catch (_) {
      return [];
    }
  }

  if (typeof value === "object") {
    for (const key of ["data", "rows", "items", "order_items", "line_items", "products"]) {
      const parsed = parsePossibleArray(value?.[key]);
      if (parsed.length > 0) return parsed;
    }
  }

  return [];
}

function splitListValue(value, { looseComma = true } = {}) {
  if (value === undefined || value === null || value === "" || value === "-") return [];
  if (Array.isArray(value)) return value.flatMap((entry) => splitListValue(entry, { looseComma })).filter(Boolean);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "object") return [value];

  const raw = String(value).trim();
  if (!raw || raw === "-" || raw.toLowerCase() === "null") return [];

  try {
    const parsed = JSON.parse(raw);
    const arr = parsePossibleArray(parsed);
    if (arr.length > 0) return arr;
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}

  for (const sep of ["|||", "||", "\n", "\r\n", "\t|\t", " | ", " ; "]) {
    if (raw.includes(sep)) return raw.split(sep).map((part) => part.trim()).filter(Boolean);
  }

  if (looseComma && raw.includes(",")) return raw.split(",").map((part) => part.trim()).filter(Boolean);
  return [raw];
}

function firstList(order, keys, options) {
  for (const key of keys) {
    const arr = splitListValue(order?.[key], options);
    if (arr.length > 0) return arr;
  }
  return [];
}

function firstNumber(order, keys, fallback = 0) {
  for (const key of keys) {
    const number = Number(order?.[key]);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return fallback;
}

function getDeclaredLineCount(order, parsedItemLength = 0) {
  const count = firstNumber(order, ["items_count", "item_count", "item_rows_count", "order_items_count", "line_items_count", "products_count", "sku_count", "skus_count", "total_items", "total_products"], 0);
  const multiFlag = order?.is_multi_line === true || order?.is_multiline === true || order?.multi_line === true || order?.multiline === true || String(order?.line_type || order?.order_type || "").toLowerCase().includes("multi");
  return multiFlag && count <= 1 ? Math.max(parsedItemLength, 2) : Math.max(count, parsedItemLength);
}

function buildItemsFromParallelFields(order) {
  const skus = firstList(order, ["seller_skus", "seller_sku_list", "shop_skus", "shop_sku_list", "skus", "sku_list", "sku_codes"]);
  const titles = firstList(order, ["product_names", "product_name_list", "item_names", "item_name_list", "product_titles", "title_list", "titles", "names"], { looseComma: false });
  const images = firstList(order, ["product_images", "product_image_list", "main_images", "image_urls", "images", "item_images"]);
  const itemIds = firstList(order, ["daraz_item_ids", "item_ids", "product_ids", "daraz_ids", "product_id_list", "item_id_list"]);
  const quantities = firstList(order, ["quantities", "quantity_list", "qtys", "qty_list", "item_quantities"]);
  const prices = firstList(order, ["item_prices", "paid_prices", "prices", "price_list", "unit_prices"]);
  const variations = firstList(order, ["variations", "variation_list", "variation_names", "variation_values", "colors", "colours"]);
  const maxLength = Math.max(skus.length, titles.length, images.length, itemIds.length, quantities.length, prices.length, variations.length);

  if (maxLength <= 1) return [];

  return Array.from({ length: maxLength }).map((_, index) => ({
    id: `parallel-${index}`,
    seller_sku: skus[index] || "",
    product_name: titles[index] || "",
    image_url: images[index] || "",
    daraz_item_id: itemIds[index] || "",
    quantity: quantities[index] || 1,
    paid_price: prices[index] || "",
    variation: variations[index] || "",
  }));
}

function getItemRows(order) {
  const possibleValues = [order?.order_items, order?.orderItems, order?.order_item_rows, order?.orderItemRows, order?.order_lines, order?.orderLines, order?.line_items, order?.lineItems, order?.products, order?.order_items_json, order?.items_json, order?.line_items_json, order?.products_json];

  for (const value of possibleValues) {
    const parsed = parsePossibleArray(value);
    if (parsed.length > 0) return parsed;
  }

  const parsedItems = parsePossibleArray(order?.items);
  if (parsedItems.length > 0) {
    const looksLikeOrderRows = parsedItems.some((item) => item?.daraz_order_id || item?.order_number || item?.customer_name || item?.customer_full_name);
    if (!looksLikeOrderRows) return parsedItems;
  }

  const built = buildItemsFromParallelFields(order);
  return built.length > 0 ? built : [order];
}

function getItemSku(item, order = {}) {
  return valueOf(item, ["sku", "seller_sku", "SellerSku", "shop_sku", "ShopSku", "variation_sku", "sku_code"], valueOf(order, ["sku", "seller_sku", "SellerSku", "shop_sku", "ShopSku", "variation_sku"], ""));
}

export function getItemTitle(item, order = {}) {
  return valueOf(item, ["product_name", "item_name", "title", "name", "ProductName", "first_product_name"], valueOf(order, ["first_product_name", "product_name", "item_name", "title", "name"], "-"));
}

function getItemImage(item, order = {}) {
  return valueOf(item, ["main_image", "product_main_image", "image", "image_url", "ProductMainImage", "product_image", "item_image", "Image"], valueOf(order, ["main_image", "product_main_image", "image", "image_url", "ProductMainImage", "product_image", "item_image"], ""));
}

function getItemDarazId(item, order = {}) {
  return valueOf(item, ["daraz_item_id", "order_item_id", "item_id", "product_id", "ProductId", "productId", "itemId", "daraz_id"], valueOf(order, ["daraz_item_id", "item_id", "product_id", "ProductId"], ""));
}

function getItemQty(item) {
  return Math.max(1, numberValue(valueOf(item, ["quantity", "qty", "item_quantity", "Quantity", "order_quantity"], 1), 1));
}

function getItemPrice(item, order = {}) {
  return valueOf(item, ["paid_price", "item_price", "unit_price", "price", "total_price", "amount"], valueOf(order, ["paid_price", "item_price", "unit_price", "price"], 0));
}

function normalizeItem(item, order, lineIndex) {
  return {
    raw: item,
    lineIndex,
    rowId: valueOf(item, ["id", "order_item_id", "item_row_id", "line_id"], ""),
    sku: getItemSku(item, order),
    title: getItemTitle(item, order),
    image: getItemImage(item, order),
    darazId: getItemDarazId(item, order),
    quantity: getItemQty(item),
    price: getItemPrice(item, order),
    variation: valueOf(item, ["variation", "variation_name", "variation_value", "color", "colour"], ""),
  };
}

function mergeOrderHeader(previous, next) {
  const merged = { ...previous };

  Object.entries(next || {}).forEach(([key, value]) => {
    if (key.startsWith("_")) return;
    if (merged[key] === undefined || merged[key] === null || merged[key] === "" || merged[key] === "-") merged[key] = value;
  });

  return merged;
}

export function buildGroupedOrders(rawOrders = []) {
  const map = new Map();

  rawOrders.forEach((order, orderIndex) => {
    const orderNumber = String(getOrderNumber(order) || `order-${orderIndex}`);
    const accountCode = getAccountCode(order);
    const groupKey = `${accountCode || "account"}|${orderNumber}`;

    if (!map.has(groupKey)) {
      map.set(groupKey, { ...order, _group_key: groupKey, _order_number: orderNumber, _route_id: getOrderRouteId(order), _items: [] });
    } else {
      const existing = map.get(groupKey);
      map.set(groupKey, { ...mergeOrderHeader(existing, order), _group_key: existing._group_key, _order_number: existing._order_number, _route_id: existing._route_id || getOrderRouteId(order), _items: existing._items });
    }

    const group = map.get(groupKey);
    getItemRows(order).forEach((item, itemIndex) => group._items.push(normalizeItem(item, order, `${orderIndex}-${itemIndex}`)));
  });

  return Array.from(map.values()).map((order) => {
    const items = order._items || [];
    const declaredLineCount = getDeclaredLineCount(order, items.length);
    const totalQuantity = items.reduce((sum, item) => sum + numberValue(item.quantity, 1), 0);
    const declaredQty = firstNumber(order, ["total_quantity", "total_qty", "quantity_total", "qty_total", "item_quantity_total"], 0);
    const finalQty = Math.max(totalQuantity, declaredQty, items.length > 0 ? 1 : 0);

    return {
      ...order,
      _items: items,
      _items_count: Math.max(items.length, declaredLineCount),
      _line_count: Math.max(items.length, declaredLineCount),
      _total_quantity: finalQty,
      _is_multiline: Math.max(items.length, declaredLineCount) > 1 || finalQty > 1,
      _missing_item_details: declaredLineCount > items.length,
    };
  });
}

export function buildOrderParams(filters, accountCodes = []) {
  const sku = String(filters.sku || "").trim();
  const orderId = String(filters.order_id || filters.id || "").trim();
  const search = String(filters.search || sku || orderId || "").trim();
  const cleanAccountCodes = accountCodes.filter(Boolean);

  return {
    q: search,
    search,
    sku,
    seller_sku: sku,
    order_id: orderId,
    daraz_order_id: orderId,
    id: orderId,
    account_code: cleanAccountCodes.length === 1 ? cleanAccountCodes[0] : "",
    account_codes: cleanAccountCodes.length > 1 ? cleanAccountCodes.join(",") : "",
    status: filters.status,
    date_from: filters.date_from,
    date_to: filters.date_to,
    page: filters.page,
    limit: filters.limit,
  };
}
