const crypto = require("crypto");
const orderModel = require("../../../models/daraz/daraz_orders/daraz_order_model");
const { callDarazApi } = require("./daraz_order_api_adapter");

function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function directPick(obj, keys, fallback = null) {
  if (!obj || typeof obj !== "object") return fallback;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && hasValue(obj[key])) {
      return obj[key];
    }
  }

  return fallback;
}

function deepPick(obj, keys, fallback = null, maxDepth = 4) {
  if (!obj || typeof obj !== "object") return fallback;

  const wanted = new Set(keys.map((key) => String(key).toLowerCase()));
  const queue = [{ value: obj, depth: 0 }];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    const value = current.value;

    if (!value || typeof value !== "object") continue;
    if (seen.has(value)) continue;

    seen.add(value);

    for (const [key, childValue] of Object.entries(value)) {
      if (wanted.has(String(key).toLowerCase()) && hasValue(childValue)) {
        return childValue;
      }
    }

    if (current.depth >= maxDepth) continue;

    for (const childValue of Object.values(value)) {
      if (childValue && typeof childValue === "object") {
        queue.push({ value: childValue, depth: current.depth + 1 });
      }
    }
  }

  return fallback;
}

function pick(obj, keys, fallback = null, options = {}) {
  const directValue = directPick(obj, keys, null);
  if (hasValue(directValue)) return directValue;

  if (options.deep === false) return fallback;

  return deepPick(obj, keys, fallback, options.maxDepth || 4);
}

function cleanQuery(query = {}) {
  const cleaned = {};

  Object.entries(query || {}).forEach(([key, value]) => {
    if (!hasValue(value)) return;
    cleaned[key] = value;
  });

  return cleaned;
}

function toNumber(value, fallback = 0) {
  if (!hasValue(value)) return fallback;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const cleaned = String(value).replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : fallback;
}

function toMysqlDateTime(value) {
  if (!hasValue(value)) return null;

  let normalizedValue = value;

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    normalizedValue = Number(value.trim());
  }

  if (typeof normalizedValue === "number") {
    // Daraz sometimes sends unix milliseconds, sometimes unix seconds.
    if (String(Math.trunc(normalizedValue)).length <= 10) {
      normalizedValue *= 1000;
    }
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (number) => String(number).padStart(2, "0");

  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`,
  ].join(" ");
}

function toDarazDateTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const pad = (number) => String(number).padStart(2, "0");

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+0000`;
}

function getDateRange(options = {}) {
  const now = new Date();

  const daysBack = Number(
    options.days_back ||
      options.daysBack ||
      process.env.DARAZ_ORDER_SYNC_DAYS_BACK ||
      7
  );

  const defaultFrom = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const createdAfter =
    toDarazDateTime(
      options.CreatedAfter ||
        options.created_after ||
        options.date_from ||
        defaultFrom
    ) || toDarazDateTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const createdBefore =
    toDarazDateTime(
      options.CreatedBefore ||
        options.created_before ||
        options.date_to ||
        now
    ) || toDarazDateTime(now);

  return {
    createdAfter,
    createdBefore,
  };
}

function unwrapApiResponse(apiResponse) {
  const body = apiResponse?.data || apiResponse?.body || apiResponse || {};
  const data = body.data || body.result || body.Result || body.response || body;

  return { body, data };
}

function firstArrayFromCandidates(candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === "object") {
      const nestedCandidates = [
        candidate.orders,
        candidate.Orders,
        candidate.order_list,
        candidate.orderList,
        candidate.order_items,
        candidate.OrderItems,
        candidate.orderItems,
        candidate.order_item_list,
        candidate.OrderItemList,
        candidate.items,
        candidate.Items,
        candidate.data,
        candidate.Data,
        candidate.result,
        candidate.Result,
      ];

      const nested = firstArrayFromCandidates(nestedCandidates);
      if (nested.length) return nested;
    }
  }

  return [];
}

function extractOrders(apiResponse) {
  const { body, data } = unwrapApiResponse(apiResponse);

  return firstArrayFromCandidates([
    data.orders,
    data.Orders,
    data.order_list,
    data.orderList,
    data.items,
    data.Items,
    data.data,
    body.orders,
    body.Orders,
    body.order_list,
    body.orderList,
  ]);
}

function extractOrderItems(apiResponse) {
  const { body, data } = unwrapApiResponse(apiResponse);

  if (Array.isArray(data)) return data;
  if (Array.isArray(body)) return body;

  return firstArrayFromCandidates([
    data.order_items,
    data.OrderItems,
    data.orderItems,
    data.order_item_list,
    data.OrderItemList,
    data.items,
    data.Items,
    data.data,
    body.order_items,
    body.OrderItems,
    body.orderItems,
    body.order_item_list,
    body.OrderItemList,
    body.items,
    body.Items,
    body.data,
  ]);
}

function extractTrackingEvents(apiResponse) {
  const { body, data } = unwrapApiResponse(apiResponse);

  return firstArrayFromCandidates([
    data.tracking_events,
    data.trackingEvents,
    data.events,
    data.Events,
    data.tracking_detail,
    data.trackingDetails,
    data.tracking_list,
    data.trackingList,
    data.items,
    body.tracking_events,
    body.trackingEvents,
    body.events,
    body.Events,
  ]);
}

function fullNameFromParts(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ") || null;
}

