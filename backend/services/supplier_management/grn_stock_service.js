const productInventoryModel = require("../../models/product_management/product/product_inventory_model");
const skuMappingModel = require("../../models/product_management/sku_mapping/sku_mapping_model");
const inventoryLogModel = require("../../models/order_management/inventory_log_model");
const darazInventorySyncService = require("../daraz/inventory/daraz_inventory_sync_service");

// Mirrors order_inventory_deduction_service's deductStockForNewItem, but in
// the opposite direction: goods physically arrived, so stock goes up. Kept
// as its own per-item try/catch loop (not a transaction) so one bad/missing
// SKU doesn't block the rest of a receipt's stock from updating - the GRN
// record itself is already committed by this point regardless.
async function increaseStockForReceipt({ grnNumber, items }) {
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
