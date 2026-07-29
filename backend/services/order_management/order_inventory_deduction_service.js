const productInventoryModel = require("../../models/product_management/product/product_inventory_model");
const skuMappingModel = require("../../models/product_management/sku_mapping/sku_mapping_model");
const inventoryLogModel = require("../../models/order_management/inventory_log_model");
const darazInventorySyncService = require("../daraz/inventory/daraz_inventory_sync_service");

// Tries a direct inventory match first, then falls back to the SKU Mapping
// table (wrong seller SKU -> correct local SKU) — returns null if neither
// resolves.
async function resolveInventoryRow(sku) {
  const cleanSku = String(sku || "").trim();
  if (!cleanSku) return null;

  let inventoryRow = await productInventoryModel.findBySku(cleanSku);
  if (inventoryRow) return { inventoryRow, resolvedSku: cleanSku };

  const mappedSku = await skuMappingModel.resolveCorrectSku(cleanSku);
  if (!mappedSku) return null;

  inventoryRow = await productInventoryModel.findBySku(mappedSku);
  return inventoryRow ? { inventoryRow, resolvedSku: mappedSku } : null;
}

// Called once per NEWLY-synced order item (never on re-sync/status-change
// updates — the caller is responsible for that idempotency). Deducts local
// stock, logs the attempt either way, and pushes the new quantity back out
// to every linked Daraz listing across every account so other channels
// don't oversell the same physical stock.
//
// Daraz's order-item API exposes two SKU-like fields (shop_sku and sku)
// that don't always agree with each other for the same listing — shop_sku
// is preferred, but when it doesn't match anything (not the catalog SKU,
// not a SKU Mapping entry) fallbackSku (the other field) is tried too
// before giving up. Confirmed live: a listing whose catalog seller_sku is
// "746440758-1764840125929-0" had shop_sku return "746440758_LK-2860989951"
// instead on every order-item sync, so every SKU Mapping entry created
// against the real catalog SKU silently never matched, and 9 delivered
// orders across 20+ days never deducted stock at all.
async function deductStockForNewItem({ source = "daraz", sourceOrderId, orderItemId, sku, fallbackSku, qty = 1 }) {
  const cleanSku = String(sku || "").trim();
  const cleanFallback = String(fallbackSku || "").trim();

  if (!cleanSku && !cleanFallback) {
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

  const match = (await resolveInventoryRow(cleanSku)) || (cleanFallback ? await resolveInventoryRow(cleanFallback) : null);

  if (!match) {
    const triedSkus = [cleanSku, cleanFallback].filter(Boolean).join('" / "');

    await inventoryLogModel.create({
      source,
      source_order_id: sourceOrderId,
      order_item_id: orderItemId,
      sku: cleanSku || cleanFallback,
      qty,
      status: "sku_missing",
      message: `SKU "${triedSkus}" is missing — not found in local inventory or SKU mapping. Stock not deducted.`,
    });
    return { status: "sku_missing" };
  }

  const { inventoryRow, resolvedSku } = match;

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