function addressToString(value) {
  if (!hasValue(value)) return null;

  if (typeof value !== "object") {
    return String(value);
  }

  const parts = [
    pick(value, ["address1", "address_1", "line1", "Address1"], null, { deep: false }),
    pick(value, ["address2", "address_2", "line2", "Address2"], null, { deep: false }),
    pick(value, ["address3", "address_3", "line3", "Address3"], null, { deep: false }),
    pick(value, ["address4", "address_4", "line4", "Address4"], null, { deep: false }),
    pick(value, ["address5", "address_5", "line5", "Address5"], null, { deep: false }),
    pick(value, ["ward", "Ward"], null, { deep: false }),
    pick(value, ["city", "City"], null, { deep: false }),
    pick(value, ["region", "province", "Region", "Province"], null, { deep: false }),
    pick(value, ["post_code", "postcode", "zip", "PostCode"], null, { deep: false }),
    pick(value, ["country", "Country"], null, { deep: false }),
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : JSON.stringify(value);
}

function getAddressObject(raw, possibleKeys) {
  const picked = directPick(raw, possibleKeys, null);
  return picked && typeof picked === "object" ? picked : {};
}

function normalizeOrder(raw, account) {
  const shippingAddress = getAddressObject(raw, [
    "address_shipping",
    "AddressShipping",
    "shipping_address",
    "ShippingAddress",
  ]);

  const billingAddress = getAddressObject(raw, [
    "address_billing",
    "AddressBilling",
    "billing_address",
    "BillingAddress",
  ]);

  const orderId = String(
    pick(
      raw,
      [
        "order_id",
        "orderId",
        "OrderId",
        "id",
        "order_number",
        "orderNumber",
      ],
      "",
      { deep: false }
    )
  );

  const customerFirstName =
    pick(raw, ["customer_first_name", "buyer_first_name", "FirstName"], null) ||
    pick(shippingAddress, ["first_name", "firstName", "FirstName"], null, {
      deep: false,
    }) ||
    pick(billingAddress, ["first_name", "firstName", "FirstName"], null, {
      deep: false,
    });

  const customerLastName =
    pick(raw, ["customer_last_name", "buyer_last_name", "LastName"], null) ||
    pick(shippingAddress, ["last_name", "lastName", "LastName"], null, {
      deep: false,
    }) ||
    pick(billingAddress, ["last_name", "lastName", "LastName"], null, {
      deep: false,
    });

  const shippingFirstName = pick(
    shippingAddress,
    ["first_name", "firstName", "FirstName"],
    null,
    { deep: false }
  );
  const shippingLastName = pick(
    shippingAddress,
    ["last_name", "lastName", "LastName"],
    null,
    { deep: false }
  );
  const billingFirstName = pick(
    billingAddress,
    ["first_name", "firstName", "FirstName"],
    null,
    { deep: false }
  );
  const billingLastName = pick(
    billingAddress,
    ["last_name", "lastName", "LastName"],
    null,
    { deep: false }
  );

  const customerFullName =
    pick(raw, ["customer_name", "buyer_name", "CustomerName"], null) ||
    fullNameFromParts(customerFirstName, customerLastName) ||
    fullNameFromParts(shippingFirstName, shippingLastName) ||
    fullNameFromParts(billingFirstName, billingLastName);

  const shippingName =
    pick(raw, ["shipping_name", "recipient_name", "AddressShippingName"], null) ||
    fullNameFromParts(shippingFirstName, shippingLastName) ||
    customerFullName;

  const billingName =
    pick(raw, ["billing_name", "AddressBillingName"], null) ||
    fullNameFromParts(billingFirstName, billingLastName);

  const shippingAddressText =
    addressToString(directPick(raw, ["address_shipping", "shipping_address"], null)) ||
    addressToString(
      pick(raw, ["shipping_address_1", "AddressShippingAddress1"], null)
    ) ||
    addressToString(shippingAddress);

  const billingAddressText =
    addressToString(directPick(raw, ["address_billing", "billing_address"], null)) ||
    addressToString(pick(raw, ["billing_address", "AddressBilling"], null)) ||
    addressToString(billingAddress);

  return {
    account_id: account.id || account.account_id || null,
    account_code: account.account_code,

    order_id: orderId,
    order_number: pick(raw, ["order_number", "orderNumber", "OrderNumber"], orderId),
    daraz_status: pick(
      raw,
      ["status", "order_status", "orderStatus", "Status", "statuses"],
      "unknown"
    ),

    customer_first_name: customerFirstName,
    customer_last_name: customerLastName,
    customer_full_name: customerFullName,
    customer_email: pick(raw, ["customer_email", "buyer_email", "email", "CustomerEmail"], null),
    customer_phone:
      pick(raw, ["customer_phone", "buyer_phone", "phone", "Phone"], null) ||
      pick(shippingAddress, ["phone", "phone1", "mobile", "Phone"], null, {
        deep: false,
      }) ||
      pick(billingAddress, ["phone", "phone1", "mobile", "Phone"], null, {
        deep: false,
      }),

    shipping_name: shippingName,
    shipping_phone:
      pick(raw, ["shipping_phone", "recipient_phone", "AddressShippingPhone"], null) ||
      pick(shippingAddress, ["phone", "phone1", "phone2", "mobile", "Phone"], null, {
        deep: false,
      }),
    shipping_address_1: shippingAddressText,
    shipping_address_2:
      pick(raw, ["address2", "shipping_address_2", "AddressShippingAddress2"], null) ||
      pick(shippingAddress, ["address2", "address_2", "Address2"], null, {
        deep: false,
      }),
    shipping_city:
      pick(raw, ["shipping_city", "city", "AddressShippingCity"], null) ||
      pick(shippingAddress, ["city", "City"], null, { deep: false }),
    shipping_region:
      pick(raw, ["shipping_region", "region", "province", "AddressShippingRegion"], null) ||
      pick(shippingAddress, ["region", "province", "Region", "Province"], null, {
        deep: false,
      }),
    shipping_postcode:
      pick(raw, ["shipping_postcode", "postcode", "zip", "AddressShippingPostCode"], null) ||
      pick(shippingAddress, ["post_code", "postcode", "zip", "PostCode"], null, {
        deep: false,
      }),
    shipping_country:
      pick(raw, ["shipping_country", "country", "AddressShippingCountry"], null) ||
      pick(shippingAddress, ["country", "Country"], "Sri Lanka", { deep: false }),

    billing_name: billingName,
    billing_phone:
      pick(raw, ["billing_phone", "AddressBillingPhone"], null) ||
      pick(billingAddress, ["phone", "phone1", "mobile", "Phone"], null, {
        deep: false,
      }),
    billing_address: billingAddressText,

    payment_method: pick(raw, ["payment_method", "paymentMethod", "PaymentMethod"], null),
    payment_status: pick(raw, ["payment_status", "paymentStatus", "PaymentStatus"], null),

    currency: pick(raw, ["currency", "Currency"], "LKR"),
    items_count: toNumber(
      pick(raw, ["items_count", "item_count", "order_item_count", "OrderItemCount"], 0),
      0
    ),
    total_quantity: toNumber(pick(raw, ["total_quantity", "quantity", "Quantity"], 0), 0),

    subtotal: toNumber(pick(raw, ["subtotal", "price", "Subtotal"], 0), 0),
    shipping_fee: toNumber(pick(raw, ["shipping_fee", "shippingFee", "ShippingFee"], 0), 0),
    voucher_amount: toNumber(pick(raw, ["voucher_amount", "voucher", "Voucher"], 0), 0),
    discount_amount: toNumber(pick(raw, ["discount_amount", "discount", "Discount"], 0), 0),
    tax_amount: toNumber(pick(raw, ["tax_amount", "tax", "TaxAmount"], 0), 0),
    total_amount: toNumber(
      pick(raw, ["total_amount", "price", "order_total", "total", "Price"], 0),
      0
    ),

    order_created_at: toMysqlDateTime(
      pick(raw, ["created_at", "created_time", "order_created_at", "order_create_time", "create_time", "CreatedAt"], null)
    ),
    order_updated_at: toMysqlDateTime(
      pick(raw, ["updated_at", "updated_time", "update_time", "UpdatedAt"], null)
    ),
    paid_at: toMysqlDateTime(pick(raw, ["paid_at", "payment_time", "PaymentTime"], null)),

    package_id: pick(raw, ["package_id", "packageId", "PackageId"], null),
    shipment_provider: pick(
      raw,
      ["shipment_provider", "shipping_provider", "delivery_type", "ShipmentProvider"],
      null
    ),
    shipment_type: pick(raw, ["shipment_type", "shipping_type", "ShipmentType"], null),
    tracking_number: pick(
      raw,
      [
        "tracking_number",
        "trackingNumber",
        "tracking_code",
        "trackingCode",
        "awb_number",
        "awbNumber",
        "TrackingCode",
      ],
      null
    ),

    raw_order_json: raw,
  };
}

function firstItemValue(rawItems, keys, fallback = null) {
  for (const rawItem of rawItems) {
    const value = pick(rawItem, keys, null);
    if (hasValue(value)) return value;
  }

  return fallback;
}

function sumItemValues(rawItems, keys) {
  return rawItems.reduce((total, rawItem) => {
    const value = pick(rawItem, keys, 0);
    return total + toNumber(value, 0);
  }, 0);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (hasValue(value)) return value;
  }

  return null;
}

