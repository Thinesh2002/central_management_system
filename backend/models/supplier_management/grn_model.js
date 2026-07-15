const db = require("../../config/supplier_management_db/supplier_management_db");
const purchaseOrderModel = require("./purchase_order_model");

const GRN_NUMBER_PREFIX = "GRN";

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

async function nextGrnNumber(connection = db) {
  const [rows] = await connection.query(
    `SELECT grn_number FROM goods_received_notes WHERE grn_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${GRN_NUMBER_PREFIX}%`]
  );

  const lastNo = rows[0]?.grn_number || "";
  const lastNumber = Number(String(lastNo).replace(GRN_NUMBER_PREFIX, "")) || 0;
  const nextNumber = lastNumber + 1;

  return `${GRN_NUMBER_PREFIX}${String(nextNumber).padStart(4, "0")}`;
}

async function getItems(grnId, connection = db) {
  const [rows] = await connection.query(
    `SELECT * FROM goods_received_note_items WHERE grn_id = ? ORDER BY id ASC`,
    [grnId]
  );

  return rows;
}

async function list({ purchase_order_id: purchaseOrderId, supplier_id: supplierId, search, limit = 100, offset = 0 } = {}) {
  const params = [];
  let whereSql = "WHERE 1=1";

  if (purchaseOrderId) {
    whereSql += " AND g.purchase_order_id = ?";
    params.push(purchaseOrderId);
  }

  if (supplierId) {
    whereSql += " AND g.supplier_id = ?";
    params.push(supplierId);
  }

  if (search) {
    whereSql += " AND (g.grn_number LIKE ? OR po.po_number LIKE ? OR s.name LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const [rows] = await db.query(
    `SELECT g.*, po.po_number, s.name AS supplier_name,
            (SELECT COUNT(*) FROM goods_received_note_items gi WHERE gi.grn_id = g.id) AS item_count
     FROM goods_received_notes g
     JOIN purchase_orders po ON po.id = g.purchase_order_id
     JOIN suppliers s ON s.id = g.supplier_id
     ${whereSql}
     ORDER BY g.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM goods_received_notes g
     JOIN purchase_orders po ON po.id = g.purchase_order_id
     JOIN suppliers s ON s.id = g.supplier_id
     ${whereSql}`,
    params
  );

  return { rows, total: Number(countRows[0]?.total || 0) };
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT g.*, po.po_number, s.name AS supplier_name
     FROM goods_received_notes g
     JOIN purchase_orders po ON po.id = g.purchase_order_id
     JOIN suppliers s ON s.id = g.supplier_id
     WHERE g.id = ?
     LIMIT 1`,
    [id]
  );

  const grn = rows[0];
  if (!grn) return null;

  grn.items = await getItems(id);
  return grn;
}

// Creates the GRN + items, bumps each purchase_order_items.quantity_received,
// and recomputes the parent PO's status - all in one transaction, since it's
// all within cm_supplier_management. The cross-database inventory increment
// happens afterward (see grn_stock_service), same layering as the existing
// Daraz order-sync -> inventory deduction flow.
async function createReceipt({
  purchase_order_id: purchaseOrderId,
  received_date: receivedDate,
  notes,
  items,
  created_by: createdBy = null,
}) {
  if (!purchaseOrderId) throw badRequest("Purchase order is required.");
  if (!Array.isArray(items) || !items.length) throw badRequest("At least one line item is required.");

  const po = await purchaseOrderModel.findById(purchaseOrderId);
  if (!po) throw badRequest("Purchase order not found.");

  if (!purchaseOrderModel.RECEIVABLE_STATUSES.has(po.status)) {
    throw badRequest(`A ${po.status.replace(/_/g, " ")} purchase order cannot receive goods.`);
  }

  const poItemsById = new Map(po.items.map((item) => [item.id, item]));

  const normalizedItems = items.map((item) => {
    const poItemId = Number(item.purchase_order_item_id);
    const poItem = poItemsById.get(poItemId);

    if (!poItem) throw badRequest("Line item does not belong to this purchase order.");

    const qty = Number(item.quantity_received);
    if (!Number.isFinite(qty) || qty <= 0) return null;

    const remaining = poItem.quantity_ordered - poItem.quantity_received;
    if (qty > remaining) {
      throw badRequest(`Cannot receive ${qty} of ${poItem.sku} - only ${remaining} remaining on the PO.`);
    }

    return {
      purchase_order_item_id: poItemId,
      sku: poItem.sku,
      product_name: poItem.product_name,
      quantity_received: qty,
      unit_cost: toMoney(item.unit_cost ?? poItem.unit_cost),
    };
  }).filter(Boolean);

  if (!normalizedItems.length) {
    throw badRequest("Enter a quantity received for at least one line item.");
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const grnNumber = await nextGrnNumber(connection);

    const [result] = await connection.query(
      `INSERT INTO goods_received_notes
         (grn_number, purchase_order_id, supplier_id, received_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [grnNumber, purchaseOrderId, po.supplier_id, clean(receivedDate) || new Date().toISOString().slice(0, 10), clean(notes), createdBy]
    );

    const grnId = result.insertId;

    const itemValues = normalizedItems.map((item) => [
      grnId,
      item.purchase_order_item_id,
      item.sku,
      item.product_name,
      item.quantity_received,
      item.unit_cost,
    ]);

    await connection.query(
      `INSERT INTO goods_received_note_items
         (grn_id, purchase_order_item_id, sku, product_name, quantity_received, unit_cost)
       VALUES ?`,
      [itemValues]
    );

    for (const item of normalizedItems) {
      await connection.query(
        `UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?`,
        [item.quantity_received, item.purchase_order_item_id]
      );
    }

    const [updatedPoItems] = await connection.query(
      `SELECT quantity_ordered, quantity_received FROM purchase_order_items WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    );

    const fullyReceived = updatedPoItems.every((item) => item.quantity_received >= item.quantity_ordered);
    const anyReceived = updatedPoItems.some((item) => item.quantity_received > 0);
    const newPoStatus = fullyReceived ? "received" : anyReceived ? "partially_received" : po.status;

    if (newPoStatus !== po.status) {
      await connection.query(`UPDATE purchase_orders SET status = ?, updated_by = ? WHERE id = ?`, [
        newPoStatus,
        createdBy,
        purchaseOrderId,
      ]);
    }

    await connection.commit();

    const grn = await findById(grnId);
    return { grn, items: normalizedItems, purchase_order_status: newPoStatus };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { list, findById, createReceipt };
