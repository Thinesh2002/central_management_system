const db = require("../../config/order_management_db/cm_order_management");
const orderModel = require("./order_model");
const orderLogModel = require("./order_log_model");
const {
  toMoney,
  toInt,
  cleanString,
  buildSetClause,
  normalizeItemPayload,
} = require("../../utils/order_management/orderHelpers");

function notFound(message = "Order item not found") {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function getItemById(itemId, connection = db, includeDeleted = false) {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM order_items
      WHERE id = ? ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      LIMIT 1
    `,
    [itemId]
  );

  return rows[0] || null;
}

async function listItemsByOrderId(orderId, options = {}) {
  const includeDeleted = Boolean(options.include_deleted);

  const [rows] = await db.query(
    `
      SELECT *
      FROM order_items
      WHERE order_id = ? ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      ORDER BY id ASC
    `,
    [orderId]
  );

  return rows;
}

async function createOrderItem(orderId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const order = await orderModel.getOrderById(orderId);
    if (!order) throw notFound("Order not found");

    const item = normalizeItemPayload(payload, true);

    const [result] = await connection.query(
      `
        INSERT INTO order_items
          (order_id, sku, product_name, description, quantity, unit_price, item_total, item_status, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        item.sku,
        item.product_name,
        item.description,
        item.quantity,
        item.unit_price,
        item.item_total,
        item.item_status,
        userCode,
        userCode,
      ]
    );

    const newItem = await getItemById(result.insertId, connection, false);
    await orderModel.recalculateOrderTotals(orderId, connection);

    await orderLogModel.createLog(
      {
        order_id: orderId,
        table_name: "order_items",
        record_id: String(result.insertId),
        action: "CREATE",
        old_data: null,
        new_data: newItem,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();
    return newItem;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function normalizeItemUpdatePayload(payload = {}) {
  const normalized = {};

  if (payload.sku !== undefined) normalized.sku = cleanString(payload.sku);
  if (payload.product_name !== undefined) normalized.product_name = cleanString(payload.product_name);
  if (payload.description !== undefined) normalized.description = cleanString(payload.description);
  if (payload.quantity !== undefined) normalized.quantity = Math.max(1, toInt(payload.quantity, 1));
  if (payload.unit_price !== undefined) normalized.unit_price = toMoney(payload.unit_price, 0);
  if (payload.item_status !== undefined) normalized.item_status = cleanString(payload.item_status) || "Active";

  if (
    normalized.quantity !== undefined ||
    normalized.unit_price !== undefined ||
    payload.item_total !== undefined
  ) {
    const quantity =
      normalized.quantity !== undefined
        ? normalized.quantity
        : toInt(payload.current_quantity, 1);

    const unitPrice =
      normalized.unit_price !== undefined
        ? normalized.unit_price
        : toMoney(payload.current_unit_price, 0);

    normalized.item_total =
      payload.item_total !== undefined
        ? toMoney(payload.item_total, quantity * unitPrice)
        : toMoney(quantity * unitPrice, 0);
  }

  return normalized;
}

async function updateOrderItem(itemId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldItem = await getItemById(itemId, connection, false);
    if (!oldItem) throw notFound();

    const updateData = normalizeItemUpdatePayload({
      ...payload,
      current_quantity: oldItem.quantity,
      current_unit_price: oldItem.unit_price,
    });

    updateData.updated_by = userCode;

    const { clause, values } = buildSetClause(updateData);
    if (!clause) throw badRequest("No valid order item fields to update");

    await connection.query(
      `UPDATE order_items SET ${clause} WHERE id = ? AND deleted_at IS NULL`,
      [...values, itemId]
    );

    const newItem = await getItemById(itemId, connection, false);
    await orderModel.recalculateOrderTotals(oldItem.order_id, connection);

    await orderLogModel.createLog(
      {
        order_id: oldItem.order_id,
        table_name: "order_items",
        record_id: String(itemId),
        action: oldItem.item_status !== newItem.item_status ? "STATUS_CHANGE" : "UPDATE",
        old_data: oldItem,
        new_data: newItem,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();
    return newItem;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function softDeleteOrderItem(itemId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldItem = await getItemById(itemId, connection, false);
    if (!oldItem) throw notFound();

    await connection.query(
      `
        UPDATE order_items
        SET item_status = 'Deleted', deleted_at = NOW(), deleted_by = ?, updated_by = ?
        WHERE id = ? AND deleted_at IS NULL
      `,
      [userCode, userCode, itemId]
    );

    const newItem = await getItemById(itemId, connection, true);
    await orderModel.recalculateOrderTotals(oldItem.order_id, connection);

    await orderLogModel.createLog(
      {
        order_id: oldItem.order_id,
        table_name: "order_items",
        record_id: String(itemId),
        action: "DELETE",
        old_data: oldItem,
        new_data: newItem,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();
    return newItem;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function restoreOrderItem(itemId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldItem = await getItemById(itemId, connection, true);
    if (!oldItem) throw notFound();
    if (!oldItem.deleted_at) throw badRequest("Order item is not deleted");

    await connection.query(
      `
        UPDATE order_items
        SET item_status = 'Active', deleted_at = NULL, deleted_by = NULL, updated_by = ?
        WHERE id = ?
      `,
      [userCode, itemId]
    );

    const newItem = await getItemById(itemId, connection, false);
    await orderModel.recalculateOrderTotals(oldItem.order_id, connection);

    await orderLogModel.createLog(
      {
        order_id: oldItem.order_id,
        table_name: "order_items",
        record_id: String(itemId),
        action: "RESTORE",
        old_data: oldItem,
        new_data: newItem,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();
    return newItem;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getItemById,
  listItemsByOrderId,
  createOrderItem,
  updateOrderItem,
  softDeleteOrderItem,
  restoreOrderItem,
};