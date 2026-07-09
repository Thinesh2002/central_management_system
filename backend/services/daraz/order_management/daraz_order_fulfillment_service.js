const { callDarazApi } = require("../../marketplace/daraz_api_service");

// Every Daraz Fulfillment API call below follows the same IOP convention
// documented for the whole endpoint family: the request body is a single
// JSON-stringified object passed as a signed query parameter (not the raw
// HTTP body) — see daraz_catalog_api_service.js's XML-payload calls for the
// same pattern already proven against this account's credentials.

async function packOrder({ account, credentials, packOrderList, deliveryType, shipmentProviderCode, shippingAllocateType }) {
  const packReq = {
    pack_order_list: packOrderList,
  };

  if (deliveryType) packReq.delivery_type = deliveryType;
  if (shipmentProviderCode) packReq.shipment_provider_code = shipmentProviderCode;
  if (shippingAllocateType) packReq.shipping_allocate_type = shippingAllocateType;

  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/fulfill/pack",
    method: "POST",
    requestType: "order_pack",
    query: { packReq: JSON.stringify(packReq) },
  });
}

async function readyToShip({ account, credentials, packageIds = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/package/rts",
    method: "POST",
    requestType: "order_ready_to_ship",
    query: {
      readyToShipReq: JSON.stringify({
        packages: packageIds.map((packageId) => ({ package_id: packageId })),
      }),
    },
  });
}

async function printAwb({ account, credentials, packageIds = [], docType = "PDF" }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/package/document/get",
    method: "GET",
    requestType: "order_print_awb",
    query: {
      getDocumentReq: JSON.stringify({
        doc_type: docType,
        print_item_list: "false",
        packages: packageIds.map((packageId) => ({ package_id: packageId })),
      }),
    },
  });
}

async function getShipmentProviders({ account, credentials, orders = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/shipment/providers/get",
    method: "GET",
    requestType: "order_shipment_providers",
    query: {
      getShipmentProvidersReq: JSON.stringify({ orders }),
    },
  });
}

async function recreatePackage({ account, credentials, packageIds = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/package/repack",
    method: "GET",
    requestType: "order_recreate_package",
    query: {
      rePackReq: JSON.stringify({
        packages: packageIds.map((packageId) => ({ package_id: packageId })),
      }),
    },
  });
}

async function confirmDeliveryForDBS({ account, credentials, packageIds = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/package/sof/delivered",
    method: "POST",
    requestType: "order_dbs_delivered",
    query: {
      dbsDeliveryReq: JSON.stringify({
        packages: packageIds.map((packageId) => ({ package_id: packageId })),
      }),
    },
  });
}

async function failedDeliveryForDBS({ account, credentials, packageIds = [] }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/order/package/sof/failed_delivery",
    method: "POST",
    requestType: "order_dbs_failed_delivery",
    query: {
      dbsDeliveryReq: JSON.stringify({
        packages: packageIds.map((packageId) => ({ package_id: packageId })),
      }),
    },
  });
}

module.exports = {
  packOrder,
  readyToShip,
  printAwb,
  getShipmentProviders,
  recreatePackage,
  confirmDeliveryForDBS,
  failedDeliveryForDBS,
};
