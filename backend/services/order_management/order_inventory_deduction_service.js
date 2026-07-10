const productInventoryModel = require("../../models/product_management/product/product_inventory_model");
const skuMappingModel = require("../../models/product_management/sku_mapping/sku_mapping_model");
const inventoryLogModel = require("../../models/order_management/inventory_log_model");
const darazInventorySyncService = require("../daraz/inventory/daraz_inventory_sync_service");

// Called once per NEWLY-synced order item (never on re-sync/status-change
// updates — the caller is responsible for that idempotency). Deducts local
// stock, logs the attempt either way, and pushes the new quantity back out
// to every linked Daraz listing across every account so other channels
// don't oversell the same physical stock.
async function deductStockForNewItem({ source = "daraz", sourceOrderId, orderItemId, sku, qty = 1 }) {
  const cleanSku = String(sku || "").trim();

  if (!cleanSku) {
    await inventoryLogModel.create({
      source,
      source_order_id: sourceOrderId,
      order_item_id: orderItemId,
      sku: null,
      qty,
      status: "sku_missing",
      message: "Order item has no SKU — stock not deducted.",
    });
    return { status: "sku_missing" };
  }

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
      source,
      source_order_id: sourceOrderId,
      order_item_id: orderItemId,
      sku: cleanSku,
      qty,
      status: "sku_missing",
      message: `SKU "${cleanSku}" is missing — not found in local inventory or SKU mapping. Stock not deducted.`,
    });
    return { status: "sku_missing" };
  }

  try {
    const oldQty = Number(inventoryRow.stock_qty || 0);
    const newQty = Math.max(oldQty - Number(qty || 0), 0);

    await productInventoryModel.updateBySku(resolvedSku, { stock_qty: newQty });

    await inventoryLogModel.create({
      source,
      source_order_id: sourceOrderId,
      order_item_id: orderItemId,
      sku: resolvedSku,
      qty,
      old_stock_qty: oldQty,
      new_stock_qty: newQty,
      status: "success",
      message: `Stock deducted for order ${sourceOrderId || "-"}.`,
    });

    // Cascade to every Daraz account this SKU is listed under, so the same
    // physical stock doesn't get oversold from another channel.
    try {
      await darazInventorySyncService.pushSkuStockToDaraz({
        sku: resolvedSku,
        quantity: newQty,
        source: "order_received",
      });
    } catch (pushError) {
      console.error("[INVENTORY_CROSS_ACCOUNT_SYNC_FAILED]", pushError.message);
    }

    return { status: "success", sku: resolvedSku, old_stock_qty: oldQty, new_stock_qty: newQty };
  } catch (error) {
    await inventoryLogModel.create({
      source,
      source_order_id: sourceOrderId,
      order_item_id: orderItemId,
      sku: resolvedSku,
      qty,
      status: "error",
      message: error.message || "Stock deduction failed.",
    });

    return { status: "error", message: error.message };
  }
}

module.exports = { deductStockForNewItem };
