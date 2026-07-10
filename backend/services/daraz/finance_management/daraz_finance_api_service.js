const { callDarazApi } = require("../../marketplace/daraz_api_service");

// Finance API — flat GET query params like the read-side Order/IM APIs
// (not the Fulfillment API's JSON-wrapped request objects), per these
// endpoints' own docs.

async function getPayoutStatus({ account, credentials, createdAfter }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/finance/payout/status/get",
    method: "GET",
    requestType: "daraz_finance_payout_status_get",
    query: { created_after: createdAfter },
  });
}

async function getTransactionDetails({
  account,
  credentials,
  startTime,
  endTime,
  offset,
  limit,
  transType,
  tradeOrderId,
  tradeOrderLineId,
}) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/finance/transaction/details/get",
    method: "GET",
    requestType: "daraz_finance_transaction_details_get",
    query: {
      start_time: startTime,
      end_time: endTime,
      offset,
      limit,
      trans_type: transType,
      trade_order_id: tradeOrderId,
      trade_order_line_id: tradeOrderLineId,
    },
  });
}

module.exports = { getPayoutStatus, getTransactionDetails };