function mergeNonEmpty(base, patch) {
  const merged = { ...base };

  Object.entries(patch || {}).forEach(([key, value]) => {
    if (hasValue(value)) {
      merged[key] = value;
    }
  });

  return merged;
}

function mergeOrderWithItemDetails(order, rawItems = []) {
  if (!rawItems.length) return order;

  const quantityTotal = rawItems.reduce((total, rawItem) => {
    return total + (toNumber(pick(rawItem, ["quantity", "qty", "Quantity"], 1), 1) || 1);
  }, 0);

  const paidTotal = sumItemValues(rawItems, ["paid_price", "paidPrice", "PaidPrice"]);
  const priceTotal = sumItemValues(rawItems, ["item_price", "unit_price", "price", "ItemPrice"]);
  const shippingTotal = sumItemValues(rawItems, ["shipping_fee", "shippingFee", "ShippingFee"]);
  const voucherTotal = sumItemValues(rawItems, ["voucher_amount", "voucher", "VoucherAmount"]);
  const taxTotal = sumItemValues(rawItems, ["tax_amount", "tax", "TaxAmount"]);

  const customerFirstName = firstItemValue(rawItems, [
    "customer_first_name",
    "buyer_first_name",
    "first_name",
    "FirstName",
  ]);
  const customerLastName = firstItemValue(rawItems, [
    "customer_last_name",
    "buyer_last_name",
    "last_name",
    "LastName",
  ]);
  const customerFullName =
    firstItemValue(rawItems, ["customer_name", "buyer_name", "CustomerName"]) ||
    fullNameFromParts(customerFirstName, customerLastName);

  const shippingFirstName = firstItemValue(rawItems, [
    "shipping_first_name",
    "recipient_first_name",
    "first_name",
    "FirstName",
  ]);
  const shippingLastName = firstItemValue(rawItems, [
    "shipping_last_name",
    "recipient_last_name",
    "last_name",
    "LastName",
  ]);

  const itemPatch = {
    customer_first_name: firstNonEmpty(order.customer_first_name, customerFirstName),
    customer_last_name: firstNonEmpty(order.customer_last_name, customerLastName),
    customer_full_name: firstNonEmpty(order.customer_full_name, customerFullName),
    customer_email: firstNonEmpty(
      order.customer_email,
      firstItemValue(rawItems, ["customer_email", "buyer_email", "email", "CustomerEmail"])
    ),
    customer_phone: firstNonEmpty(
      order.customer_phone,
      firstItemValue(rawItems, [
        "customer_phone",
        "buyer_phone",
        "phone",
        "Phone",
        "shipping_phone",
        "recipient_phone",
      ])
    ),

    shipping_name: firstNonEmpty(
      order.shipping_name,
      firstItemValue(rawItems, ["shipping_name", "recipient_name", "AddressShippingName"]),
      fullNameFromParts(shippingFirstName, shippingLastName),
      customerFullName
    ),
    shipping_phone: firstNonEmpty(
      order.shipping_phone,
      firstItemValue(rawItems, ["shipping_phone", "recipient_phone", "phone", "Phone"])
    ),
    shipping_address_1: firstNonEmpty(
      order.shipping_address_1,
      addressToString(
        firstItemValue(rawItems, [
          "address_shipping",
          "shipping_address",
          "shipping_address_1",
          "AddressShipping",
          "AddressShippingAddress1",
        ])
      )
    ),
    shipping_address_2: firstNonEmpty(
      order.shipping_address_2,
      firstItemValue(rawItems, ["shipping_address_2", "address2", "AddressShippingAddress2"])
    ),
    shipping_city: firstNonEmpty(
      order.shipping_city,
      firstItemValue(rawItems, ["shipping_city", "city", "AddressShippingCity"])
    ),
    shipping_region: firstNonEmpty(
      order.shipping_region,
      firstItemValue(rawItems, ["shipping_region", "region", "province", "AddressShippingRegion"])
    ),
    shipping_postcode: firstNonEmpty(
      order.shipping_postcode,
      firstItemValue(rawItems, ["shipping_postcode", "postcode", "zip", "post_code", "AddressShippingPostCode"])
    ),
    shipping_country: firstNonEmpty(
      order.shipping_country,
      firstItemValue(rawItems, ["shipping_country", "country", "AddressShippingCountry"]),
      "Sri Lanka"
    ),

    billing_name: firstNonEmpty(
      order.billing_name,
      firstItemValue(rawItems, ["billing_name", "AddressBillingName"])
    ),
    billing_phone: firstNonEmpty(
      order.billing_phone,
      firstItemValue(rawItems, ["billing_phone", "AddressBillingPhone"])
    ),
    billing_address: firstNonEmpty(
      order.billing_address,
      addressToString(firstItemValue(rawItems, ["address_billing", "billing_address", "AddressBilling"]))
    ),

    package_id: firstNonEmpty(
      order.package_id,
      firstItemValue(rawItems, ["package_id", "packageId", "PackageId"])
    ),
    shipment_provider: firstNonEmpty(
      order.shipment_provider,
      firstItemValue(rawItems, ["shipment_provider", "shipping_provider", "ShipmentProvider", "delivery_type"])
    ),
    shipment_type: firstNonEmpty(
      order.shipment_type,
      firstItemValue(rawItems, ["shipment_type", "shipping_type", "ShippingType", "delivery_type"])
    ),
    tracking_number: firstNonEmpty(
      order.tracking_number,
      firstItemValue(rawItems, [
        "tracking_number",
        "trackingNumber",
        "tracking_code",
        "trackingCode",
        "TrackingCode",
        "awb_number",
        "awbNumber",
        "AWBNumber",
        "tracking_no",
        "trackingNo",
      ])
    ),

    items_count: rawItems.length || order.items_count,
    total_quantity: quantityTotal || order.total_quantity,
    subtotal: order.subtotal || priceTotal || paidTotal,
    shipping_fee: order.shipping_fee || shippingTotal,
    voucher_amount: order.voucher_amount || voucherTotal,
    tax_amount: order.tax_amount || taxTotal,
    total_amount: order.total_amount || paidTotal || priceTotal,
    raw_order_json: {
      order: order.raw_order_json || order,
      order_items: rawItems,
    },
  };

  return mergeNonEmpty(order, itemPatch);
}

