const productInventoryModel = require("../../models/product_management/product/product_inventory_model");
const productPriceModel = require("../../models/product_management/product/product_price_model");
const priceHistoryModel = require("../../models/product_management/product/price_history_model");
const priceRuleModel = require("../../models/product_management/product/price_rule_model");
const skuMappingModel = require("../../models/product_management/sku_mapping/sku_mapping_model");
const inventoryLogModel = require("../../models/order_management/inventory_log_model");
const darazInventorySyncService = require("../daraz/inventory/daraz_inventory_sync_service");

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
    console.error("[GRN_SUGGESTED_PRICE_REFRESH_FAILED]", { sku: resolvedSku, message: error.message });
  }
}

// A GRN's unit_cost is the most reliable actual purchase cost there is -
// push it into product_prices.cost_price and log the change, so the Price
// Dashboard's cost history reflects real receiving prices, not manual
// guesses. Never blocks the stock update - a missing price row or a write
// failure here is logged and swallowed, same pattern as the Daraz push.
async function updateCostPrice({ resolvedSku, unitCost, grnNumber, changedBy }) {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return;

  try {
    const priceRow = await productPriceModel.findBySku(resolvedSku);
    if (!priceRow) return;

    const oldCost = Number(priceRow.cost_price || 0);
    if (Math.round(oldCost * 100) === Math.round(unitCost * 100)) return;

    await productPriceModel.updateBySku(resolvedSku, { cost_price: unitCost }, { updated_by: changedBy });

    await priceHistoryModel.create({
      sku: resolvedSku,
      field_name: "cost_price",
      old_value: oldCost,
      new_value: unitCost,
      changed_by: changedBy,
    });

    await refreshSuggestedPrices({ resolvedSku, costPrice: unitCost, changedBy });
  } catch (error) {
    console.error("[GRN_COST_PRICE_UPDATE_FAILED]", { grnNumber, sku: resolvedSku, message: error.message });
  }
}

// Mirrors order_inventory_deduction_service's deductStockForNewItem, but in
// the opposite direction: goods physically arrived, so stock goes up. Kept
// as its own per-item try/catch loop (not a transaction) so one bad/missing
// SKU doesn't block the rest of a receipt's stock from updating - the GRN
// record itself is already committed by this point regardless.
async function increaseStockForReceipt({ grnNumber, items, changedBy = null }) {
  const results = [];

  for (const item of items) {
    const cleanSku = String(item.sku || "").trim();
    const qty = Number(item.quantity_received || 0);

    if (!cleanSku || qty <= 0) continue;

    try {
      let inventoryRow = await productInventoryModel.findBySku(cleanSku);
      let resolvedSku = cleanSku;

      if (!inventoryRow) {
        const mappedSku = await skuMappingModel.resolveCorrectSku(cleanSku);
        if (mappedSku) {
          inventoryRow = await productInventoryModel.findBySku(mappedSku);
          resolvedSku = mappedSku;
        }
      }

      if (!inventoryRow) {
        await inventoryLogModel.create({
          source: "grn",
          source_order_id: grnNumber,
          sku: cleanSku,
          qty,
          status: "sku_missing",
          message: `SKU "${cleanSku}" is missing - not found in local inventory or SKU mapping. Stock not increased.`,
        });

        results.push({ sku: cleanSku, status: "sku_missing" });
        continue;
      }

      const oldQty = Number(inventoryRow.stock_qty || 0);
      const newQty = oldQty + qty;

      await productInventoryModel.updateBySku(resolvedSku, { stock_qty: newQty });

      await inventoryLogModel.create({
        source: "grn",
        source_order_id: grnNumber,
        sku: resolvedSku,
        qty,
        old_stock_qty: oldQty,
        new_stock_qty: newQty,
        status: "success",
        message: `Stock increased by GRN ${grnNumber}.`,
      });

      try {
        await darazInventorySyncService.pushSkuStockToDaraz({
          sku: resolvedSku,
          quantity: newQty,
          source: "grn_received",
        });
      } catch (pushError) {
        console.error("[GRN_INVENTORY_CROSS_ACCOUNT_SYNC_FAILED]", pushError.message);
      }

      await updateCostPrice({ resolvedSku, unitCost: Number(item.unit_cost), grnNumber, changedBy });

      results.push({ sku: resolvedSku, status: "success", old_stock_qty: oldQty, new_stock_qty: newQty });
    } catch (error) {
      await inventoryLogModel.create({
        source: "grn",
        source_order_id: grnNumber,
        sku: cleanSku,
        qty,
        status: "error",
        message: error.message || "Stock increase failed.",
      });

      results.push({ sku: cleanSku, status: "error", message: error.message });
    }
  }

  return results;
}

module.exports = { increaseStockForReceipt };
