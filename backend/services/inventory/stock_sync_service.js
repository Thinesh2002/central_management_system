const inventoryModel = require('../../models/inventory/inventory_model');
const skuMappingModel = require('../../models/marketplace/sku_mapping_model');
const productDb = require('../../config/product_management_db/product_management_db');

function clean(value) {
  return String(value ?? '').trim();
}

function normalSku(value) {
  return clean(value).toUpperCase();
}

function isCancelLike(status) {
  return ['cancelled', 'canceled', 'cancel', 'returned', 'return_received', 'refunded', 'failed'].includes(clean(status).toLowerCase());
}

function isPendingLike(status) {
  return ['pending', 'processing', 'packed', 'ready_to_ship', 'ready-to-ship', 'confirmed'].includes(clean(status).toLowerCase());
}

function isOutLike(status) {
  return ['shipped', 'delivered', 'completed', 'complete'].includes(clean(status).toLowerCase());
}

async function movementExists({ reference_type, reference_id, sku, movement_type }) {
  const [rows] = await productDb.query(
    `SELECT id FROM inventory_stock_movements
     WHERE reference_type = ? AND reference_id = ? AND sku = ? AND movement_type = ?
     LIMIT 1`,
    [reference_type, reference_id, normalSku(sku), movement_type]
  ).catch(() => [[]]);
  return Boolean(rows[0]);
}

async function ensureStockAvailable(localSku, quantity, movementType) {
  const current = await inventoryModel.getInventoryBySku(localSku);
  const stock = Number(current?.stock_qty || 0);
  const reserved = Number(current?.reserved_qty || 0);
  const available = Math.max(stock - reserved, 0);
  const qty = Math.abs(Number(quantity || 0));

  if (!current) throw new Error(`Inventory SKU not found: ${localSku}`);
  if (!qty) throw new Error('Inventory quantity must be greater than 0.');

  if (movementType === 'RESERVED' && available < qty) {
    throw new Error(`Insufficient available stock for ${localSku}. Available: ${available}, required: ${qty}`);
  }

  if (movementType === 'OUT' && stock < qty) {
    throw new Error(`Insufficient stock for ${localSku}. Current: ${stock}, required: ${qty}`);
  }
}

async function applyOnce(payload = {}, userId = null) {
  const sku = normalSku(payload.sku);
  const movementType = clean(payload.movement_type || payload.type).toUpperCase();
  const referenceType = clean(payload.reference_type || 'ORDER_SYNC').toUpperCase();
  const referenceId = clean(payload.reference_id || '');

  if (!sku || !movementType || !referenceId) return { skipped: true, reason: 'missing_reference_or_sku' };

  const exists = await movementExists({ reference_type: referenceType, reference_id: referenceId, sku, movement_type: movementType });
  if (exists) return { skipped: true, reason: 'duplicate_movement' };

  const quantity = payload.quantity || payload.qty || payload.qty_change;

  if (movementType === 'OUT') {
    const reservedExists = await movementExists({ reference_type: referenceType, reference_id: referenceId, sku, movement_type: 'RESERVED' });
    const releasedExists = await movementExists({ reference_type: referenceType, reference_id: referenceId, sku, movement_type: 'RELEASED' });
    if (reservedExists && !releasedExists) {
      await inventoryModel.applyStockAdjustment({
        sku,
        movement_type: 'RELEASED',
        quantity,
        reference_type: referenceType,
        reference_id: referenceId,
        note: payload.note ? `${payload.note} - reserve converted` : 'Reserved stock converted to out',
      }, userId);
    }
  }

  if (movementType === 'OUT' || movementType === 'RESERVED') {
    await ensureStockAvailable(sku, quantity, movementType);
  }

  return inventoryModel.applyStockAdjustment({
    sku,
    movement_type: movementType,
    quantity,
    reference_type: referenceType,
    reference_id: referenceId,
    note: payload.note || null,
  }, userId);
}

async function resolveLocalSku({ platform, account_id, account_code, marketplace_sku }) {
  const marketplaceSku = clean(marketplace_sku);
  if (!marketplaceSku) return '';

  const mapping = await skuMappingModel.findMatch({
    platform,
    account_id,
    account_code,
    marketplace_sku: marketplaceSku,
  }).catch(() => null);

  return normalSku(mapping?.local_sku || marketplaceSku);
}

async function applyMarketplaceOrderInventory({ platform, account = {}, order = {}, items = [], status, userId = null }) {
  const output = [];
  const orderStatus = clean(status || order.local_status || order.status || order.daraz_status || order.order_status || 'pending');
  const referenceType = `${clean(platform).toUpperCase()}_ORDER`;
  const orderRef = clean(order.order_no || order.order_number || order.daraz_order_id || order.woo_order_id || order.order_id || order.id);

  if (!orderRef || !Array.isArray(items) || !items.length) return output;

  let movementType = 'RESERVED';
  if (isCancelLike(orderStatus)) movementType = 'RELEASED';
  else if (isOutLike(orderStatus)) movementType = 'OUT';
  else if (isPendingLike(orderStatus)) movementType = 'RESERVED';

  for (const item of items) {
    const marketplaceSku = clean(item.seller_sku || item.marketplace_sku || item.sku || item.shop_sku || item.SellerSku);
    const qty = Math.abs(Number(item.quantity || item.qty || item.item_quantity || item.Qty || 1));
    const localSku = await resolveLocalSku({
      platform,
      account_id: account.account_id || account.id || item.account_id,
      account_code: account.account_code || item.account_code,
      marketplace_sku: marketplaceSku,
    });

    if (!localSku || !qty) continue;

    output.push(await applyOnce({
      sku: localSku,
      movement_type: movementType,
      quantity: qty,
      reference_type: referenceType,
      reference_id: `${orderRef}:${marketplaceSku}`,
      note: `${platform} order ${orderRef} ${orderStatus}`,
    }, userId).catch((error) => ({ error: error.message, sku: localSku, marketplace_sku: marketplaceSku })));
  }

  return output;
}

async function applyManualOrderInventory({ orderId, items = [], status = 'Pending', userId = null }) {
  const output = [];
  if (!orderId || !Array.isArray(items) || !items.length) return output;

  let movementType = 'RESERVED';
  if (isCancelLike(status)) movementType = 'RELEASED';
  else if (isOutLike(status)) movementType = 'OUT';
  else if (isPendingLike(status)) movementType = 'RESERVED';

  for (const item of items) {
    const sku = normalSku(item.local_sku || item.sku || item.product_sku);
    const qty = Math.abs(Number(item.quantity || item.qty || 1));
    if (!sku || !qty) continue;

    output.push(await applyOnce({
      sku,
      movement_type: movementType,
      quantity: qty,
      reference_type: 'MANUAL_ORDER',
      reference_id: `${orderId}:${sku}`,
      note: `Manual order ${orderId} ${status}`,
    }, userId));
  }

  return output;
}

module.exports = {
  applyOnce,
  resolveLocalSku,
  applyMarketplaceOrderInventory,
  applyManualOrderInventory,
};