async function normalizeItem(raw, orderDbId, orderRow) {
  const itemStatus = pick(
    raw,
    ["status", "item_status", "order_item_status", "Status"],
    orderRow.daraz_status || "unknown"
  );

  const localItemStatus = await orderModel.findLocalStatus(itemStatus);

  return {
    order_id: orderDbId,
    account_code: orderRow.account_code,
    daraz_order_id: orderRow.order_id,
    order_item_id: String(
      pick(
        raw,
        ["order_item_id", "orderItemId", "OrderItemId", "id", "item_id"],
        `${orderRow.order_id}_${Date.now()}_${crypto.randomUUID()}`
      )
    ),
    package_id: pick(raw, ["package_id", "packageId", "PackageId"], orderRow.package_id),
    product_id: pick(raw, ["product_id", "productId", "ProductId", "item_id"], null),
    sku: pick(raw, ["sku", "Sku", "seller_sku", "SellerSku"], null),
    shop_sku: pick(raw, ["shop_sku", "ShopSku"], null),
    seller_sku: pick(raw, ["seller_sku", "SellerSku", "sku", "Sku"], null),
    product_name: pick(raw, ["name", "product_name", "item_name", "title", "Name"], null),
    variation: pick(raw, ["variation", "variation_name", "Variation"], null),
    product_main_image: pick(
      raw,
      ["product_main_image", "main_image", "image", "image_url", "ProductMainImage"],
      null
    ),
    product_url: pick(raw, ["product_url", "url", "ProductUrl"], null),
    item_status: itemStatus,
    local_item_status: localItemStatus,
    quantity: toNumber(pick(raw, ["quantity", "qty", "Quantity"], 1), 1) || 1,
    currency: pick(raw, ["currency", "Currency"], orderRow.currency || "LKR"),
    unit_price: toNumber(pick(raw, ["unit_price", "item_price", "price", "ItemPrice"], 0), 0),
    paid_price: toNumber(pick(raw, ["paid_price", "paidPrice", "PaidPrice"], 0), 0),
    shipping_fee: toNumber(pick(raw, ["shipping_fee", "shippingFee", "ShippingFee"], 0), 0),
    voucher_amount: toNumber(pick(raw, ["voucher_amount", "voucher", "VoucherAmount"], 0), 0),
    tax_amount: toNumber(pick(raw, ["tax_amount", "tax", "TaxAmount"], 0), 0),
    total_amount: toNumber(pick(raw, ["total_amount", "paid_price", "price", "PaidPrice"], 0), 0),
    tracking_number: pick(
      raw,
      [
        "tracking_number",
        "trackingNumber",
        "tracking_code",
        "trackingCode",
        "TrackingCode",
        "awb_number",
        "awbNumber",
        "tracking_no",
        "trackingNo",
      ],
      orderRow.tracking_number
    ),
    shipment_provider: pick(
      raw,
      ["shipment_provider", "shipping_provider", "ShipmentProvider", "delivery_type"],
      orderRow.shipment_provider
    ),
    raw_item_json: raw,
  };
}

