const { callDarazApi } = require("../../marketplace/daraz_api_service");

// Read-side Daraz Order API — GetOrders/GetOrderItems power the real order
// sync job; GetDocument/GetOrderLogisticDetail/GetOrderTrace back the
// invoice/tracking UI. All GET calls per Daraz's own docs (query params,
// not a JSON-wrapped request object like the Fulfillment API).

async function getOrders({
  account,
  credentials,
  updateAfter,
  updateBefore,
  createdAfter,
  createdBefore,
  offset = 0,
  limit = 100,
  sortBy = "updated_at",
  sortDirection = "DESC",
  status,
}) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/orders/get",
    method: "GET",
    requestType: "orders_get",
    query: {
      update_after: updateAfter,
      update_before: updateBefore,
      created_after: createdAfter,
      created_before: createdBefore,
      offset,
      limit,
      sort_by: sortBy,
      sort_direction: sortDirection,
      status,
    },
  });
}

async function getOrder({ account, credentials, orderId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/get",
    method: "GET",
    requestType: "order_get",
    query: { order_id: orderId },
  });
}

async function getOrderItems({ account, credentials, orderId }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/items/get",
    method: "GET",
    requestType: "order_items_get",
    query: { order_id: orderId },
  });
}

async function getMultipleOrderItems({ account, credentials, orderIds = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/orders/items/get",
    method: "GET",
    requestType: "orders_items_get",
    query: { order_ids: JSON.stringify(orderIds.map(Number)) },
  });
}

async function getOrderLogisticDetail({ account, credentials, orderId, packageIdList = [], locale = "en" }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/logistic/get",
    method: "GET",
    requestType: "order_logistic_get",
    query: {
      order_id: orderId,
      package_id_list: JSON.stringify(packageIdList),
      locale,
    },
  });
}

async function getOrderTrace({ account, credentials, orderId, ofcPackageIdList = [], locale = "en" }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/logistic/order/trace",
    method: "GET",
    requestType: "order_trace_get",
    query: {
      order_id: orderId,
      ofcPackageIdList: JSON.stringify(ofcPackageIdList),
      locale,
    },
  });
}

async function getDocument({ account, credentials, docType, orderItemIds = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/document/get",
    method: "GET",
    requestType: "order_document_get",
    query: {
      doc_type: docType,
      order_item_ids: JSON.stringify(orderItemIds.map(Number)),
    },
  });
}

module.exports = {
  getOrders,
  getOrder,
  getOrderItems,
  getMultipleOrderItems,
  getOrderLogisticDetail,
  getOrderTrace,
  getDocument,
};
