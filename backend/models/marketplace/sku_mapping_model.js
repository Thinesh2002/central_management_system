const db = require('../../config/marketplace_management_db/cm_marketplace_management');
const { listParams, clean } = require('../../utils/business/query_helpers');

async function list(params = {}) {
  const { page, limit, offset } = listParams(params, 25, 500);
  const values = [];
  const where = [];
  if (params.platform) { where.push('platform = ?'); values.push(String(params.platform).toUpperCase()); }
  if (params.account_id) { where.push('account_id = ?'); values.push(params.account_id); }
  if (params.account_code) { where.push('account_code = ?'); values.push(params.account_code); }
  if (params.local_sku) { where.push('local_sku = ?'); values.push(params.local_sku); }
  if (params.marketplace_sku) { where.push('marketplace_sku = ?'); values.push(params.marketplace_sku); }
  if (params.status) { where.push('status = ?'); values.push(params.status); }
  if (params.search) {
    where.push('(local_sku LIKE ? OR marketplace_sku LIKE ? OR marketplace_item_id LIKE ? OR marketplace_product_id LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(`SELECT * FROM marketplace_sku_mappings ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM marketplace_sku_mappings ${whereSql}`, values);
  return { rows, pagination: { page, limit, offset, total: Number(countRow.total || 0) } };
}

async function findMatch({ platform, account_id, account_code, marketplace_sku }) {
  const values = [String(platform || '').toUpperCase(), marketplace_sku];
  const where = ['platform = ?', 'marketplace_sku = ?'];
  if (account_id) { where.push('account_id = ?'); values.push(account_id); }
  if (account_code) { where.push('account_code = ?'); values.push(account_code); }
  const [rows] = await db.query(`SELECT * FROM marketplace_sku_mappings WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 1`, values);
  return rows[0] || null;
}

async function upsert(payload = {}) {
  const platform = String(payload.platform || '').toUpperCase();
  const marketplaceSku = clean(payload.marketplace_sku);
  const localSku = clean(payload.local_sku);
  if (!platform) throw new Error('Platform is required.');
  if (!marketplaceSku) throw new Error('Marketplace SKU is required.');
  if (!localSku) throw new Error('Local SKU is required.');

  const [result] = await db.query(
    `INSERT INTO marketplace_sku_mappings
      (platform, account_id, account_code, local_product_id, local_variant_id, local_sku, marketplace_sku, marketplace_item_id, marketplace_product_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
      local_product_id=VALUES(local_product_id), local_variant_id=VALUES(local_variant_id), local_sku=VALUES(local_sku),
      marketplace_item_id=VALUES(marketplace_item_id), marketplace_product_id=VALUES(marketplace_product_id), status=VALUES(status), updated_at=NOW()`,
    [platform, payload.account_id || null, payload.account_code || null, payload.local_product_id || null, payload.local_variant_id || null, localSku, marketplaceSku, payload.marketplace_item_id || null, payload.marketplace_product_id || null, payload.status || 'ACTIVE']
  );

  const id = result.insertId;
  if (id) {
    const [rows] = await db.query('SELECT * FROM marketplace_sku_mappings WHERE id = ?', [id]);
    return rows[0];
  }
  return findMatch({ platform, account_id: payload.account_id, account_code: payload.account_code, marketplace_sku: marketplaceSku });
}

async function remove(id) {
  const [rows] = await db.query('SELECT * FROM marketplace_sku_mappings WHERE id = ?', [id]);
  await db.query('DELETE FROM marketplace_sku_mappings WHERE id = ?', [id]);
  return rows[0] || null;
}


async function duplicateCheck(payload = {}) {
  const platform = String(payload.platform || '').toUpperCase();
  const accountId = payload.account_id || null;
  const accountCode = payload.account_code || null;
  const marketplaceSku = clean(payload.marketplace_sku || payload.sku);

  if (!platform || !marketplaceSku) {
    return { duplicate: false, mapping: null };
  }

  const mapping = await findMatch({ platform, account_id: accountId, account_code: accountCode, marketplace_sku: marketplaceSku });
  return { duplicate: Boolean(mapping), mapping };
}

async function bulkUpsert(rows = []) {
  const saved = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    saved.push(await upsert(row));
  }
  return saved;
}

async function localSkuSuggestions(params = {}) {
  const search = `%${clean(params.search || params.q || '')}%`;
  const [inventoryRows] = await require('../../config/product_management_db/product_management_db').query(
    `SELECT sku AS local_sku, product_name, stock_qty, reserved_qty, available_qty
     FROM product_inventory
     WHERE sku LIKE ? OR product_name LIKE ?
     ORDER BY updated_at DESC
     LIMIT 20`,
    [search, search]
  ).catch(() => [[]]);

  if (inventoryRows.length) return inventoryRows;

  const [productRows] = await require('../../config/product_management_db/product_management_db').query(
    `SELECT sku AS local_sku, product_name, name, title
     FROM products
     WHERE sku LIKE ? OR product_name LIKE ? OR name LIKE ? OR title LIKE ?
     ORDER BY updated_at DESC
     LIMIT 20`,
    [search, search, search, search]
  ).catch(() => [[]]);

  return productRows;
}

async function unmapped(params = {}) {
  const platform = String(params.platform || '').toUpperCase();
  const accountId = params.account_id || null;

  if (platform === 'DARAZ') {
    const values = [];
    let where = `WHERE 1=1`;
    if (accountId) { where += ` AND dp.account_id = ?`; values.push(accountId); }
    if (params.search) { where += ` AND (dp.seller_sku LIKE ? OR dp.product_name LIKE ? OR CAST(dp.daraz_item_id AS CHAR) LIKE ?)`; values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
    const [rows] = await require('../../config/product_management_db/product_management_db').query(
      `SELECT 'DARAZ' AS platform, dp.account_id, dp.seller_sku AS marketplace_sku, dp.daraz_item_id AS marketplace_item_id, dp.product_name
       FROM daraz_products dp
       LEFT JOIN marketplace_sku_mappings m ON m.platform = 'DARAZ' AND m.account_id = dp.account_id AND m.marketplace_sku = dp.seller_sku
       ${where} AND dp.seller_sku IS NOT NULL AND m.id IS NULL
       ORDER BY dp.updated_at DESC
       LIMIT 100`,
      values
    ).catch(() => [[]]);
    return rows;
  }

  if (platform === 'WOO') {
    const values = [];
    let where = `WHERE 1=1`;
    if (accountId) { where += ` AND wp.account_id = ?`; values.push(accountId); }
    if (params.search) { where += ` AND (wp.sku LIKE ? OR wp.name LIKE ? OR CAST(wp.woo_product_id AS CHAR) LIKE ?)`; values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`); }
    const [rows] = await require('../../config/product_management_db/product_management_db').query(
      `SELECT 'WOO' AS platform, wp.account_id, wp.sku AS marketplace_sku, wp.woo_product_id AS marketplace_product_id, wp.name AS product_name
       FROM woo_products wp
       LEFT JOIN marketplace_sku_mappings m ON m.platform = 'WOO' AND m.account_id = wp.account_id AND m.marketplace_sku = wp.sku
       ${where} AND wp.sku IS NOT NULL AND m.id IS NULL
       ORDER BY wp.updated_at DESC
       LIMIT 100`,
      values
    ).catch(() => [[]]);
    return rows;
  }

  return [];
}

module.exports = { list, upsert, remove, findMatch, duplicateCheck, bulkUpsert, localSkuSuggestions, unmapped };