function orderPayloadFromDbRow(order) {
  return {
    account_id: order.account_id || null,
    account_code: order.account_code,
    order_id: order.order_id,
    order_number: order.order_number || order.order_id,
    daraz_status: order.daraz_status || order.status || "unknown",

    customer_first_name: order.customer_first_name || null,
    customer_last_name: order.customer_last_name || null,
    customer_full_name: order.customer_full_name || null,
    customer_email: order.customer_email || null,
    customer_phone: order.customer_phone || null,

    shipping_name: order.shipping_name || null,
    shipping_phone: order.shipping_phone || null,
    shipping_address_1: order.shipping_address_1 || null,
    shipping_address_2: order.shipping_address_2 || null,
    shipping_city: order.shipping_city || null,
    shipping_region: order.shipping_region || null,
    shipping_postcode: order.shipping_postcode || null,
    shipping_country: order.shipping_country || "Sri Lanka",

    billing_name: order.billing_name || null,
    billing_phone: order.billing_phone || null,
    billing_address: order.billing_address || null,

    payment_method: order.payment_method || null,
    payment_status: order.payment_status || null,

    currency: order.currency || "LKR",
    items_count: toNumber(order.items_count, 0),
    total_quantity: toNumber(order.total_quantity, 0),
    subtotal: toNumber(order.subtotal, 0),
    shipping_fee: toNumber(order.shipping_fee, 0),
    voucher_amount: toNumber(order.voucher_amount, 0),
    discount_amount: toNumber(order.discount_amount, 0),
    tax_amount: toNumber(order.tax_amount, 0),
    total_amount: toNumber(order.total_amount, 0),

    order_created_at: order.order_created_at || null,
    order_updated_at: order.order_updated_at || null,
    paid_at: order.paid_at || null,

    package_id: order.package_id || null,
    shipment_provider: order.shipment_provider || null,
    shipment_type: order.shipment_type || null,
    tracking_number: order.tracking_number || null,
    raw_order_json: order.raw_order_json || order,
  };
}

async function getOrderItemsFromDaraz(accountCode, darazOrderId) {
  const apiPath =
    process.env.DARAZ_ORDER_ITEMS_ENDPOINT ||
    process.env.DARAZ_ORDER_ITEMS_GET_API_PATH ||
    "/order/items/get";

  const query = cleanQuery({
    order_id: darazOrderId,
  });

  const response = await callDarazApi({
    account_code: accountCode,
    apiPath,
    endpoint: apiPath,
    method: "GET",
    query,
    params: query,
    requestType: "daraz_order_items_get",
    request_type: "daraz_order_items_get",
  });

  return {
    response,
    items: extractOrderItems(response),
  };
}

async function getTrackingFromDaraz(accountCode, orderLike) {
  const apiPath = process.env.DARAZ_TRACKING_ENDPOINT || "/order/tracking/get";

  const query = cleanQuery({
    order_id: orderLike.order_id,
    package_id: orderLike.package_id,
    tracking_number: orderLike.tracking_number,
  });

  if (!query.order_id && !query.tracking_number && !query.package_id) {
    return null;
  }

  const response = await callDarazApi({
    account_code: accountCode,
    apiPath,
    endpoint: apiPath,
    method: "GET",
    query,
    params: query,
    requestType: "daraz_order_tracking_get",
    request_type: "daraz_order_tracking_get",
  });

  return response;
}

function extractTrackingOrderPatch(apiResponse) {
  if (!apiResponse) return {};

  const { data } = unwrapApiResponse(apiResponse);

  return cleanQuery({
    package_id: pick(data, ["package_id", "packageId", "PackageId"], null),
    shipment_provider: pick(
      data,
      ["shipment_provider", "shipping_provider", "ShipmentProvider", "carrier", "logistic_provider"],
      null
    ),
    shipment_type: pick(data, ["shipment_type", "shipping_type", "ShipmentType"], null),
    tracking_number: pick(
      data,
      [
        "tracking_number",
        "trackingNumber",
        "tracking_code",
        "trackingCode",
        "TrackingCode",
        "awb_number",
        "awbNumber",
        "tracking_no",
        "trackingNo",
      ],
      null
    ),
    order_updated_at: toMysqlDateTime(
      pick(data, ["updated_at", "updated_time", "update_time", "last_update_time"], null)
    ),
  });
}

