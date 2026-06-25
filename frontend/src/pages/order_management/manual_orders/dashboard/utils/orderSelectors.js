import { titleFromProduct } from "./orderFrontendHelpers";
import { keyValue, parseArray, pick } from "./commonManualOrderUtils";

export function getOrderId(order = {}) {
  return pick(
    order.order_id,
    order.manual_order_id,
    order.order_no,
    order.order_number,
    order.id
  );
}

export function getOrderItems(order = {}) {
  const values = [
    order.items,
    order.order_items,
    order.orderItems,
    order.products,
    order.order_products,
    order.orderProducts,
    order.items_json,
    order.order_items_json,
    order.orderItemsJson,
  ];

  for (const value of values) {
    const list = parseArray(value);
    if (list.length) return list;
  }

  return [];
}

export function getFirstItem(order = {}) {
  const items = getOrderItems(order);

  if (items.length) return items[0];

  return {
    sku: pick(
      order.first_sku,
      order.firstSku,
      order.sku,
      order.SKU,
      order.product_sku,
      order.productSku,
      order.item_sku,
      order.itemSku,
      order.variant_sku,
      order.variantSku,
      order.child_sku,
      order.childSku,
      order.local_sku,
      order.localSku
    ),
    product_name: pick(
      order.first_product_name,
      order.firstProductName,
      order.product_name,
      order.productName,
      order.product_title,
      order.productTitle,
      order.first_item_name,
      order.firstItemName,
      order.title,
      order.name
    ),
  };
}

export function getOrderSku(order = {}) {
  const item = getFirstItem(order);

  return pick(
    item.sku,
    item.SKU,
    item.product_sku,
    item.productSku,
    item.variant_sku,
    item.variantSku,
    item.child_sku,
    item.childSku,
    item.local_sku,
    item.localSku,
    item.selected_sku,
    item.selectedSku,
    item.item_sku,
    item.itemSku,
    order.first_sku,
    order.firstSku,
    order.sku,
    order.SKU,
    order.product_sku,
    order.productSku,
    order.variant_sku,
    order.variantSku,
    order.child_sku,
    order.childSku,
    order.local_sku,
    order.localSku,
    "-"
  );
}

export function getOrderTitle(order = {}) {
  const item = getFirstItem(order);

  return pick(
    item.product_name,
    item.productName,
    item.product_title,
    item.productTitle,
    item.name,
    item.title,
    order.first_product_name,
    order.firstProductName,
    order.product_name,
    order.productName,
    order.product_title,
    order.productTitle,
    order.title,
    "Manual Order Product"
  );
}

export function getOrderStatus(order = {}) {
  return pick(order.order_status, order.status, order.current_status, "Pending");
}

export function getOrderDate(order = {}) {
  return pick(order.order_date, order.created_at, order.date);
}

export function getCustomerName(order = {}) {
  return pick(
    order.customer_name,
    order.buyer_name,
    order.name,
    order.full_name,
    "-"
  );
}

export function getCustomerPhone(order = {}) {
  return pick(
    order.customer_phone,
    order.phone,
    order.mobile,
    order.contact_number,
    "-"
  );
}

export function getPaymentMethod(order = {}) {
  return pick(order.payment_method, order.paymentMethod, order.payment, "-");
}

export function getOrderTotal(order = {}) {
  return Number(
    pick(
      order.order_total,
      order.total_amount,
      order.grand_total,
      order.total,
      order.amount,
      0
    )
  );
}

export function getItemCount(order = {}) {
  const items = getOrderItems(order);

  return Number(
    pick(
      order.item_count,
      order.items_count,
      order.total_items,
      order.product_count,
      items.length,
      1
    )
  );
}

export function getProductTitle(order = {}, productMap = {}) {
  const sku = getOrderSku(order);
  const productData = productMap[keyValue(sku)];
  const product = productData?.product;

  return pick(product ? titleFromProduct(product) : "", getOrderTitle(order));
}

export function getProductImage(order = {}, productMap = {}) {
  const sku = getOrderSku(order);
  const productData = productMap[keyValue(sku)];

  return pick(productData?.image_url);
}
