const db = require("../../config/supplier_management_db/supplier_management_db");

const ALLOWED_STATUSES = new Set([
  "draft",
  "pending",
  "approved",
  "sent",
  "partially_received",
  "received",
  "cancelled",
]);

// Forward-moving lifecycle, plus a pending -> draft walk-back and a
// cancel from any non-terminal state. No other backward transitions.
const ALLOWED_TRANSITIONS = {
  draft: ["pending", "cancelled"],
  pending: ["approved", "draft", "cancelled"],
  approved: ["sent", "cancelled"],
  sent: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

// Line items can only be edited before a PO leaves draft/pending -
// once approved it's considered sent to the supplier.
const EDITABLE_STATUSES = new Set(["draft", "pending"]);

// A GRN can only be raised against a PO that's actually been sent (or
// already partially received) - draft/pending/cancelled/received have
// nothing left to receive.
const RECEIVABLE_STATUSES = new Set(["approved", "sent", "partially_received"]);

const PO_NUMBER_PREFIX = "PO";

function clean(value) {
  return value === undefined || value === null ? null : String(value).trim() || null;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function toMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

async function nextPoNumber(connection = db) {
  const [rows] = await connection.query(
    `SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${PO_NUMBER_PREFIX}%`]
  );

  const lastNo = rows[0]?.po_number || "";
  const lastNumber = Number(String(lastNo).replace(PO_NUMBER_PREFIX, "")) || 0;
  const nextNumber = lastNumber + 1;

  return `${PO_NUMBER_PREFIX}${String(nextNumber).padStart(4, "0")}`;
}

async function previewNextNumber() {
  return nextPoNumber();
}

async function getItems(purchaseOrderId, connection = db) {
  const [rows] = await connection.query(
    `SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY id ASC`,
    [purchaseOrderId]
  );

  return rows;
}

async function list({ status, supplier_id: supplierId, search, limit = 100, offset = 0 } = {}) {
  const params = [];
  let whereSql = "WHERE po.deleted_at IS NULL";

  if (status && ALLOWED_STATUSES.has(status)) {
    whereSql += " AND po.status = ?";
    params.push(status);
  }

  if (supplierId) {
    whereSql += " AND po.supplier_id = ?";
    params.push(supplierId);
  }

  if (search) {
    whereSql += " AND (po.po_number LIKE ? OR s.name LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term);
  }

  const [rows] = await db.query(
    `SELECT po.*, s.name AS supplier_name,
            (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.purchase_order_id = po.id) AS item_count
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     ${whereSql}
     ORDER BY po.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id ${whereSql}`,
    params
  );

  return { rows, total: Number(countRows[0]?.total || 0) };
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT po.*, s.name AS supplier_name
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = ? AND po.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  const po = rows[0];
  if (!po) return null;

  po.items = await getItems(id);
  return po;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw badRequest("At least one line item is required.");
  }

  return items.map((item) => {
    const sku = clean(item.sku);
    const quantityOrdered = Number(item.quantity_ordered);
    const unitCost = toMoney(item.unit_cost);

    if (!sku) throw badRequest("Every line item needs a SKU.");
    if (!Number.isFinite(quantityOrdered) || quantityOrdered <= 0) {
      throw badRequest(`Quantity for ${sku} must be greater than 0.`);
    }

    return {
      sku,
      product_name: clean(item.product_name),
      quantity_ordered: quantityOrdered,
      unit_cost: unitCost,
      line_total: toMoney(quantityOrdered * unitCost),
    };
  });
}

async function insertItems(connection, purchaseOrderId, items) {
  const values = items.map((item) => [
    purchaseOrderId,
    item.sku,
    item.product_name,
    item.quantity_ordered,
    item.unit_cost,
    item.line_total,
  ]);

  await connection.query(
    `INSERT INTO purchase_order_items
       (purchase_order_id, sku, product_name, quantity_ordered, unit_cost, line_total)
     VALUES ?`,
    [values]
  );
}