function normalizeTrackingEvent(rawEvent, orderDbId, orderRow) {
  return {
    order_id: orderDbId,
    account_code: orderRow.account_code,
    daraz_order_id: orderRow.order_id,
    tracking_number: pick(
      rawEvent,
      ["tracking_number", "trackingNumber", "tracking_code", "trackingCode", "TrackingCode"],
      orderRow.tracking_number
    ),
    package_id: pick(rawEvent, ["package_id", "packageId", "PackageId"], orderRow.package_id),
    shipment_provider: pick(
      rawEvent,
      ["shipment_provider", "shipping_provider", "ShipmentProvider", "carrier", "logistic_provider"],
      orderRow.shipment_provider
    ),
    tracking_status: pick(rawEvent, ["status", "tracking_status", "TrackingStatus"], null),
    tracking_message: pick(rawEvent, ["message", "description", "tracking_message", "TrackingMessage"], null),
    tracking_location: pick(rawEvent, ["location", "city", "TrackingLocation"], null),
    event_time: toMysqlDateTime(
      pick(rawEvent, ["event_time", "time", "created_at", "createdTime", "EventTime"], null)
    ),
    raw_tracking_json: rawEvent,
  };
}

async function saveTrackingEventsIfModelSupports(orderDbId, orderRow, apiResponse) {
  const events = extractTrackingEvents(apiResponse);

  if (!events.length) return;

  if (typeof orderModel.upsertTrackingEvent === "function") {
    for (const rawEvent of events) {
      await orderModel.upsertTrackingEvent(normalizeTrackingEvent(rawEvent, orderDbId, orderRow));
    }
    return;
  }

  if (typeof orderModel.insertTrackingEvent === "function") {
    for (const rawEvent of events) {
      await orderModel.insertTrackingEvent(normalizeTrackingEvent(rawEvent, orderDbId, orderRow));
    }
  }
}

