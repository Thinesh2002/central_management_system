const productDb = require('../../config/product_management_db/product_management_db');
const marketplaceDb = require('../../config/marketplace_management_db/cm_marketplace_management');

const SOURCE_TYPES = {
  DARAZ: 'daraz_order',
  WOO: 'woo_order',
};

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeSku(value) {
  return clean(value).toUpperCase();
}

function toInt(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(Math.trunc(number), 0);
}

function jsonValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  try {
    return JSON.stringify(value);
  } catch (_) {
    return JSON.stringify({ value: String(value) });
  }
}

async function tableExists(db, tableName) {
  try {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    return rows.length > 0;
  } catch (_) {
    return false;
  }
}

async function getColumns(db, tableName) {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${qid(tableName)}`);
    return rows.map((row) => row.Field);
  } catch (_) {
    return [];
  }
}

function firstColumn(columns, candidates) {
  const set = new Set(columns);
  return candidates.find((column) => set.has(column)) || null;
}

function hasColumn(columns, column) {
  return columns.includes(column);
}

async function ensureOperationalTables() {
  await productDb.query(`
    CREATE TABLE IF NOT EXISTS order_stock_deductions (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await productDb.query(`
    CREATE TABLE IF NOT EXISTS stock_sync_settings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      setting_key VARCHAR(120) NOT NULL,
      setting_value VARCHAR(120) NOT NULL DEFAULT '0',
      note TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_stock_sync_settings_key (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await productDb.query(`
    INSERT INTO stock_sync_settings (setting_key, setting_value, note) VALUES
      ('daraz_auto_stock_update', '1', 'Auto push local stock to Daraz after marketplace order/inventory update'),
      ('woo_auto_stock_update', '1', 'Auto push local stock to WooCommerce after marketplace order/inventory update'),
      ('daraz_auto_order_sync', '1', 'Auto sync Daraz orders'),
      ('woo_auto_order_sync', '1', 'Auto sync WooCommerce orders'),
      ('daraz_auto_product_sync', '1', 'Auto sync Daraz products'),
      ('woo_auto_product_sync', '1', 'Auto sync WooCommerce products')
    ON DUPLICATE KEY UPDATE note = VALUES(note)
  `);

  await productDb.query(`
    CREATE TABLE IF NOT EXISTS stock_update_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      local_sku VARCHAR(180) NOT NULL,
      old_qty INT NOT NULL DEFAULT 0,
      new_qty INT NOT NULL DEFAULT 0,
      source ENUM('manual','daraz_order','woo_order','sync','system') NOT NULL DEFAULT 'system',
      reference_id VARCHAR(160) NULL,
      note TEXT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_stock_update_logs_sku (local_sku),
      KEY idx_stock_update_logs_created (created_at),
      KEY idx_stock_update_logs_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await productDb.query(`
    CREATE TABLE IF NOT EXISTS inventory_stock_push_queue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      local_sku VARCHAR(180) NOT NULL,
      marketplace ENUM('DARAZ','WOO','LOCAL') NOT NULL,
      account_id BIGINT UNSIGNED NULL,
      marketplace_sku VARCHAR(180) NULL,
      requested_qty INT NOT NULL DEFAULT 0,
      status ENUM('pending','processing','success','failed','cancelled') NOT NULL DEFAULT 'pending',
      error_message TEXT NULL,
      source VARCHAR(80) NULL,
      reference_id VARCHAR(160) NULL,
      pushed_at DATETIME NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_stock_push_sku (local_sku),
      KEY idx_stock_push_status (status),
      KEY idx_stock_push_marketplace (marketplace, account_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getStockSettings() {
  await ensureOperationalTables();
  const [rows] = await productDb.query(
    `SELECT setting_key, setting_value FROM stock_sync_settings WHERE setting_key IN (
      'daraz_auto_stock_update', 'woo_auto_stock_update', 'daraz_auto_order_sync', 'woo_auto_order_sync', 'daraz_auto_product_sync', 'woo_auto_product_sync'
    )`
  );

  const settings = {
    daraz_auto_stock_update: true,
    woo_auto_stock_update: true,
    daraz_auto_order_sync: true,
    woo_auto_order_sync: true,
    daraz_auto_product_sync: true,
    woo_auto_product_sync: true,
  };

  rows.forEach((row) => {
    settings[row.setting_key] = String(row.setting_value) === '1' || String(row.setting_value).toLowerCase() === 'true';
  });

  return settings;
}

async function alreadyDeducted(platform, marketplaceOrderItemId) {
  await ensureOperationalTables();
  const [rows] = await productDb.query(
    `SELECT id, status FROM order_stock_deductions WHERE platform = ? AND marketplace_order_item_id = ? LIMIT 1`,
    [platform, marketplaceOrderItemId]
  );
  return rows[0] || null;
}

async function findMappedSku({ platform, accountId, accountCode, marketplaceSku }) {
  const sku = clean(marketplaceSku);
  if (!sku) return '';

  try {
    const values = [String(platform || '').toUpperCase(), sku];
    const where = [`platform = ?`, `marketplace_sku = ?`, `status <> 'DELETED'`];

    if (accountId || accountCode) {
      where.push(`(account_id = ? OR account_code = ? OR account_id IS NULL OR account_code IS NULL)`);
      values.push(accountId || null, accountCode || null);
    }

    const [rows] = await marketplaceDb.query(
      `SELECT local_sku FROM marketplace_sku_mappings WHERE ${where.join(' AND ')} ORDER BY account_id IS NULL ASC, account_code IS NULL ASC, id DESC LIMIT 1`,
      values
    );

    if (rows[0]?.local_sku) return normalizeSku(rows[0].local_sku);
  } catch (_) {
    // Mapping table may not exist in old DB; fallback to marketplace SKU.
  }

  return normalizeSku(sku);
}

async function findInventoryRow(localSku) {
  const columns = await getColumns(productDb, 'product_inventory');
  if (!columns.length) return null;

  const skuColumns = ['sku', 'local_sku', 'product_sku', 'seller_sku', 'variant_sku'].filter((column) => hasColumn(columns, column));
  if (!skuColumns.length) return null;

  const stockColumn = firstColumn(columns, ['stock_qty', 'qty', 'quantity', 'stock', 'available_qty']);
  if (!stockColumn) return null;

  const where = skuColumns.map((column) => `UPPER(TRIM(${qid(column)})) = ?`).join(' OR ');
  const values = skuColumns.map(() => normalizeSku(localSku));

  const [rows] = await productDb.query(
    `SELECT * FROM product_inventory WHERE ${where} LIMIT 1`,
    values
  );

  return {
    row: rows[0] || null,
    columns,
    skuColumn: skuColumns[0],
    stockColumn,
    availableColumn: hasColumn(columns, 'available_qty') ? 'available_qty' : null,
    reservedColumn: firstColumn(columns, ['reserved_qty', 'reserved_stock']),
    primaryKey: firstColumn(columns, ['id', 'inventory_id']) || 'id',
  };
}

async function insertDeductionLog(data) {
  await ensureOperationalTables();
  try {
    await productDb.query(
      `INSERT INTO order_stock_deductions
        (platform, account_id, account_code, marketplace_order_id, marketplace_order_item_id, marketplace_sku, local_sku, quantity, qty_before, qty_after, status, reason, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), raw_json = VALUES(raw_json)`,
      [
        data.platform,
        data.account_id || null,
        data.account_code || null,
        data.marketplace_order_id,
        data.marketplace_order_item_id,
        data.marketplace_sku || null,
        data.local_sku || null,
        data.quantity || 0,
        data.qty_before || 0,
        data.qty_after || 0,
        data.status || 'skipped',
        data.reason || null,
        jsonValue(data.raw_json || {}),
      ]
    );
  } catch (error) {
    if (String(error?.code) !== 'ER_DUP_ENTRY') throw error;
  }
}

async function writeStockLogs({ localSku, oldQty, newQty, source, referenceId, note }) {
  if (await tableExists(productDb, 'stock_update_logs')) {
    await productDb.query(
      `INSERT INTO stock_update_logs (local_sku, old_qty, new_qty, source, reference_id, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [localSku, oldQty, newQty, source, referenceId || null, note || null]
    ).catch(async (error) => {
      if (error?.code === 'ER_BAD_FIELD_ERROR') {
        await productDb.query(
          `INSERT INTO stock_update_logs (local_sku, old_qty, new_qty, source, note) VALUES (?, ?, ?, ?, ?)`,
          [localSku, oldQty, newQty, source, note || null]
        );
      } else {
        throw error;
      }
    });
  }

  if (await tableExists(productDb, 'inventory_ledger')) {
    await productDb.query(
      `INSERT INTO inventory_ledger (local_sku, movement_type, reference_type, reference_id, qty_before, qty_change, qty_after, note)
       VALUES (?, 'OUT', ?, ?, ?, ?, ?, ?)`,
      [localSku, source, referenceId || null, oldQty, newQty - oldQty, newQty, note || null]
    ).catch(async (error) => {
      if (error?.code === 'ER_BAD_FIELD_ERROR') {
        await productDb.query(
          `INSERT INTO inventory_ledger (local_sku, movement_type, reference_type, qty_before, qty_change, qty_after, note)
           VALUES (?, 'OUT', ?, ?, ?, ?, ?)`,
          [localSku, source, oldQty, newQty - oldQty, newQty, note || null]
        );
      } else {
        throw error;
      }
    });
  }
}

async function createNotification({ platform, accountCode, marketplaceOrderId, localSku, qty }) {
  if (!(await tableExists(productDb, 'notifications'))) return;

  const title = `New ${platform} order stock reduced`;
  const message = `${accountCode || platform} order ${marketplaceOrderId} reduced ${qty} unit(s) from SKU ${localSku}.`;
  const referenceId = `${platform}:${marketplaceOrderId}:${localSku}`;

  try {
    await productDb.query(
      `INSERT INTO notifications (title, message, type, module_name, reference_id, is_read, created_at)
       SELECT ?, ?, 'info', 'inventory', ?, 0, NOW()
       WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE reference_id = ? LIMIT 1)`,
      [title, message, referenceId, referenceId]
    );
  } catch (error) {
    if (error?.code === 'ER_BAD_FIELD_ERROR') {
      await productDb.query(
        `INSERT INTO notifications (title, message, type, module_name, is_read, created_at)
         VALUES (?, ?, 'info', 'inventory', 0, NOW())`,
        [title, message]
      );
    }
  }
}

async function queueStockPush({ localSku, qty, sourcePlatform, sourceOrderId }) {
  const settings = await getStockSettings();
  const pushes = [];

  const queue = async (marketplace) => {
    const mappings = await getMappingsForLocalSku(localSku, marketplace);
    if (!mappings.length) {
      const [result] = await productDb.query(
        `INSERT INTO inventory_stock_push_queue (local_sku, marketplace, requested_qty, status, source, reference_id)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [localSku, marketplace, qty, `${sourcePlatform}_order`, sourceOrderId || null]
      ).catch(async (error) => {
        if (error?.code === 'ER_BAD_FIELD_ERROR') {
          const [fallback] = await productDb.query(
            `INSERT INTO inventory_stock_push_queue (local_sku, marketplace, requested_qty, status) VALUES (?, ?, ?, 'pending')`,
            [localSku, marketplace, qty]
          );
          return [fallback];
        }
        throw error;
      });
      pushes.push({ id: result.insertId, marketplace, local_sku: localSku, requested_qty: qty, mapped: false });
      return;
    }

    for (const mapping of mappings) {
      const [result] = await productDb.query(
        `INSERT INTO inventory_stock_push_queue (local_sku, marketplace, account_id, marketplace_sku, requested_qty, status, source, reference_id)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [localSku, marketplace, mapping.account_id || null, mapping.marketplace_sku || null, qty, `${sourcePlatform}_order`, sourceOrderId || null]
      ).catch(async (error) => {
        if (error?.code === 'ER_BAD_FIELD_ERROR') {
          const [fallback] = await productDb.query(
            `INSERT INTO inventory_stock_push_queue (local_sku, marketplace, account_id, marketplace_sku, requested_qty, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [localSku, marketplace, mapping.account_id || null, mapping.marketplace_sku || null, qty]
          );
          return [fallback];
        }
        throw error;
      });
      pushes.push({ id: result.insertId, marketplace, local_sku: localSku, marketplace_sku: mapping.marketplace_sku, account_id: mapping.account_id, requested_qty: qty, mapped: true });
    }
  };

  if (settings.daraz_auto_stock_update) await queue('DARAZ');
  if (settings.woo_auto_stock_update) await queue('WOO');

  return pushes;
}

async function getMappingsForLocalSku(localSku, platform) {
  try {
    const [rows] = await marketplaceDb.query(
      `SELECT * FROM marketplace_sku_mappings WHERE platform = ? AND UPPER(TRIM(local_sku)) = ? AND status <> 'DELETED' ORDER BY account_id IS NULL ASC, id DESC`,
      [platform, normalizeSku(localSku)]
    );
    return rows;
  } catch (_) {
    return [];
  }
}

async function deductOneItem(context, rawItem) {
  const platform = String(context.platform || '').toUpperCase();
  const source = SOURCE_TYPES[platform] || 'system';
  const marketplaceOrderId = clean(context.marketplace_order_id || context.order_id || context.order_number);
  const marketplaceOrderItemId = clean(
    rawItem.marketplace_order_item_id ||
      rawItem.order_item_id ||
      rawItem.woo_order_item_id ||
      rawItem.id ||
      `${marketplaceOrderId}:${rawItem.sku || rawItem.local_sku || rawItem.marketplace_sku || rawItem.product_name || Date.now()}`
  );

  if (!marketplaceOrderId || !marketplaceOrderItemId) {
    return { status: 'skipped', reason: 'Missing order/order item id.' };
  }

  const existing = await alreadyDeducted(platform, marketplaceOrderItemId);
  if (existing) return { status: 'skipped', reason: 'Already deducted.', existing_id: existing.id };

  const marketplaceSku = clean(
    rawItem.marketplace_sku || rawItem.sku || rawItem.seller_sku || rawItem.shop_sku || rawItem.local_sku
  );
  const qty = Math.max(toInt(rawItem.quantity || rawItem.qty, 1), 1);

  if (!marketplaceSku) {
    await insertDeductionLog({
      platform,
      account_id: context.account_id,
      account_code: context.account_code,
      marketplace_order_id: marketplaceOrderId,
      marketplace_order_item_id: marketplaceOrderItemId,
      quantity: qty,
      status: 'skipped',
      reason: 'Missing SKU in order item.',
      raw_json: rawItem,
    });
    return { status: 'skipped', reason: 'Missing SKU in order item.' };
  }

  const localSku = await findMappedSku({
    platform,
    accountId: context.account_id,
    accountCode: context.account_code,
    marketplaceSku,
  });

  const inventory = await findInventoryRow(localSku);
  if (!inventory?.row) {
    await insertDeductionLog({
      platform,
      account_id: context.account_id,
      account_code: context.account_code,
      marketplace_order_id: marketplaceOrderId,
      marketplace_order_item_id: marketplaceOrderItemId,
      marketplace_sku: marketplaceSku,
      local_sku: localSku,
      quantity: qty,
      status: 'skipped',
      reason: 'Local inventory row not found for SKU.',
      raw_json: rawItem,
    });
    return { status: 'skipped', reason: 'Local inventory row not found.', local_sku: localSku };
  }

  const oldQty = toInt(inventory.row[inventory.stockColumn], 0);
  const newQty = Math.max(oldQty - qty, 0);

  const setParts = [`${qid(inventory.stockColumn)} = ?`];
  const values = [newQty];

  if (inventory.availableColumn && inventory.availableColumn !== inventory.stockColumn) {
    const reservedValue = inventory.reservedColumn ? toInt(inventory.row[inventory.reservedColumn], 0) : 0;
    setParts.push(`${qid(inventory.availableColumn)} = ?`);
    values.push(Math.max(newQty - reservedValue, 0));
  }

  if (hasColumn(inventory.columns, 'updated_at')) setParts.push(`updated_at = NOW()`);

  values.push(inventory.row[inventory.primaryKey]);

  await productDb.query(
    `UPDATE product_inventory SET ${setParts.join(', ')} WHERE ${qid(inventory.primaryKey)} = ?`,
    values
  );

  await insertDeductionLog({
    platform,
    account_id: context.account_id,
    account_code: context.account_code,
    marketplace_order_id: marketplaceOrderId,
    marketplace_order_item_id: marketplaceOrderItemId,
    marketplace_sku: marketplaceSku,
    local_sku: localSku,
    quantity: qty,
    qty_before: oldQty,
    qty_after: newQty,
    status: 'deducted',
    reason: `${platform} order stock deduction`,
    raw_json: rawItem,
  });

  await writeStockLogs({
    localSku,
    oldQty,
    newQty,
    source,
    referenceId: marketplaceOrderId,
    note: `${platform} order ${marketplaceOrderId} item ${marketplaceOrderItemId} reduced stock by ${qty}.`,
  });

  const queued = await queueStockPush({
    localSku,
    qty: newQty,
    sourcePlatform: platform,
    sourceOrderId: marketplaceOrderId,
  });

  await createNotification({ platform, accountCode: context.account_code, marketplaceOrderId, localSku, qty });

  return {
    status: 'deducted',
    platform,
    marketplace_order_id: marketplaceOrderId,
    marketplace_order_item_id: marketplaceOrderItemId,
    marketplace_sku: marketplaceSku,
    local_sku: localSku,
    quantity: qty,
    old_qty: oldQty,
    new_qty: newQty,
    queued,
  };
}

async function deductStockForOrderItems(context = {}, items = []) {
  await ensureOperationalTables();
  const rows = Array.isArray(items) ? items : [];
  const summary = {
    platform: String(context.platform || '').toUpperCase(),
    order_id: context.marketplace_order_id || context.order_id || context.order_number || null,
    total_items: rows.length,
    deducted: 0,
    skipped: 0,
    failed: 0,
    queued_pushes: 0,
    results: [],
  };

  for (const item of rows) {
    try {
      const result = await deductOneItem(context, item || {});
      summary.results.push(result);
      if (result.status === 'deducted') {
        summary.deducted += 1;
        summary.queued_pushes += Array.isArray(result.queued) ? result.queued.length : 0;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      summary.results.push({ status: 'failed', message: error.message });
    }
  }

  return summary;
}

module.exports = {
  ensureOperationalTables,
  getStockSettings,
  deductStockForOrderItems,
  findMappedSku,
  queueStockPush,
};