async function create({
  supplier_id: supplierId,
  order_date: orderDate,
  expected_delivery_date: expectedDeliveryDate,
  currency,
  tax_amount: taxAmount,
  shipping_amount: shippingAmount,
  notes,
  items,
  created_by: createdBy = null,
}) {
  if (!supplierId) throw badRequest("Supplier is required.");

  const [supplierRows] = await db.query(
    `SELECT id FROM suppliers WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [supplierId]
  );
  if (!supplierRows[0]) throw badRequest("Supplier not found.");

  const normalizedItems = normalizeItems(items);
  const subtotal = toMoney(normalizedItems.reduce((sum, item) => sum + item.line_total, 0));
  const tax = toMoney(taxAmount);
  const shipping = toMoney(shippingAmount);
  const total = toMoney(subtotal + tax + shipping);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const poNumber = await nextPoNumber(connection);

    const [result] = await connection.query(
      `INSERT INTO purchase_orders
         (po_number, supplier_id, status, order_date, expected_delivery_date, currency,
          subtotal_amount, tax_amount, shipping_amount, total_amount, notes, created_by, updated_by)
       VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poNumber,
        supplierId,
        clean(orderDate) || new Date().toISOString().slice(0, 10),
        clean(expectedDeliveryDate),
        clean(currency) || "LKR",
        subtotal,
        tax,
        shipping,
        total,
        clean(notes),
        createdBy,
        createdBy,
      ]
    );

    await insertItems(connection, result.insertId, normalizedItems);
    await connection.commit();

    return findById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function update(
  id,
  {
    supplier_id: supplierId,
    order_date: orderDate,
    expected_delivery_date: expectedDeliveryDate,
    currency,
    tax_amount: taxAmount,
    shipping_amount: shippingAmount,
    notes,
    items,
    updated_by: updatedBy = null,
  }
) {
  const existing = await findById(id);
  if (!existing) return null;

  if (!EDITABLE_STATUSES.has(existing.status)) {
    throw badRequest(`A ${existing.status.replace(/_/g, " ")} purchase order can no longer be edited.`);
  }

  if (supplierId) {
    const [supplierRows] = await db.query(
      `SELECT id FROM suppliers WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [supplierId]
    );
    if (!supplierRows[0]) throw badRequest("Supplier not found.");
  }

  const normalizedItems = normalizeItems(items ?? existing.items);
  const subtotal = toMoney(normalizedItems.reduce((sum, item) => sum + item.line_total, 0));
  const tax = taxAmount !== undefined ? toMoney(taxAmount) : Number(existing.tax_amount);
  const shipping = shippingAmount !== undefined ? toMoney(shippingAmount) : Number(existing.shipping_amount);
  const total = toMoney(subtotal + tax + shipping);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE purchase_orders
       SET supplier_id = ?, order_date = ?, expected_delivery_date = ?, currency = ?,
           subtotal_amount = ?, tax_amount = ?, shipping_amount = ?, total_amount = ?,
           notes = ?, updated_by = ?
       WHERE id = ?`,
      [
        supplierId || existing.supplier_id,
        clean(orderDate) || existing.order_date,
        expectedDeliveryDate !== undefined ? clean(expectedDeliveryDate) : existing.expected_delivery_date,
        currency !== undefined ? clean(currency) || existing.currency : existing.currency,
        subtotal,
        tax,
        shipping,
        total,
        notes !== undefined ? clean(notes) : existing.notes,
        updatedBy,
        id,
      ]
    );

    await connection.query(`DELETE FROM purchase_order_items WHERE purchase_order_id = ?`, [id]);
    await insertItems(connection, id, normalizedItems);

    await connection.commit();
    return findById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateStatus(id, { status, updated_by: updatedBy = null }) {
  const existing = await findById(id);
  if (!existing) return null;

  if (!ALLOWED_STATUSES.has(status)) {
    throw badRequest("Invalid purchase order status.");
  }

  const allowedNext = ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowedNext.includes(status)) {
    throw badRequest(
      `Cannot move a ${existing.status.replace(/_/g, " ")} purchase order to ${status.replace(/_/g, " ")}.`
    );
  }

  await db.query(`UPDATE purchase_orders SET status = ?, updated_by = ? WHERE id = ?`, [
    status,
    updatedBy,
    id,
  ]);

  return findById(id);
}

async function softDelete(id) {
  const existing = await findById(id);
  if (!existing) return false;

  if (existing.status !== "draft" && existing.status !== "cancelled") {
    throw badRequest("Only a draft or cancelled purchase order can be deleted.");
  }

  const [result] = await db.query(
    `UPDATE purchase_orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  list,
  findById,
  create,
  update,
  updateStatus,
  softDelete,
  previewNextNumber,
  RECEIVABLE_STATUSES,
};
