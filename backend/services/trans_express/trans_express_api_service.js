const axios = require("axios");

// Production endpoint per Trans Express's published docs. The API key is
// generated once (Client Portal -> My Profile -> Update Account -> API Key)
// and used directly as a Bearer token - no login call needed at runtime.
const BASE_URL = "https://portal.transexpress.lk/api";

function getToken() {
  return process.env.TRANS_EXPRESS_API_TOKEN || null;
}

// POST /tracking { waybill_id } -> { data: { waybill_id, order_no,
// customer_name, customer_address, customer_district, customer_city,
// customer_phone_no, weight, placed_date, completed_date, status_history } }
async function trackOrder(waybillId) {
  const token = getToken();

  if (!token) {
    const error = new Error("Trans Express API token is not configured.");
    error.statusCode = 503;
    throw error;
  }

  const response = await axios.post(
    `${BASE_URL}/tracking`,
    { waybill_id: waybillId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  return response.data?.data || response.data || {};
}

// The exact key/shape for "Status History" wasn't confirmed beyond its name
// in the docs, so this reads defensively across the spellings a snake_case
// API is likely to use, and takes the last entry as the current status.
function latestStatusEntry(trackingData = {}) {
  const history =
    trackingData.status_history || trackingData.statusHistory || trackingData.history || [];

  if (!Array.isArray(history) || !history.length) return null;
  return history[history.length - 1];
}

function extractStatusText(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.status || entry.order_status || entry.remark || entry.description || entry.title || null;
}

function isDelivered(trackingData) {
  const status = extractStatusText(latestStatusEntry(trackingData));
  return typeof status === "string" && /delivered/i.test(status);
}

module.exports = { getToken, trackOrder, latestStatusEntry, extractStatusText, isDelivered };
