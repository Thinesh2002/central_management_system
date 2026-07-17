const { createGenericModel, db } = require("./_shared/generic_table_model");
const customerModel = require("./customer_model");

const orderModel = createGenericModel("woo_orders");
const itemModel = createGenericModel("woo_order_items");

function fullName(person = {}) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || null;
}

function mapOrderPayload(order = {}, account = {}, customerId = null) {
  const billing = order.billing || {};
  const shipping = order.shipping || {};
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

  return {
    account_id: account.id,
    account_code: account.account_code,
    account_name: account.account_name,
    customer_id: customerId,
    woo_order_id: order.id,
    order_number: order.number,
    order_status: order.status,
    payment_method: order.payment_method_title || order.payment_method,
    order_date: order.date_created,
    created_time: order.date_created,
    updated_time: order.date_modified,
    item_total: lineItems.reduce((sum, item) => sum + Number(item.subtotal || item.total || 0), 0),
    discount_total: order.discount_total,
    shipping_fee: order.shipping_total,
    grand_total: order.total,
    currency: order.currency,
    buyer_name: fullName(billing) || fullName(shipping),
    buyer_phone: billing.phone,
    buyer_email: billing.email,
    shipping_name: fullName(shipping) || fullName(billing),
    shipping_address: [shipping.address_1, shipping.address_2].filter(Boolean).join(", ") || null,
    shipping_city: shipping.city,
    shipping_region: shipping.state,
    raw_payload: JSON.stringify(order),
    last_synced_at: new Date(),
  };
}

// Unlike Daraz (one row per unit purchased, forced qty: 1), WooCommerce's
// line_items already carry a real per-line quantity - used as-is both for
// the stored qty column and for the inventory deduction amount.
function mapItemPayload(item = {}, localOrderId) {
  return {
    woo_order_id: localOrderId,
    woo_line_item_id: item.id,
    product_id: item.product_id,
    seller_sku: item.sku,
    local_sku: item.sku,
    product_title: item.name,
    variation_name: item.variation_id ? String(item.variation_id) : null,
    product_image_url: item.image?.src || null,
    qty: item.quantity,
    unit_price: item.price,
    discount_amount: Number(item.subtotal || 0) - Number(item.total || 0),
    line_total: item.total,
    raw_payload: JSON.stringify(item),
  };
}

async function upsertOrder(order, account) {
  const existingRows = await orderModel.findByColumn("woo_order_id", order.id);
  const billing = order.billing || {};
  const shipping = order.shipping || {};

  const customerId = await customerModel.findOrCreateFromMarketplaceOrder({
    phone: billing.phone,
    name: fullName(billing) || fullName(shipping),
    shipping: {
      address1: shipping.address_1 || billing.address_1,
      address2: shipping.address_2 || billing.address_2,
      city: shipping.city || billing.city,
      post_code: shipping.postcode || billing.postcode,
      country: shipping.country || billing.country,
    },
    sourceType: "WOO",
    account,
  });

  const payload = mapOrderPayload(order, account, customerId);

  if (existingRows.length) {
    return orderModel.update(existingRows[0].id, payload);
  }

  return orderModel.create(payload);
}

// Returns the items that were genuinely new this call (not previously
// synced) - the caller uses this to trigger inventory deduction exactly
// once per order item, never again on re-sync/status-change updates.
async function upsertItems(items = [], localOrderId) {
  const [existingRows] = await db.query(
    "SELECT * FROM woo_order_items WHERE woo_order_id = ?",
    [localOrderId]
  );

  const newlyCreated = [];

  for (const item of items) {
    const payload = mapItemPayload(item, localOrderId);

    const matching =
      existingRows.find((row) => row.woo_line_item_id && String(row.woo_line_item_id) === String(item.id)) ||
      existingRows.find((row) => String(row.seller_sku || row.local_sku) === String(item.sku));

    if (matching) {
      await itemModel.update(matching.id, payload);
    } else {
      await itemModel.create(payload);
      newlyCreated.push({
        order_item_id: item.id,
        sku: item.sku,
        qty: Number(item.quantity || 1),
      });
    }
  }

  return newlyCreated;
}

module.exports = { upsertOrder, upsertItems };
