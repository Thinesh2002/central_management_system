const { callDarazApi } = require("../../marketplace/daraz_api_service");

// Seller API — GetSellerMetricsById. Live snapshot, no query params beyond
// the standard signed-auth ones, per Daraz's own docs.
async function getSellerMetrics({ account, credentials }) {
  return callDarazApi({
    account,
    credentials,
    apiPath: "/seller/metrics/get",
    method: "GET",
    requestType: "daraz_seller_metrics_get",
    query: {},
  });
}

module.exports = { getSellerMetrics };
