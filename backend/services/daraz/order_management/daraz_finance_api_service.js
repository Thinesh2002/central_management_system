const { callDarazApi } = require("../../marketplace/daraz_api_service");

// Finance API — QueryTransactionDetails. GET with flat query params, same
// convention as the read-side Order API (not the Fulfillment API's
// JSON-wrapped request objects). start_time/end_time are required and the
// gap between them must be under 180 days per Daraz's own error 1000012.
async function getTransactionDetails({
  account,
  credentials,
  tradeOrderId,
  tradeOrderLineId,
  startTime,
  endTime,
  offset,
  limit = 500,
  transType,
}) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/finance/transaction/details/get",
    method: "GET",
    requestType: "finance_transaction_details_get",
    query: {
      start_time: startTime,
      end_time: endTime,
      trade_order_id: tradeOrderId,
      trade_order_line_id: tradeOrderLineId,
      offset,
      limit,
      trans_type: transType,
    },
  });
}

module.exports = { getTransactionDetails };
