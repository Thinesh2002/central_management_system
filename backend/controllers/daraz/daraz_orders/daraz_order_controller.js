const orderModel = require("../../../models/daraz/daraz_orders/daraz_order_model");
const orderService = require("../../../services/daraz/daraz_orders/daraz_order_service");
const accountModel = require("../../../models/marketplace/account_model");
const pool = require("../../../config/order_management_db/cm_order_management");

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getOrderLocalId(order = {}) {
  return cleanText(
    order.id ||
      order.order_db_id ||
      order.db_id ||
      order.local_order_id ||
      order.localOrderId ||
      order.order_pk_id ||
      "",
    ""
  );
}

function getOrderDarazId(order = {}) {
  return cleanText(
    order.daraz_order_id ||
      order.darazOrderId ||
      order.order_number ||
      order.orderNumber ||
      order.daraz_order_number ||
      order.darazOrderNumber ||
      order.order_id ||
      "",
    ""
  );
}

function extractOrdersFromResult(result) {
  if (!result) return [];

  if (Array.isArray(result)) return result;
  if (Array.isArray(result.orders)) return result.orders;
  if (Array.isArray(result.rows)) return result.rows;
  if (Array.isArray(result.items)) return result.items;

  if (result.data) {
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.data.orders)) return result.data.orders;
    if (Array.isArray(result.data.rows)) return result.data.rows;
    if (Array.isArray(result.data.items)) return result.data.items;
  }

  if (result.result) {
    if (Array.isArray(result.result)) return result.result;
    if (Array.isArray(result.result.orders)) return result.result.orders;
    if (Array.isArray(result.result.rows)) return result.result.rows;
    if (Array.isArray(result.result.items)) return result.result.items;
  }

  return [];
}

function replaceOrdersInResult(result, ordersWithItems) {
  if (Array.isArray(result)) {
    return {
      orders: ordersWithItems,
      rows: ordersWithItems,
      items: ordersWithItems,
      total: ordersWithItems.length,
    };
  }

  const finalResult = {
    ...(result || {}),
    orders: ordersWithItems,
    rows: ordersWithItems,
    items: ordersWithItems,
  };

  if (result?.data && typeof result.data === "object" && !Array.isArray(result.data)) {
    finalResult.data = {
      ...result.data,
      orders: ordersWithItems,
      rows: ordersWithItems,
      items: ordersWithItems,
    };
  } else if (Array.isArray(result?.data)) {
    finalResult.data = ordersWithItems;
  }

  if (result?.result && typeof result.result === "object" && !Array.isArray(result.result)) {
    finalResult.result = {
      ...result.result,
      orders: ordersWithItems,
      rows: ordersWithItems,
      items: ordersWithItems,
    };
  } else if (Array.isArray(result?.result)) {
    finalResult.result = ordersWithItems;
  }

  return finalResult;
}

function normalizeOrderItem(item = {}) {
  return {
    id: item.id,
    order_id: item.order_id,
    account_code: item.account_code,
    daraz_order_id: item.daraz_order_id,
    order_item_id: item.order_item_id,
    package_id: item.package_id,
    product_id: item.product_id,

    sku: item.sku || item.seller_sku || item.shop_sku || "",
    shop_sku: item.shop_sku || "",
    seller_sku: item.seller_sku || item.sku || item.shop_sku || "",

    product_name: item.product_name || item.title || item.name || "-",
    title: item.product_name || item.title || item.name || "-",
    name: item.product_name || item.title || item.name || "-",
    variation: item.variation || "",

    product_main_image: item.product_main_image || item.image_url || item.main_image || "",
    main_image: item.product_main_image || item.image_url || item.main_image || "",
    image_url: item.product_main_image || item.image_url || item.main_image || "",
    image: item.product_main_image || item.image_url || item.main_image || "",

    product_url: item.product_url || "",
    item_status: item.item_status || "",
    local_item_status: item.local_item_status || "",

    quantity: numberValue(item.quantity, 1),
    currency: item.currency || "LKR",
    unit_price: numberValue(item.unit_price, 0),
    paid_price: numberValue(item.paid_price, 0),
    shipping_fee: numberValue(item.shipping_fee, 0),
    voucher_amount: numberValue(item.voucher_amount, 0),
    tax_amount: numberValue(item.tax_amount, 0),
    total_amount: numberValue(item.total_amount, 0),

    tracking_number: item.tracking_number || "",
    shipment_provider: item.shipment_provider || "",

    raw_item_json: item.raw_item_json || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  };
}

function pushToMap(map, key, item) {
  const cleanKey = cleanText(key, "");
  if (!cleanKey) return;

  if (!map.has(cleanKey)) {
    map.set(cleanKey, []);
  }

  map.get(cleanKey).push(item);
}