async function syncOrdersForAccount(account, options = {}) {
  const accountCode = account.account_code;
  const syncUid = uid("daraz_order_sync");

  const { createdAfter, createdBefore } = getDateRange(options);

  const syncRunId = await orderModel.createSyncRun({
    sync_uid: syncUid,
    account_id: account.id || account.account_id || null,
    account_code: accountCode,
    sync_type: options.triggered_by === "user" ? "manual_orders" : "auto_orders",
    date_from: createdAfter,
    date_to: createdBefore,
    request_summary: {
      ...options,
      created_after: createdAfter,
      created_before: createdBefore,
    },
    triggered_by: options.triggered_by || "system",
    triggered_by_user_id: options.user_id || null,
  });

  const startedAt = Date.now();

  let totalFetched = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalPages = 0;
  let totalItemsFetched = 0;
  let totalTrackingUpdated = 0;

  const errors = [];

  try {
    await orderModel.updateSyncSettings("DARAZ", {
      last_sync_started_at: new Date(),
      last_sync_status: "running",
      last_error_message: null,
    });

    const apiPath =
      process.env.DARAZ_ORDERS_ENDPOINT ||
      process.env.DARAZ_ORDERS_GET_API_PATH ||
      "/orders/get";

    const pageLimit = Math.min(Number(options.page_limit || options.limit || 100), 100);

    let offset = Math.max(Number(options.offset || 0), 0);
    let keepGoing = true;

    while (keepGoing) {
      const query = cleanQuery({
        created_after: createdAfter,
        created_before: createdBefore,
        limit: pageLimit,
        offset,
      });

      if (options.status || options.Status) {
        query.status = options.status || options.Status;
      }

      console.log("[DARAZ_ORDERS_GET_FINAL_QUERY]", query);

      const requestTime = new Date();

      const apiResponse = await callDarazApi({
        account_code: accountCode,
        account,
        apiPath,
        endpoint: apiPath,
        method: "GET",
        query,
        params: query,
        requestType: "daraz_orders_get",
        request_type: "daraz_orders_get",
      });

      await orderModel.logApi({
        request_uid: uid("daraz_orders_get"),
        sync_run_id: syncRunId,
        account_id: account.id || account.account_id || null,
        account_code: accountCode,
        section: "orders",
        request_type: "daraz_orders_get",
        api_endpoint: apiPath,
        http_method: "GET",
        request_query: query,
        response_body: apiResponse,
        api_status: "success",
        request_time: requestTime,
        response_time: new Date(),
        duration_ms: Date.now() - requestTime.getTime(),
      });

      const orders = extractOrders(apiResponse);
      totalPages += 1;
      totalFetched += orders.length;

      console.log("[DARAZ_ORDERS_PAGE_RESULT]", {
        account_code: accountCode,
        page: totalPages,
        limit: pageLimit,
        offset,
        fetched: orders.length,
        total_fetched: totalFetched,
      });

      for (const rawOrder of orders) {
        let normalizedOrder;
        let rawItems = [];
        let orderItemsResponse = null;

        try {
          normalizedOrder = normalizeOrder(rawOrder, account);

          if (!normalizedOrder.order_id) {
            totalFailed += 1;
            errors.push("Order skipped: missing order_id");
            continue;
          }

          if (options.sync_items !== false) {
            try {
              const itemResult = await getOrderItemsFromDaraz(accountCode, normalizedOrder.order_id);
              rawItems = itemResult.items;
              orderItemsResponse = itemResult.response;
              totalItemsFetched += rawItems.length;

              await orderModel.logApi({
                request_uid: uid("daraz_order_items_get"),
                sync_run_id: syncRunId,
                account_id: account.id || account.account_id || null,
                account_code: accountCode,
                section: "order_items",
                request_type: "daraz_order_items_get",
                api_endpoint:
                  process.env.DARAZ_ORDER_ITEMS_ENDPOINT ||
                  process.env.DARAZ_ORDER_ITEMS_GET_API_PATH ||
                  "/order/items/get",
                http_method: "GET",
                request_query: { order_id: normalizedOrder.order_id },
                response_body: orderItemsResponse,
                api_status: "success",
                request_time: new Date(),
                response_time: new Date(),
                duration_ms: 0,
              });
            } catch (itemError) {
              errors.push(`Order ${normalizedOrder.order_id} items sync failed: ${itemError.message}`);
            }
          }

          // Important fix: merge /order/items/get customer, shipping and tracking values
          // into the parent order before saving/updating the orders table.
          let enrichedOrder = mergeOrderWithItemDetails(normalizedOrder, rawItems);

          const saved = await orderModel.upsertOrder(enrichedOrder);

          if (saved.action === "inserted") totalInserted += 1;
          if (saved.action === "updated") totalUpdated += 1;

          for (const rawItem of rawItems) {
            const item = await normalizeItem(rawItem, saved.id, enrichedOrder);
            await orderModel.upsertOrderItem(saved.id, item);
          }

          const trackingSyncEnabled =
            options.sync_tracking === true ||
            String(process.env.DARAZ_ORDER_SYNC_TRACKING || "true").toLowerCase() === "true";

          if (trackingSyncEnabled && (enrichedOrder.tracking_number || enrichedOrder.package_id)) {
            try {
              const trackingResponse = await getTrackingFromDaraz(accountCode, enrichedOrder);

              if (trackingResponse) {
                const trackingPatch = extractTrackingOrderPatch(trackingResponse);

                if (Object.keys(trackingPatch).length) {
                  enrichedOrder = mergeNonEmpty(enrichedOrder, trackingPatch);
                  enrichedOrder.raw_order_json = {
                    ...(typeof enrichedOrder.raw_order_json === "object" ? enrichedOrder.raw_order_json : {}),
                    tracking: trackingResponse,
                  };

                  await orderModel.upsertOrder(enrichedOrder);
                  totalTrackingUpdated += 1;
                }

                await saveTrackingEventsIfModelSupports(saved.id, enrichedOrder, trackingResponse);

                await orderModel.logApi({
                  request_uid: uid("daraz_tracking_get"),
                  sync_run_id: syncRunId,
                  account_id: account.id || account.account_id || null,
                  account_code: accountCode,
                  section: "tracking",
                  request_type: "daraz_order_tracking_get",
                  api_endpoint: process.env.DARAZ_TRACKING_ENDPOINT || "/order/tracking/get",
                  http_method: "GET",
                  request_query: cleanQuery({
                    order_id: enrichedOrder.order_id,
                    package_id: enrichedOrder.package_id,
                    tracking_number: enrichedOrder.tracking_number,
                  }),
                  response_body: trackingResponse,
                  api_status: "success",
                  request_time: new Date(),
                  response_time: new Date(),
                  duration_ms: 0,
                });
              }
            } catch (trackingError) {
              errors.push(`Order ${enrichedOrder.order_id} tracking sync failed: ${trackingError.message}`);
            }
          }
        } catch (error) {
          totalFailed += 1;
          errors.push(error.message);
        }
      }

      if (orders.length < pageLimit) {
        keepGoing = false;
      } else {
        offset += pageLimit;
      }

      if (options.max_pages && totalPages >= Number(options.max_pages)) {
        keepGoing = false;
      }
    }

    await orderModel.finishSyncRun(syncRunId, {
      sync_status: totalFailed ? "partial" : "success",
      total_fetched: totalFetched,
      total_inserted: totalInserted,
      total_updated: totalUpdated,
      total_failed: totalFailed,
      response_summary: {
        total_pages: totalPages,
        total_items_fetched: totalItemsFetched,
        total_tracking_updated: totalTrackingUpdated,
        errors,
      },
    });

    await orderModel.updateSyncSettings("DARAZ", {
      last_sync_finished_at: new Date(),
      last_sync_status: totalFailed ? "partial" : "success",
      last_error_message: errors[0] || null,
    });

    return {
      success: true,
      sync_run_id: syncRunId,
      account_code: accountCode,
      created_after: createdAfter,
      created_before: createdBefore,
      total_pages: totalPages,
      total_fetched: totalFetched,
      total_items_fetched: totalItemsFetched,
      total_tracking_updated: totalTrackingUpdated,
      total_inserted: totalInserted,
      total_updated: totalUpdated,
      total_failed: totalFailed,
      errors,
    };
  } catch (error) {
    await orderModel.finishSyncRun(syncRunId, {
      sync_status: "failed",
      total_fetched: totalFetched,
      total_inserted: totalInserted,
      total_updated: totalUpdated,
      total_failed: totalFailed + 1,
      response_summary: {
        total_pages: totalPages,
        total_items_fetched: totalItemsFetched,
        total_tracking_updated: totalTrackingUpdated,
        errors,
      },
      error_message: error.message,
    });

    await orderModel.logApi({
      request_uid: uid("daraz_orders_error"),
      sync_run_id: syncRunId,
      account_id: account.id || account.account_id || null,
      account_code: accountCode,
      section: "orders",
      request_type: "daraz_orders_get",
      api_endpoint:
        process.env.DARAZ_ORDERS_ENDPOINT ||
        process.env.DARAZ_ORDERS_GET_API_PATH ||
        "/orders/get",
      http_method: "GET",
      request_query: options,
      response_body: {},
      api_status: "failed",
      api_message: error.message,
      error_stack: error.stack,
      request_time: new Date(startedAt),
      response_time: new Date(),
      duration_ms: Date.now() - startedAt,
    });

    await orderModel.updateSyncSettings("DARAZ", {
      last_sync_finished_at: new Date(),
      last_sync_status: "failed",
      last_error_message: error.message,
    });

    throw error;
  }
}

