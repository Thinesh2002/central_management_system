const Order = require("../../models/Order/OrderModel");
const Item = require("../../models/Order/order_item_model");
const Inventory = require("../../models/product/inventory_model");
const db = require("../../config/db");

const ALLOWED_STATUS = ["PENDING", "PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

/* ================= CREATE ORDER ================= */
const create = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { order, items } = req.body;

    if (!order || !order.order_id) {
      throw new Error("Order data with order_id is required");
    }

    const itemsSubtotal = items.reduce((sum, item) => {
      return sum + (Number(item.price || 0) * Number(item.quantity || 1));
    }, 0);

    // Final Total = Items Total + Buyer Paid Shipping Fee
    const finalGrandTotal = itemsSubtotal + Number(order.buyer_paid_shipping_fee || 0);

    // Default values set panrom
    const orderData = {
      ...order,
      total_amount: finalGrandTotal, // Ippo quantity multiply aana total price inga store aagum
      shipping_fee: order.shipping_fee || 0,
      buyer_paid_shipping_fee: order.buyer_paid_shipping_fee || 0,
      status: order.status || "PENDING"
    };

    // 1. Main Order Create panrom
    const orderId = await Order.createOrder(orderData, connection);

    // 2. Items processing
    if (items?.length) {
      for (const item of items) {
        if (!item.sku || !item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid data for SKU: ${item.sku || 'Unknown'}`);
        }

        // Item-ah add panrom (Unit Price-ah store panrom)
        await Item.addOrderItem({
          order_id: orderId,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price || 0,
        }, connection);

        // Inventory-la stock kuraikirom
        const invRes = await Inventory.reduceStock(item.sku, item.quantity, connection);

        if (invRes.affectedRows === 0) {
          throw new Error(`Insufficient stock for SKU ${item.sku}`);
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      order_id: orderId,
      message: "Order created & inventory updated",
    });

  } catch (err) {
    await connection.rollback();
    console.error("ORDER CREATE ERROR:", err.message);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
};

/* ================= UPDATE ORDER ================= */
const update = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { order_id } = req.params;
    const { order, items } = req.body;

    if (order && Object.keys(order).length) {
      await Order.updateOrder(order_id, order, connection);
    }

    if (items?.length) {
      for (const item of items) {
        if (!item.id) continue;

        const oldItem = await Item.getOrderItemById(item.id);
        if (!oldItem) continue;

        const diff = item.quantity - oldItem.quantity;

        if (diff > 0) {
          const invRes = await Inventory.reduceStock(oldItem.sku, diff, connection);
          if (invRes.affectedRows === 0) {
            throw new Error(`Insufficient stock for SKU ${oldItem.sku}`);
          }
        } else if (diff < 0) {
          await Inventory.increaseStock(oldItem.sku, Math.abs(diff), connection);
        }

        await Item.updateOrderItem(item.id, item, connection);
      }
    }

    await connection.commit();
    res.json({ success: true, message: "Order updated successfully" });

  } catch (err) {
    await connection.rollback();
    console.error("ORDER UPDATE ERROR:", err);
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/* ================= VIEW & LIST METHODS ================= */

const list = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const orders = await Order.getOrders({ page: Number(page), limit: Number(limit) });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const view = async (req, res) => {
  try {
    const { order_id } = req.params;
    const order = await Order.getOrderById(order_id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const items = await Item.getOrderItems(order_id);
    res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;
    if (!ALLOWED_STATUS.includes(status)) return res.status(400).json({ message: "Invalid status" });
    await Order.updateOrderStatus(order_id, status);
    res.json({ success: true, message: "Order status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { order_id } = req.params;
    const order = await Order.getOrderById(order_id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (["SHIPPED", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot delete shipped or delivered orders" });
    }
    await Order.deleteOrder(order_id);
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { create, list, view, update, updateStatus, remove };