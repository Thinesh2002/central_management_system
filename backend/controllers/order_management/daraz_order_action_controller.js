const asyncHandler = require("../../middleware/async_handler");

// Pack / Ready-to-Ship / Print AWB / etc. all call the real Daraz Order API,
// which isn't wired up yet — this returns a clear, consistent "pending"
// response instead of silently pretending to succeed. Once the Daraz Order
// API docs are available, replace the body of this handler with real calls
// (mirroring how daraz_transfer_service.js calls the Product API today).
const runBulkAction = asyncHandler(async (req, res) => {
  const { action, order_ids: orderIds = [] } = req.body || {};

  return res.status(501).json({
    success: false,
    message: `Daraz Order API is not connected yet, so "${action}" can't run for ${orderIds.length} order(s). Share the Daraz Order API docs (GetOrders/SetStatus/pack/RTS/print AWB) to enable this.`,
    data: { errors: orderIds.map((id) => ({ order_id: id, reason: "Daraz Order API not connected" })) },
  });
});

module.exports = { runBulkAction };
