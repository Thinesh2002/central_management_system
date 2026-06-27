const db = require("../../config/order_management_db/cm_order_management");
const orderLogModel = require("./order_log_model");
const {
  toMoney,
  toInt,
  cleanString,
  cleanRequiredString,
  pickAllowedFields,
  buildSetClause,
  normalizeItemPayload,
} = require("../../utils/order_management/orderHelpers");

const ORDER_FIELDS = [
  "order_id",
  "order_type",
  "customer_code",
  "customer_name",
  "customer_phone",
  "customer_phone_2",
  "customer_address",
  "customer_city",
  "customer_district",
  "customer_province",
  "payment_method",
  "order_status",
  "order_date",
  "due_date",
  "note",
  "item_total",
  "discount",
  "subtotal",
  "shipping_cost_actual",
  "shipping_cost_paid_by_buyer",
  "order_total",
  "paid_amount",
  "tracking_number",
  "created_by",
  "updated_by",
  "deleted_by",
  "created_at",
  "updated_at",
  "deleted_at",
];

const ORDER_UPDATE_FIELDS = [
  "order_type",
  "customer_code",
  "customer_name",
  "customer_phone",
  "customer_phone_2",
  "customer_address",
  "customer_city",
  "customer_district",
  "customer_province",
  "payment_method",
  "order_status",
  "order_date",
  "due_date",
  "note",
  "discount",
  "shipping_cost_actual",
  "shipping_cost_paid_by_buyer",
  "paid_amount",
  "tracking_number",
];

