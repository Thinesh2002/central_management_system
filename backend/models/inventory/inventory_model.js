const db = require('../../config/product_management_db/product_management_db');
const { listParams, toInt, toMoney, clean, jsonValue } = require('../../utils/business/query_helpers');

const INVENTORY_TABLE = 'product_inventory';
const MOVEMENT_TABLE = 'inventory_stock_movements';

function normalizeSku(value) {
  return clean(value).toUpperCase();
}


async function ensureMovementTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory_stock_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sku VARCHAR(180) NOT NULL,
      movement_type ENUM('IN','OUT','RESERVED','RELEASED','RETURN','DAMAGE','ADJUSTMENT') NOT NULL DEFAULT 'OUT',
      reference_type VARCHAR(80) NULL,
      reference_id VARCHAR(160) NULL,
      qty_before INT NOT NULL DEFAULT 0,
      qty_change INT NOT NULL DEFAULT 0,
      qty_after INT NOT NULL DEFAULT 0,
      cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      note TEXT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_inventory_movements_sku (sku),
      KEY idx_inventory_movements_created (created_at),
      KEY idx_inventory_movements_ref (reference_type, reference_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getInventoryBySku(sku, connection = db) {
  const [rows] = await connection.query(
    `SELECT * FROM ${INVENTORY_TABLE} WHERE sku = ? LIMIT 1`,
    [normalizeSku(sku)]
  );
  return rows[0] || null;
}

async function listInventory(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];

  if (params.search) {
    where.push('(sku LIKE ? OR product_name LIKE ? OR note LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.sku) {
    where.push('sku = ?');
    values.push(normalizeSku(params.sku));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT *, GREATEST(stock_qty - reserved_qty, 0) AS available_qty_calc,
            (GREATEST(stock_qty - reserved_qty, 0) * cost_price) AS stock_value
     FROM ${INVENTORY_TABLE}
     ${whereSql}
     ORDER BY updated_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM ${INVENTORY_TABLE} ${whereSql}`,
    values
  );

  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function getDashboard() {
  await ensureMovementTable();
  const [[summary]] = await db.query(
    `SELECT
       COUNT(*) AS total_skus,
       COALESCE(SUM(stock_qty), 0) AS total_stock_qty,
       COALESCE(SUM(GREATEST(stock_qty - reserved_qty, 0)), 0) AS available_stock,
       COALESCE(SUM(reserved_qty), 0) AS reserved_stock,
       COALESCE(SUM(CASE WHEN GREATEST(stock_qty - reserved_qty, 0) <= low_stock_alert_qty AND GREATEST(stock_qty - reserved_qty, 0) > 0 THEN 1 ELSE 0 END), 0) AS low_stock_count,
       COALESCE(SUM(CASE WHEN GREATEST(stock_qty - reserved_qty, 0) <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
       COALESCE(SUM(GREATEST(stock_qty - reserved_qty, 0) * cost_price), 0) AS stock_value
     FROM ${INVENTORY_TABLE}`
  );

  const [recent] = await db.query(
    `SELECT sku, stock_qty, reserved_qty, GREATEST(stock_qty - reserved_qty, 0) AS available_qty, cost_price, updated_at
     FROM ${INVENTORY_TABLE}
     ORDER BY updated_at DESC, id DESC
     LIMIT 10`
  );

  const [fastMoving] = await db.query(
    `SELECT sku, ABS(SUM(qty_change)) AS moved_qty, COUNT(*) AS movement_count
     FROM ${MOVEMENT_TABLE}
     WHERE movement_type IN ('OUT', 'RESERVED')
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY sku
     ORDER BY moved_qty DESC
     LIMIT 10`
  ).catch(() => [[]]);

  const [deadStock] = await db.query(
    `SELECT i.sku, i.stock_qty, i.reserved_qty, GREATEST(i.stock_qty - i.reserved_qty, 0) AS available_qty, i.updated_at
     FROM ${INVENTORY_TABLE} i
     LEFT JOIN ${MOVEMENT_TABLE} m
       ON m.sku = i.sku AND m.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
     WHERE GREATEST(i.stock_qty - i.reserved_qty, 0) > 0
     GROUP BY i.id
     HAVING COUNT(m.id) = 0
     ORDER BY i.updated_at ASC
     LIMIT 10`
  ).catch(() => [[]]);

  return { summary, recent, fast_moving_skus: fastMoving, dead_stock_skus: deadStock };
}

async function getLowStock(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const [rows] = await db.query(
    `SELECT *, GREATEST(stock_qty - reserved_qty, 0) AS available_qty_calc,
            (GREATEST(stock_qty - reserved_qty, 0) * cost_price) AS stock_value
     FROM ${INVENTORY_TABLE}
     WHERE GREATEST(stock_qty - reserved_qty, 0) <= low_stock_alert_qty
       AND GREATEST(stock_qty - reserved_qty, 0) > 0
     ORDER BY available_qty_calc ASC, updated_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM ${INVENTORY_TABLE}
     WHERE GREATEST(stock_qty - reserved_qty, 0) <= low_stock_alert_qty
       AND GREATEST(stock_qty - reserved_qty, 0) > 0`
  );
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function getOutOfStock(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const [rows] = await db.query(
    `SELECT *, GREATEST(stock_qty - reserved_qty, 0) AS available_qty_calc
     FROM ${INVENTORY_TABLE}
     WHERE GREATEST(stock_qty - reserved_qty, 0) <= 0
     ORDER BY updated_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM ${INVENTORY_TABLE}
     WHERE GREATEST(stock_qty - reserved_qty, 0) <= 0`
  );
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function getLedger(params = {}) {
  await ensureMovementTable();
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];

  if (params.sku) {
    where.push('sku = ?');
    values.push(normalizeSku(params.sku));
  }
  if (params.movement_type) {
    where.push('movement_type = ?');
    values.push(params.movement_type);
  }
  if (params.reference_type) {
    where.push('reference_type = ?');
    values.push(params.reference_type);
  }
  if (params.date_from) {
    where.push('created_at >= ?');
    values.push(params.date_from);
  }
  if (params.date_to) {
    where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    values.push(params.date_to);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT * FROM ${MOVEMENT_TABLE} ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM ${MOVEMENT_TABLE} ${whereSql}`,
    values
  );
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

function calculateNextQuantities(current, movementType, qtyChange) {
  const stock = toInt(current.stock_qty, 0);
  const reserved = toInt(current.reserved_qty, 0);
  const qty = Math.abs(toInt(qtyChange, 0));
  if (!qty) throw new Error('Quantity must be greater than 0.');

  let nextStock = stock;
  let nextReserved = reserved;
  let ledgerChange = qty;

  switch (movementType) {
    case 'IN':
    case 'RETURN':
      nextStock = stock + qty;
      ledgerChange = qty;
      break;
    case 'OUT':
    case 'DAMAGE':
      nextStock = Math.max(stock - qty, 0);
      ledgerChange = -qty;
      break;
    case 'RESERVED':
      nextReserved = reserved + qty;
      ledgerChange = -qty;
      break;
    case 'RELEASED':
      nextReserved = Math.max(reserved - qty, 0);
      ledgerChange = qty;
      break;
    case 'ADJUSTMENT':
      nextStock = qty;
      ledgerChange = qty - stock;
      break;
    default:
      throw new Error('Invalid movement type.');
  }

  return { nextStock, nextReserved, ledgerChange, qtyBefore: stock, qtyAfter: nextStock };
}

async function applyStockAdjustment(payload = {}, userId = null) {
  await ensureMovementTable();
  const sku = normalizeSku(payload.sku);
  if (!sku) throw new Error('SKU is required.');

  const movementType = clean(payload.movement_type || payload.type || 'ADJUSTMENT').toUpperCase();
  const qtyInput = payload.qty_change ?? payload.quantity ?? payload.qty;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let current = await getInventoryBySku(sku, connection);
    if (!current) {
      await connection.query(
        `INSERT INTO ${INVENTORY_TABLE} (sku, cost_price, stock_qty, reserved_qty, available_qty, low_stock_alert_qty, created_by, updated_by)
         VALUES (?, ?, 0, 0, 0, ?, ?, ?)`,
        [sku, toMoney(payload.cost_price, 0), toInt(payload.low_stock_alert_qty, 5), userId, userId]
      );
      current = await getInventoryBySku(sku, connection);
    }

    const { nextStock, nextReserved, ledgerChange, qtyBefore, qtyAfter } = calculateNextQuantities(current, movementType, qtyInput);
    const costPrice = payload.cost_price !== undefined ? toMoney(payload.cost_price, current.cost_price || 0) : toMoney(current.cost_price || 0, 0);
    const availableQty = Math.max(nextStock - nextReserved, 0);

    await connection.query(
      `UPDATE ${INVENTORY_TABLE}
       SET stock_qty = ?, reserved_qty = ?, available_qty = ?, cost_price = ?, updated_by = ?, updated_at = NOW()
       WHERE sku = ?`,
      [nextStock, nextReserved, availableQty, costPrice, userId, sku]
    );

    const [movementResult] = await connection.query(
      `INSERT INTO ${MOVEMENT_TABLE}
        (sku, movement_type, reference_type, reference_id, qty_before, qty_change, qty_after, cost_price, note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        sku,
        movementType,
        clean(payload.reference_type || 'STOCK_ADJUSTMENT') || 'STOCK_ADJUSTMENT',
        payload.reference_id || null,
        qtyBefore,
        ledgerChange,
        qtyAfter,
        costPrice,
        payload.note || null,
        userId,
      ]
    );

    const saved = await getInventoryBySku(sku, connection);
    await connection.commit();
    return { inventory: saved, movement_id: movementResult.insertId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrderStockDeductions(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];
  await db.query(`CREATE TABLE IF NOT EXISTS order_stock_deductions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    platform VARCHAR(30) NOT NULL,
    account_id BIGINT UNSIGNED NULL,
    account_code VARCHAR(80) NULL,
    marketplace_order_id VARCHAR(120) NOT NULL,
    marketplace_order_item_id VARCHAR(160) NOT NULL,
    marketplace_sku VARCHAR(180) NULL,
    local_sku VARCHAR(180) NULL,
    quantity INT NOT NULL DEFAULT 0,
    qty_before INT NOT NULL DEFAULT 0,
    qty_after INT NOT NULL DEFAULT 0,
    status ENUM('deducted','skipped','failed') NOT NULL DEFAULT 'deducted',
    reason TEXT NULL,
    raw_json JSON NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_stock_deduction (platform, marketplace_order_item_id),
    KEY idx_order_stock_sku (local_sku),
    KEY idx_order_stock_order (marketplace_order_id),
    KEY idx_order_stock_platform (platform, account_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  if (params.search) {
    where.push('(local_sku LIKE ? OR marketplace_sku LIKE ? OR marketplace_order_id LIKE ? OR account_code LIKE ? OR reason LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.platform) { where.push('platform = ?'); values.push(String(params.platform).toUpperCase()); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.account_code) { where.push('account_code = ?'); values.push(params.account_code); }
  if (params.date_from) { where.push('created_at >= ?'); values.push(params.date_from); }
  if (params.date_to) { where.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); values.push(params.date_to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT * FROM order_stock_deductions ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM order_stock_deductions ${whereSql}`, values);
  const [[summary]] = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='deducted' THEN 1 ELSE 0 END),0) AS deducted,
            COALESCE(SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END),0) AS skipped,
            COALESCE(SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),0) AS failed
     FROM order_stock_deductions ${whereSql}`,
    values
  );
  return { rows, summary, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function getStockPushQueue(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];
  if (params.search) { where.push('(local_sku LIKE ? OR marketplace_sku LIKE ? OR reference_id LIKE ? OR error_message LIKE ?)'); values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
  if (params.marketplace) { where.push('marketplace = ?'); values.push(String(params.marketplace).toUpperCase()); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(`SELECT * FROM inventory_stock_push_queue ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]).catch(() => [[]]);
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM inventory_stock_push_queue ${whereSql}`, values).catch(() => [[{ total: 0 }]]);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

module.exports = {
  listInventory,
  getDashboard,
  getLowStock,
  getOutOfStock,
  getLedger,
  applyStockAdjustment,
  getInventoryBySku,
  getOrderStockDeductions,
  getStockPushQueue,
};