async function listOrderItemsForOrders(orders = []) {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const orderIdCandidates = [];
  const darazOrderIdCandidates = [];

  orders.forEach((order) => {
    [
      order?.id,
      order?.order_db_id,
      order?.db_id,
      order?.local_order_id,
      order?.localOrderId,
      order?.order_pk_id,
      order?.order_id,
    ].forEach((value) => {
      if (value !== undefined && value !== null && value !== "") {
        orderIdCandidates.push(String(value));
      }
    });

    [
      order?.daraz_order_id,
      order?.darazOrderId,
      order?.order_number,
      order?.orderNumber,
      order?.daraz_order_number,
      order?.darazOrderNumber,
      order?.order_id,
    ].forEach((value) => {
      if (value !== undefined && value !== null && value !== "") {
        darazOrderIdCandidates.push(String(value));
      }
    });
  });

  const uniqueOrderIds = [...new Set(orderIdCandidates)];
  const uniqueDarazOrderIds = [...new Set(darazOrderIdCandidates)];

  const whereParts = [];
  const params = [];

  if (uniqueOrderIds.length > 0) {
    whereParts.push(
      `CAST(order_id AS CHAR) IN (${uniqueOrderIds.map(() => "?").join(",")})`
    );
    params.push(...uniqueOrderIds);
  }

  if (uniqueDarazOrderIds.length > 0) {
    whereParts.push(
      `CAST(daraz_order_id AS CHAR) IN (${uniqueDarazOrderIds
        .map(() => "?")
        .join(",")})`
    );
    params.push(...uniqueDarazOrderIds);
  }

  if (whereParts.length === 0) return [];

  const [rows] = await pool.query(
    `
    SELECT
      id,
      order_id,
      account_code,
      daraz_order_id,
      order_item_id,
      package_id,
      product_id,
      sku,
      shop_sku,
      seller_sku,
      product_name,
      variation,
      product_main_image,
      product_url,
      item_status,
      local_item_status,
      quantity,
      currency,
      unit_price,
      paid_price,
      shipping_fee,
      voucher_amount,
      tax_amount,
      total_amount,
      tracking_number,
      shipment_provider,
      raw_item_json,
      created_at,
      updated_at
    FROM daraz_order_items
    WHERE ${whereParts.join(" OR ")}
    ORDER BY order_id ASC, id ASC
    `,
    params
  );

  return rows;
}

async function attachOrderItems(orderRows = []) {
  if (!Array.isArray(orderRows) || orderRows.length === 0) return [];

  const itemRows = await listOrderItemsForOrders(orderRows);

  const itemsByLocalOrderId = new Map();
  const itemsByDarazOrderId = new Map();

  itemRows.forEach((itemRow) => {
    const item = normalizeOrderItem(itemRow);

    pushToMap(itemsByLocalOrderId, itemRow.order_id, item);
    pushToMap(itemsByDarazOrderId, itemRow.daraz_order_id, item);
  });

  return orderRows.map((order) => {
    const localOrderId = getOrderLocalId(order);
    const darazOrderId = getOrderDarazId(order);

    const matchedItems = [
      ...(itemsByLocalOrderId.get(localOrderId) || []),
      ...(itemsByDarazOrderId.get(darazOrderId) || []),
    ];

    const seen = new Set();
    const finalItems = [];

    matchedItems.forEach((item) => {
      const key = cleanText(item.order_item_id || item.id || `${item.seller_sku}-${finalItems.length}`);
      if (seen.has(key)) return;
      seen.add(key);
      finalItems.push(item);
    });

    const existingItems = asArray(order.order_items || order.line_items || order.products);
    const items = finalItems.length > 0 ? finalItems : existingItems;
    const firstItem = items[0] || null;
    const itemCount = items.length;

    return {
      ...order,

      order_items: items,
      line_items: items,

      items_count: itemCount,
      item_rows_count: itemCount,
      line_items_count: itemCount,

      first_product_name:
        order.first_product_name ||
        order.product_name ||
        firstItem?.product_name ||
        "-",

      product_name:
        order.product_name ||
        order.first_product_name ||
        firstItem?.product_name ||
        "-",

      title:
        order.title ||
        order.product_name ||
        order.first_product_name ||
        firstItem?.product_name ||
        "-",

      sku:
        order.sku ||
        order.seller_sku ||
        firstItem?.sku ||
        firstItem?.seller_sku ||
        "",

      seller_sku:
        order.seller_sku ||
        order.sku ||
        firstItem?.seller_sku ||
        firstItem?.sku ||
        "",

      product_main_image:
        order.product_main_image ||
        order.main_image ||
        order.image_url ||
        firstItem?.product_main_image ||
        "",

      main_image:
        order.main_image ||
        order.product_main_image ||
        order.image_url ||
        firstItem?.product_main_image ||
        "",

      image_url:
        order.image_url ||
        order.main_image ||
        order.product_main_image ||
        firstItem?.product_main_image ||
        "",

      tracking_number:
        order.tracking_number ||
        firstItem?.tracking_number ||
        "",

      shipment_provider:
        order.shipment_provider ||
        firstItem?.shipment_provider ||
        "",
    };
  });
}

