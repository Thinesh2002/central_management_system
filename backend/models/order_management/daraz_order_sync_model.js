const { createGenericModel, db } = require("./_shared/generic_table_model");

const orderModel = createGenericModel("daraz_orders");
const itemModel = createGenericModel("daraz_order_items");

function fullName(order = {}) {
  return [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ").trim() || null;
}

function mapOrderPayload(order = {}, account = {}) {
  const shipping = order.address_shipping || {};

  return {
    order_number: order.order_number,
    daraz_order_id: order.order_id,
    order_date: order.created_at,
    order_status: (Array.isArray(order.statuses) && order.statuses[0]) || order.status || null,
    account_name: account.account_name,
    buyer_name: fullName(order),
    grand_total: order.price,
    customer_name: fullName(order),
    customer_phone: shipping.phone,
    payment_method: order.payment_method,
    shipping_fee: order.shipping_fee,
    discount_total: order.voucher,
    shipping_address_line1: shipping.address1,
    shipping_address_line2: shipping.address2,
    shipping_city: shipping.city,
    shipping_postal_code: shipping.post_code,
    shipping_country: shipping.country,
  };
}

// Daraz's item model is one row per unit purchased (not a qty column), so
// each synced line stays qty: 1 — matching how the rest of this codebase
// already sums qty across rows rather than trusting a single count field.
function mapItemPayload(item = {}, localOrderId) {
  return {
    daraz_order_id: localOrderId,
    daraz_order_item_id: item.order_item_id,
    order_item_id: item.order_item_id,
    qty: 1,
    unit_price: item.item_price,
    discount_amount: Number(item.voucher_amount || 0) + Number(item.voucher_seller || 0),
    line_total: item.paid_price,
    item_status: item.status,
    product_title: item.name,
    variation_name: item.variation,
    seller_sku: item.shop_sku,
    local_sku: item.sku,
    marketplace_sku: item.sku,
    product_image_url: item.product_main_image,
    product_main_image: item.product_main_image,
    package_id: item.package_id,
    waybill_id: item.package_id,
    tracking_number: item.tracking_code,
  };
}

async function upsertOrder(order, account) {
  const existingRows = await orderModel.findByColumn("daraz_order_id", order.order_id);
  const payload = mapOrderPayload(order, account);

  if (existingRows.length) {
    return orderModel.update(existingRows[0].id, payload);
  }

  return orderModel.create(payload);
}

// Returns the items that were genuinely new this call (not previously
// synced) — the caller uses this to trigger inventory deduction exactly
// once per order item, never again on re-sync/status-change updates.
async function upsertItems(items = [], localOrderId) {
  const [existingRows] = await db.query(
    "SELECT * FROM daraz_order_items WHERE daraz_order_id = ?",
    [localOrderId]
  );

  const newlyCreated = [];

  for (const item of items) {
    const payload = mapItemPayload(item, localOrderId);

    const matching =
      existingRows.find((row) => {
        const candidateId = row.daraz_order_item_id ?? row.order_item_id;
        return candidateId && String(candidateId) === String(item.order_item_id);
      }) || existingRows.find((row) => String(row.marketplace_sku || row.local_sku) === String(item.sku));

    if (matching) {
      await itemModel.update(matching.id, payload);
    } else {
      await itemModel.create(payload);
      newlyCreated.push({
        order_item_id: item.order_item_id,
        sku: item.shop_sku || item.sku,
        qty: 1,
      });
    }
  }

  const firstWithPackage = items.find((item) => item.package_id);

  if (firstWithPackage) {
    await orderModel.update(localOrderId, {
      waybill_id: firstWithPackage.package_id,
      tracking_number: firstWithPackage.tracking_code,
    });
  }

  return newlyCreated;
}

module.exports = { upsertOrder, upsertItems };