async function changeStatus(orderId, newStatus, userId) {
  const order = await orderModel.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  const apiPath = process.env.DARAZ_ORDER_STATUS_UPDATE_ENDPOINT || "/order/status/update";

  const payload = {
    order_id: order.order_id,
    status: newStatus,
  };

  let apiResponse;
  let success = false;

  try {
    apiResponse = await callDarazApi({
      account_code: order.account_code,
      apiPath,
      endpoint: apiPath,
      method: "POST",
      query: payload,
      params: payload,
      body: payload,
      requestType: "daraz_order_status_update",
      request_type: "daraz_order_status_update",
    });

    success = true;
  } catch (error) {
    await orderModel.insertStatusHistory({
      order_id: order.id,
      account_code: order.account_code,
      daraz_order_id: order.order_id,
      old_daraz_status: order.daraz_status,
      new_daraz_status: newStatus,
      old_local_status: order.local_status,
      new_local_status: null,
      change_source: "user_action",
      daraz_api_called: true,
      daraz_api_success: false,
      request_payload: payload,
      response_payload: {},
      error_message: error.message,
      changed_by: userId || null,
    });

    throw error;
  }

  const newLocalStatus = await orderModel.updateOrderStatus(order.id, {
    daraz_status: newStatus,
  });

  await orderModel.insertStatusHistory({
    order_id: order.id,
    account_code: order.account_code,
    daraz_order_id: order.order_id,
    old_daraz_status: order.daraz_status,
    new_daraz_status: newStatus,
    old_local_status: order.local_status,
    new_local_status: newLocalStatus,
    change_source: "user_action",
    daraz_api_called: true,
    daraz_api_success: success,
    request_payload: payload,
    response_payload: apiResponse,
    changed_by: userId || null,
  });

  return {
    success: true,
    order_id: order.id,
    daraz_status: newStatus,
    local_status: newLocalStatus,
    api_response: apiResponse,
  };
}

async function generateAwb(orderId, userId) {
  const order = await orderModel.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  const apiPath = process.env.DARAZ_AWB_ENDPOINT || "/order/awb/get";

  const query = cleanQuery({
    order_id: order.order_id,
    package_id: order.package_id,
  });

  const apiResponse = await callDarazApi({
    account_code: order.account_code,
    apiPath,
    endpoint: apiPath,
    method: "GET",
    query,
    params: query,
    requestType: "daraz_order_awb_get",
    request_type: "daraz_order_awb_get",
  });

  const { data } = unwrapApiResponse(apiResponse);

  const awbNumber = pick(data, ["awb_number", "awbNumber", "AWBNumber"], null);
  const trackingNumber = pick(
    data,
    ["tracking_number", "trackingNumber", "tracking_code", "trackingCode", "TrackingCode"],
    order.tracking_number
  );

  await orderModel.markAwbGenerated(order.id, {
    account_code: order.account_code,
    daraz_order_id: order.order_id,
    package_id: order.package_id,
    awb_number: awbNumber,
    tracking_number: trackingNumber,
    file_type: data.file_url || data.url ? "url" : "pdf",
    file_url: data.file_url || data.url || data.pdf_url || null,
    api_response_json: apiResponse,
    created_by: userId || null,
  });

  // Important fix: also refresh orders table tracking_number/package/provider after AWB call.
  const orderPatch = cleanQuery({
    package_id: pick(data, ["package_id", "packageId", "PackageId"], order.package_id),
    shipment_provider: pick(
      data,
      ["shipment_provider", "shipping_provider", "ShipmentProvider", "carrier", "logistic_provider"],
      order.shipment_provider
    ),
    shipment_type: pick(data, ["shipment_type", "shipping_type", "ShipmentType"], order.shipment_type),
    tracking_number: trackingNumber,
  });

  if (Object.keys(orderPatch).length) {
    await orderModel.upsertOrder(
      mergeNonEmpty(orderPayloadFromDbRow(order), {
        ...orderPatch,
        raw_order_json: {
          ...(typeof order.raw_order_json === "object" ? order.raw_order_json : {}),
          awb: apiResponse,
        },
      })
    );
  }

  return {
    success: true,
    api_response: apiResponse,
  };
}

async function syncTracking(orderId) {
  const order = await orderModel.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  const apiPath = process.env.DARAZ_TRACKING_ENDPOINT || "/order/tracking/get";

  const query = cleanQuery({
    order_id: order.order_id,
    package_id: order.package_id,
    tracking_number: order.tracking_number,
  });

  const apiResponse = await callDarazApi({
    account_code: order.account_code,
    apiPath,
    endpoint: apiPath,
    method: "GET",
    query,
    params: query,
    requestType: "daraz_order_tracking_get",
    request_type: "daraz_order_tracking_get",
  });

  await orderModel.logApi({
    request_uid: uid("daraz_tracking_get"),
    account_code: order.account_code,
    section: "tracking",
    request_type: "daraz_order_tracking_get",
    api_endpoint: apiPath,
    http_method: "GET",
    request_query: query,
    response_body: apiResponse,
    api_status: "success",
  });

  const trackingPatch = extractTrackingOrderPatch(apiResponse);

  if (Object.keys(trackingPatch).length) {
    await orderModel.upsertOrder(
      mergeNonEmpty(orderPayloadFromDbRow(order), {
        ...trackingPatch,
        raw_order_json: {
          ...(typeof order.raw_order_json === "object" ? order.raw_order_json : {}),
          tracking: apiResponse,
        },
      })
    );
  }

  await saveTrackingEventsIfModelSupports(order.id, orderPayloadFromDbRow(order), apiResponse);

  return {
    success: true,
    updated_order_fields: trackingPatch,
    api_response: apiResponse,
  };
}

module.exports = {
  syncOrdersForAccount,
  changeStatus,
  generateAwb,
  syncTracking,
};