function notFound(message = "Order not found") {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function removeImageFields(item = {}) {
  const {
    image_url,
    imageUrl,
    product_image,
    productImage,
    product_image_url,
    productImageUrl,
    main_image,
    mainImage,
    thumbnail,
    thumbnail_url,
    thumbnailUrl,
    image,
    url,
    src,
    path,
    file_path,
    filePath,
    image_path,
    imagePath,
    ...safeItem
  } = item || {};

  return safeItem;
}

/**
 * Order ID format:
 * BH001
 * BH002
 * BH003
 */
function formatBhOrderId(number) {
  return `BH${String(Number(number || 1)).padStart(3, "0")}`;
}

/**
 * Finds latest BH order id from existing orders table
 * and creates next id.
 *
 * Example:
 * No order     -> BH001
 * Last BH001   -> BH002
 * Last BH009   -> BH010
 * Last BH099   -> BH100
 */
async function getNextBhOrderId(connection = db) {
  const [rows] = await connection.query(
    `
      SELECT order_id
      FROM orders
      WHERE order_id REGEXP '^BH[0-9]+$'
      ORDER BY CAST(SUBSTRING(order_id, 3) AS UNSIGNED) DESC
      LIMIT 1
    `
  );

  const lastOrderId = rows[0]?.order_id || "";
  const lastNumber = Number(String(lastOrderId).replace(/^BH/i, "")) || 0;

  return formatBhOrderId(lastNumber + 1);
}

function normalizeOrderPayload(payload = {}, userCode = null, isCreate = true) {
  const orderType = cleanString(payload.order_type) || "MANUAL";

  const normalized = {
    order_id: cleanString(payload.order_id),
    order_type: orderType,

    customer_code:
      payload.customer_code === undefined ||
      payload.customer_code === null ||
      payload.customer_code === ""
        ? null
        : toInt(payload.customer_code, null),

    customer_name: isCreate
      ? cleanRequiredString(payload.customer_name, "customer_name")
      : cleanString(payload.customer_name),

    customer_phone: isCreate
      ? cleanRequiredString(payload.customer_phone, "customer_phone")
      : cleanString(payload.customer_phone),

    customer_phone_2: cleanString(payload.customer_phone_2),

    customer_address: isCreate
      ? cleanRequiredString(payload.customer_address, "customer_address")
      : cleanString(payload.customer_address),

    customer_city: cleanString(payload.customer_city),
    customer_district: cleanString(payload.customer_district),
    customer_province: cleanString(payload.customer_province),

    payment_method: cleanString(payload.payment_method) || "COD",
    order_status: cleanString(payload.order_status) || "Pending",

    order_date: payload.order_date || null,
    due_date: payload.due_date || null,

    note: cleanString(payload.note),

    discount: toMoney(payload.discount, 0),
    shipping_cost_actual: toMoney(payload.shipping_cost_actual, 450),
    shipping_cost_paid_by_buyer: toMoney(payload.shipping_cost_paid_by_buyer, 0),
    paid_amount: toMoney(payload.paid_amount, 0),

    tracking_number: cleanString(payload.tracking_number),
  };

  if (isCreate) {
    normalized.created_by = userCode;
    normalized.updated_by = userCode;
  }

  return normalized;
}

function normalizeUpdatePayload(payload = {}) {
  const picked = pickAllowedFields(payload, ORDER_UPDATE_FIELDS);
  const normalized = {};

  if (picked.order_type !== undefined) {
    normalized.order_type = cleanString(picked.order_type) || "MANUAL";
  }

  if (picked.customer_code !== undefined) {
    normalized.customer_code =
      picked.customer_code === null || picked.customer_code === ""
        ? null
        : toInt(picked.customer_code, null);
  }

  if (picked.customer_name !== undefined) {
    normalized.customer_name = cleanString(picked.customer_name);
  }

  if (picked.customer_phone !== undefined) {
    normalized.customer_phone = cleanString(picked.customer_phone);
  }

  if (picked.customer_phone_2 !== undefined) {
    normalized.customer_phone_2 = cleanString(picked.customer_phone_2);
  }

  if (picked.customer_address !== undefined) {
    normalized.customer_address = cleanString(picked.customer_address);
  }

  if (picked.customer_city !== undefined) {
    normalized.customer_city = cleanString(picked.customer_city);
  }

  if (picked.customer_district !== undefined) {
    normalized.customer_district = cleanString(picked.customer_district);
  }

  if (picked.customer_province !== undefined) {
    normalized.customer_province = cleanString(picked.customer_province);
  }

  if (picked.payment_method !== undefined) {
    normalized.payment_method = cleanString(picked.payment_method) || "COD";
  }

  if (picked.order_status !== undefined) {
    normalized.order_status = cleanString(picked.order_status) || "Pending";
  }

  if (picked.order_date !== undefined) {
    normalized.order_date = picked.order_date || null;
  }

  if (picked.due_date !== undefined) {
    normalized.due_date = picked.due_date || null;
  }

  if (picked.note !== undefined) {
    normalized.note = cleanString(picked.note);
  }

  if (picked.discount !== undefined) {
    normalized.discount = toMoney(picked.discount, 0);
  }

  if (picked.shipping_cost_actual !== undefined) {
    normalized.shipping_cost_actual = toMoney(picked.shipping_cost_actual, 450);
  }

  if (picked.shipping_cost_paid_by_buyer !== undefined) {
    normalized.shipping_cost_paid_by_buyer = toMoney(
      picked.shipping_cost_paid_by_buyer,
      0
    );
  }

  if (picked.paid_amount !== undefined) {
    normalized.paid_amount = toMoney(picked.paid_amount, 0);
  }

  if (picked.tracking_number !== undefined) {
    normalized.tracking_number = cleanString(picked.tracking_number);
  }

  return normalized;
}

async function recalculateOrderTotals(orderId, connection = db) {
  const [[itemSummary]] = await connection.query(
    `
      SELECT COALESCE(SUM(item_total), 0) AS item_total
      FROM order_items
      WHERE order_id = ?
        AND deleted_at IS NULL
        AND item_status = 'Active'
    `,
    [orderId]
  );

  const [[orderRow]] = await connection.query(
    `
      SELECT discount, shipping_cost_paid_by_buyer
      FROM orders
      WHERE order_id = ?
      LIMIT 1
    `,
    [orderId]
  );

  if (!orderRow) throw notFound();

  const itemTotal = toMoney(itemSummary.item_total, 0);
  const discount = toMoney(orderRow.discount, 0);
  const subtotal = Math.max(0, toMoney(itemTotal - discount, 0));
  const orderTotal = toMoney(
    subtotal + toMoney(orderRow.shipping_cost_paid_by_buyer, 0),
    0
  );

  await connection.query(
    `
      UPDATE orders
      SET item_total = ?, subtotal = ?, order_total = ?
      WHERE order_id = ?
    `,
    [itemTotal, subtotal, orderTotal, orderId]
  );

  return {
    item_total: itemTotal,
    discount,
    subtotal,
    shipping_cost_paid_by_buyer: toMoney(orderRow.shipping_cost_paid_by_buyer, 0),
    order_total: orderTotal,
  };
}

function buildOrderWhere(filters = {}) {
  const where = [];
  const values = [];

  if (!filters.include_deleted) {
    where.push("o.deleted_at IS NULL");
  }

  if (filters.order_type) {
    where.push("o.order_type = ?");
    values.push(filters.order_type);
  }

  if (filters.order_status) {
    where.push("o.order_status = ?");
    values.push(filters.order_status);
  }

  if (filters.payment_method) {
    where.push("o.payment_method = ?");
    values.push(filters.payment_method);
  }

  if (filters.customer_code) {
    where.push("o.customer_code = ?");
    values.push(filters.customer_code);
  }

  if (filters.from_date) {
    where.push("DATE(o.order_date) >= ?");
    values.push(filters.from_date);
  }

  if (filters.to_date) {
    where.push("DATE(o.order_date) <= ?");
    values.push(filters.to_date);
  }

  if (filters.search) {
    const search = `%${filters.search}%`;

    where.push(`
      (
        o.order_id LIKE ? OR
        o.customer_name LIKE ? OR
        o.customer_phone LIKE ? OR
        o.tracking_number LIKE ? OR
        EXISTS (
          SELECT 1
          FROM order_items oi_search
          WHERE oi_search.order_id = o.order_id
            AND oi_search.deleted_at IS NULL
            AND (
              oi_search.sku LIKE ? OR
              oi_search.product_name LIKE ?
            )
        )
      )
    `);

    values.push(search, search, search, search, search, search);
  }

  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

async function listOrders(filters = {}) {
  const page = Math.max(Number(filters.page || 1), 1);
  const limit = Math.min(Math.max(Number(filters.limit || 25), 1), 200);
  const offset = (page - 1) * limit;

  const { clause, values } = buildOrderWhere(filters);

  const [[countRow]] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM orders o
      ${clause}
    `,
    values
  );

  const [rows] = await db.query(
    `
      SELECT
        o.*,

        (
          SELECT COUNT(*)
          FROM order_items oi_count
          WHERE oi_count.order_id = o.order_id
            AND oi_count.deleted_at IS NULL
        ) AS item_count,

        (
          SELECT oi_sku.sku
          FROM order_items oi_sku
          WHERE oi_sku.order_id = o.order_id
            AND oi_sku.deleted_at IS NULL
          ORDER BY oi_sku.id ASC
          LIMIT 1
        ) AS first_sku,

        (
          SELECT oi_name.product_name
          FROM order_items oi_name
          WHERE oi_name.order_id = o.order_id
            AND oi_name.deleted_at IS NULL
          ORDER BY oi_name.id ASC
          LIMIT 1
        ) AS first_product_name

      FROM orders o
      ${clause}
      ORDER BY o.order_date DESC, o.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...values, limit, offset]
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: Number(countRow.total || 0),
      total_pages: Math.ceil(Number(countRow.total || 0) / limit),
    },
  };
}

