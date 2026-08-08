const productPriceModel = require("../../models/product_management/product/product_price_model");
const priceHistoryModel = require("../../models/product_management/product/price_history_model");

// Moved here from the (now-removed) GRN receiving flow, which used to be
// the only writer of cost-price changes: every time a SKU is manually
// restocked on the Inventory Dashboard with a cost price, that's just as
// real a purchase price as a GRN line item was, so it gets the same
// treatment - update product_prices.cost_price and log the change to
// price_history (Price Dashboard's "History" view reads this).

// Never blocks the caller's stock update - a missing price row or a write
// failure here is logged and swallowed, same pattern the GRN flow used.
async function updateCostPrice({ sku, unitCost, changedBy }) {
  const resolvedSku = String(sku || "").trim();
  const costPrice = Number(unitCost);

  if (!resolvedSku || !Number.isFinite(costPrice) || costPrice <= 0) return;

  try {
    const priceRow = await productPriceModel.findBySku(resolvedSku);
    if (!priceRow) return;

    const oldCost = Number(priceRow.cost_price || 0);
    if (Math.round(oldCost * 100) === Math.round(costPrice * 100)) return;

    await productPriceModel.updateBySku(resolvedSku, { cost_price: costPrice }, { updated_by: changedBy });

    await priceHistoryModel.create({
      sku: resolvedSku,
      field_name: "cost_price",
      old_value: oldCost,
      new_value: costPrice,
      changed_by: changedBy,
    });
  } catch (error) {
    console.error("[INVENTORY_COST_PRICE_UPDATE_FAILED]", { sku: resolvedSku, message: error.message });
  }
}

module.exports = { updateCostPrice };
