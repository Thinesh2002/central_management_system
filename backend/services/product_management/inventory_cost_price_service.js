const productPriceModel = require("../../models/product_management/product/product_price_model");
const priceHistoryModel = require("../../models/product_management/product/price_history_model");
const priceRuleModel = require("../../models/product_management/product/price_rule_model");

// Moved here from the (now-removed) GRN receiving flow, which used to be
// the only writer of cost-price changes: every time a SKU is manually
// restocked on the Inventory Dashboard with a cost price, that's just as
// real a purchase price as a GRN line item was, so it gets the same
// treatment - update product_prices.cost_price, log the change to
// price_history (Price Dashboard's "History" view reads this), and
// refresh suggested prices from the price rule engine.

// Price Rule Engine, "suggest only": recomputes suggested_sale_price /
// suggested_daraz_price / suggested_woo_price from the new cost using
// whatever active rule matches the SKU's category (or the global rule)
// per marketplace. Never touches the real sale_price/daraz_price/woo_price
// fields - those stay manual until a human applies a suggestion on the
// Price Dashboard. Swallows its own errors; a missing rule/category just
// means no suggestion, not a failure.
async function refreshSuggestedPrices({ resolvedSku, costPrice, changedBy }) {
  try {
    const categoryId = await priceRuleModel.resolveCategoryIdForSku(resolvedSku);

    const [localRule, darazRule, wooRule] = await Promise.all([
      priceRuleModel.resolveRule({ categoryId, marketplace: "local" }),
      priceRuleModel.resolveRule({ categoryId, marketplace: "daraz" }),
      priceRuleModel.resolveRule({ categoryId, marketplace: "woocommerce" }),
    ]);

    const suggestedSale = priceRuleModel.computeSuggestedPrice({ costPrice, rule: localRule });
    const suggestedDaraz = priceRuleModel.computeSuggestedPrice({ costPrice, rule: darazRule });
    const suggestedWoo = priceRuleModel.computeSuggestedPrice({ costPrice, rule: wooRule });

    if (suggestedSale === null && suggestedDaraz === null && suggestedWoo === null) return;

    await productPriceModel.updateBySku(
      resolvedSku,
      {
        suggested_sale_price: suggestedSale,
        suggested_daraz_price: suggestedDaraz,
        suggested_woo_price: suggestedWoo,
        suggested_at: new Date(),
      },
      { updated_by: changedBy }
    );
  } catch (error) {
    console.error("[INVENTORY_SUGGESTED_PRICE_REFRESH_FAILED]", { sku: resolvedSku, message: error.message });
  }
}

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

    await refreshSuggestedPrices({ resolvedSku, costPrice, changedBy });
  } catch (error) {
    console.error("[INVENTORY_COST_PRICE_UPDATE_FAILED]", { sku: resolvedSku, message: error.message });
  }
}

module.exports = { updateCostPrice };