async function resolveAccounts(accountCode) {
  if (accountCode) {
    if (typeof accountModel.getAccountByCode === "function") {
      const account = await accountModel.getAccountByCode(accountCode);
      if (!account) throw new Error(`Account not found: ${accountCode}`);
      return [account];
    }

    if (typeof accountModel.findByCode === "function") {
      const account = await accountModel.findByCode(accountCode);
      if (!account) throw new Error(`Account not found: ${accountCode}`);
      return [account];
    }
  }

  if (typeof accountModel.getAllAccounts === "function") {
    const accounts = await accountModel.getAllAccounts();

    return accounts.filter((account) => {
      const platform = String(
        account.platform_code ||
          account.platform ||
          account.marketplace ||
          ""
      ).toUpperCase();

      return platform === "DARAZ" || Boolean(account.account_code);
    });
  }

  throw new Error(
    "Cannot resolve Daraz accounts. Add getAllAccounts/getAccountByCode to account_model or update this controller."
  );
}

const health = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    module: "daraz_orders",
    message: "Daraz order module running",
  });
});

const getOrders = asyncHandler(async (req, res) => {
  const result = await orderModel.listOrders(req.query || {});
  const orderRows = extractOrdersFromResult(result);
  const ordersWithItems = await attachOrderItems(orderRows);
  const finalResult = replaceOrdersInResult(result, ordersWithItems);

  return res.json({
    success: true,
    ...finalResult,
    orders: ordersWithItems,
    rows: ordersWithItems,
  });
});

const getOrderDetail = asyncHandler(async (req, res) => {
  const detail = await orderModel.getOrderDetail(req.params.id);

  if (!detail) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  const ordersWithItems = await attachOrderItems([detail]);

  return res.json({
    success: true,
    data: ordersWithItems[0] || detail,
  });
});

const syncOrders = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const accounts = await resolveAccounts(body.account_code || req.query.account_code);
  const results = [];

  for (const account of accounts) {
    const result = await orderService.syncOrdersForAccount(account, {
      ...body,
      triggered_by: "user",
      user_id: req.user?.id || req.user?.user_id || null,
    });

    results.push(result);
  }

  res.json({
    success: true,
    message: "Daraz order sync completed",
    results,
  });
});

const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "status is required",
    });
  }

  const result = await orderService.changeStatus(
    req.params.id,
    status,
    req.user?.id || req.user?.user_id || null,
    req.body || {}
  );

  return res.json(result);
});

const generateAwb = asyncHandler(async (req, res) => {
  const result = await orderService.generateAwb(
    req.params.id,
    req.user?.id || req.user?.user_id || null
  );

  res.json(result);
});

const bulkAwb = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.order_ids) ? req.body.order_ids : [];

  if (!ids.length) {
    return res.status(400).json({
      success: false,
      message: "order_ids array is required",
    });
  }

  const results = [];

  for (const id of ids) {
    try {
      results.push({
        id,
        ...(await orderService.generateAwb(
          id,
          req.user?.id || req.user?.user_id || null
        )),
      });
    } catch (error) {
      results.push({
        id,
        success: false,
        message: error.message,
      });
    }
  }

  res.json({
    success: true,
    results,
  });
});

const bulkStatus = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.order_ids) ? req.body.order_ids : [];
  const { status } = req.body || {};

  if (!ids.length) {
    return res.status(400).json({
      success: false,
      message: "order_ids array is required",
    });
  }

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "status is required",
    });
  }

  const results = [];

  for (const id of ids) {
    try {
      results.push({
        id,
        ...(await orderService.changeStatus(
          id,
          status,
          req.user?.id || req.user?.user_id || null,
          req.body || {}
        )),
      });
    } catch (error) {
      results.push({
        id,
        success: false,
        message: error.message,
      });
    }
  }

  res.json({
    success: true,
    results,
  });
});

const syncTracking = asyncHandler(async (req, res) => {
  const result = await orderService.syncTracking(req.params.id);
  res.json(result);
});

const getApiLogs = asyncHandler(async (req, res) => {
  const rows = await orderModel.listApiLogs(req.query || {});

  res.json({
    success: true,
    rows,
  });
});

const getSyncLogs = asyncHandler(async (req, res) => {
  const rows = await orderModel.listSyncLogs(req.query || {});

  res.json({
    success: true,
    rows,
  });
});

module.exports = {
  health,
  getOrders,
  getOrderDetail,
  syncOrders,
  changeStatus,
  generateAwb,
  bulkAwb,
  bulkStatus,
  syncTracking,
  getApiLogs,
  getSyncLogs,
};