async function getOrderOnly(orderId, connection = db, includeDeleted = false) {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM orders
      WHERE order_id = ?
      ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      LIMIT 1
    `,
    [orderId]
  );

  return rows[0] || null;
}

async function getOrderById(orderId, options = {}) {
  const includeDeleted = Boolean(options.include_deleted);
  const order = await getOrderOnly(orderId, db, includeDeleted);

  if (!order) return null;

  const [items] = await db.query(
    `
      SELECT *
      FROM order_items
      WHERE order_id = ?
      ${includeDeleted ? "" : "AND deleted_at IS NULL"}
      ORDER BY id ASC
    `,
    [orderId]
  );

  return {
    ...order,
    items,
  };
}

async function createOrder(payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const orderData = normalizeOrderPayload(payload, userCode, true);

    if (!orderData.order_id) {
      orderData.order_id = await getNextBhOrderId(connection);
    }

    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!items.length) {
      throw badRequest("At least one order item is required");
    }

    const columns = [
      "order_id",
      "order_type",
      "customer_code",
      "customer_name",
      "customer_phone",
      "customer_phone_2",
      "customer_address",
      "customer_city",
      "customer_district",
      "customer_province",
      "payment_method",
      "order_status",
      "order_date",
      "due_date",
      "note",
      "discount",
      "shipping_cost_actual",
      "shipping_cost_paid_by_buyer",
      "paid_amount",
      "tracking_number",
      "created_by",
      "updated_by",
    ];

    await connection.query(
      `
        INSERT INTO orders (${columns.map((col) => `\`${col}\``).join(", ")})
        VALUES (${columns.map(() => "?").join(", ")})
      `,
      columns.map((column) => orderData[column])
    );

    const insertedItems = [];

    for (const item of items) {
      const normalizedItem = removeImageFields(normalizeItemPayload(item, true));

      const [result] = await connection.query(
        `
          INSERT INTO order_items
            (
              order_id,
              sku,
              product_name,
              description,
              quantity,
              unit_price,
              item_total,
              item_status,
              created_by,
              updated_by
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderData.order_id,
          normalizedItem.sku,
          normalizedItem.product_name,
          normalizedItem.description,
          normalizedItem.quantity,
          normalizedItem.unit_price,
          normalizedItem.item_total,
          normalizedItem.item_status,
          userCode,
          userCode,
        ]
      );

      const insertedItem = {
        id: result.insertId,
        ...normalizedItem,
      };

      insertedItems.push(insertedItem);

      await orderLogModel.createLog(
        {
          order_id: orderData.order_id,
          table_name: "order_items",
          record_id: String(result.insertId),
          action: "CREATE",
          old_data: null,
          new_data: {
            id: result.insertId,
            order_id: orderData.order_id,
            ...normalizedItem,
          },
          changed_by: userCode,
          reason: payload.reason || null,
        },
        connection
      );
    }

    const totals = await recalculateOrderTotals(orderData.order_id, connection);
    const newData = {
      ...orderData,
      ...totals,
      items: insertedItems,
    };

    await orderLogModel.createLog(
      {
        order_id: orderData.order_id,
        table_name: "orders",
        record_id: orderData.order_id,
        action: "CREATE",
        old_data: null,
        new_data: newData,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();

    return getOrderById(orderData.order_id);
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      error.statusCode = 409;
      error.message = "Order ID already exists";
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function updateOrder(orderId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldOrder = await getOrderOnly(orderId, connection, false);

    if (!oldOrder) {
      throw notFound();
    }

    const updateData = normalizeUpdatePayload(payload);
    updateData.updated_by = userCode;

    const { clause, values } = buildSetClause(updateData);

    if (!clause) {
      throw badRequest("No valid order fields to update");
    }

    await connection.query(
      `
        UPDATE orders
        SET ${clause}
        WHERE order_id = ?
          AND deleted_at IS NULL
      `,
      [...values, orderId]
    );

    await recalculateOrderTotals(orderId, connection);

    const newOrder = await getOrderOnly(orderId, connection, false);

    await orderLogModel.createLog(
      {
        order_id: orderId,
        table_name: "orders",
        record_id: orderId,
        action:
          oldOrder.order_status !== newOrder.order_status
            ? "STATUS_CHANGE"
            : "UPDATE",
        old_data: oldOrder,
        new_data: newOrder,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();

    return getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateOrderStatus(orderId, payload = {}, userCode = null) {
  if (!payload.order_status) {
    throw badRequest("order_status is required");
  }

  return updateOrder(
    orderId,
    {
      order_status: payload.order_status,
      tracking_number: payload.tracking_number,
      reason: payload.reason,
    },
    userCode
  );
}

async function softDeleteOrder(orderId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldOrder = await getOrderOnly(orderId, connection, false);

    if (!oldOrder) {
      throw notFound();
    }

    await connection.query(
      `
        UPDATE orders
        SET
          deleted_at = NOW(),
          deleted_by = ?,
          updated_by = ?
        WHERE order_id = ?
          AND deleted_at IS NULL
      `,
      [userCode, userCode, orderId]
    );

    const newOrder = await getOrderOnly(orderId, connection, true);

    await orderLogModel.createLog(
      {
        order_id: orderId,
        table_name: "orders",
        record_id: orderId,
        action: "DELETE",
        old_data: oldOrder,
        new_data: newOrder,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();

    return newOrder;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function restoreOrder(orderId, payload = {}, userCode = null) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const oldOrder = await getOrderOnly(orderId, connection, true);

    if (!oldOrder) {
      throw notFound();
    }

    if (!oldOrder.deleted_at) {
      throw badRequest("Order is not deleted");
    }

    await connection.query(
      `
        UPDATE orders
        SET
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = ?
        WHERE order_id = ?
      `,
      [userCode, orderId]
    );

    const newOrder = await getOrderOnly(orderId, connection, false);

    await orderLogModel.createLog(
      {
        order_id: orderId,
        table_name: "orders",
        record_id: orderId,
        action: "RESTORE",
        old_data: oldOrder,
        new_data: newOrder,
        changed_by: userCode,
        reason: payload.reason || null,
      },
      connection
    );

    await connection.commit();

    return getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getDashboardSummary(filters = {}) {
  const { clause, values } = buildOrderWhere(filters);

  const [rows] = await db.query(
    `
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(order_total), 0) AS total_sales,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COALESCE(SUM(order_total - paid_amount), 0) AS total_balance,
        COALESCE(SUM(shipping_cost_actual), 0) AS actual_shipping_cost,
        COALESCE(SUM(shipping_cost_paid_by_buyer), 0) AS buyer_shipping_paid,

        SUM(order_status = 'Pending') AS pending_orders,
        SUM(order_status = 'Processing') AS processing_orders,
        SUM(order_status = 'In Progress') AS in_progress_orders,
        SUM(order_status = 'Confirmed') AS confirmed_orders,
        SUM(order_status = 'Packed') AS packed_orders,
        SUM(order_status = 'Ready To Ship') AS ready_to_ship_orders,
        SUM(order_status = 'Shipped') AS shipped_orders,
        SUM(order_status = 'Delivered') AS delivered_orders,
        SUM(order_status = 'Cancelled') AS cancelled_orders,
        SUM(order_status = 'Returned') AS returned_orders,
        SUM(order_status = 'Failed') AS failed_orders
      FROM orders o
      ${clause}
    `,
    values
  );

  return rows[0];
}

module.exports = {
  ORDER_FIELDS,
  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  softDeleteOrder,
  restoreOrder,
  recalculateOrderTotals,
  getDashboardSummary,
};