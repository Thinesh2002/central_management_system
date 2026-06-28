const cron = require('node-cron');
const productDb = require('../../config/product_management_db/product_management_db');
const marketplaceDb = require('../../config/marketplace_management_db/cm_marketplace_management');
const accountModel = require('../../models/marketplace/account_model');
const credentialModel = require('../../models/marketplace/credential_model');
const wooModel = require('../../models/marketplace/woo/woo_model');
const wooApi = require('../../services/marketplace/woo/woo_api_service');
const darazApi = require('../../services/marketplace/daraz_api_service');
const stockService = require('../../services/inventory/marketplace_stock_service');

let isRunning = false;

function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function loadQueueItems(limit = 25) {
  await stockService.ensureOperationalTables();
  const [rows] = await productDb.query(
    `SELECT * FROM inventory_stock_push_queue WHERE status = 'pending' ORDER BY id ASC LIMIT ?`,
    [limit]
  );
  return rows;
}

async function markQueue(id, status, errorMessage = null) {
  await productDb.query(
    `UPDATE inventory_stock_push_queue SET status = ?, error_message = ?, pushed_at = CASE WHEN ? = 'success' THEN NOW() ELSE pushed_at END, updated_at = NOW() WHERE id = ?`,
    [status, errorMessage, status, id]
  ).catch(async (error) => {
    if (error?.code === 'ER_BAD_FIELD_ERROR') {
      await productDb.query(`UPDATE inventory_stock_push_queue SET status = ?, error_message = ? WHERE id = ?`, [status, errorMessage, id]);
    } else {
      throw error;
    }
  });
}

async function findMapping(row) {
  try {
    const values = [String(row.marketplace || '').toUpperCase(), clean(row.local_sku).toUpperCase()];
    const where = [`platform = ?`, `UPPER(TRIM(local_sku)) = ?`, `status <> 'DELETED'`];

    if (row.account_id) {
      where.push(`account_id = ?`);
      values.push(row.account_id);
    }
    if (row.marketplace_sku) {
      where.push(`marketplace_sku = ?`);
      values.push(row.marketplace_sku);
    }

    const [rows] = await marketplaceDb.query(
      `SELECT * FROM marketplace_sku_mappings WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT 1`,
      values
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function pushWoo(row) {
  const mapping = await findMapping(row);
  const accountId = row.account_id || mapping?.account_id;
  if (!accountId) throw new Error('Woo account_id missing in stock push queue/mapping.');

  const productId = mapping?.marketplace_product_id || mapping?.marketplace_item_id || row.marketplace_product_id || null;
  const variationId = mapping?.marketplace_variant_id || mapping?.local_variant_id || null;
  if (!productId) throw new Error('Woo product id missing. Add SKU mapping with marketplace_product_id.');

  const credentials = await wooModel.getWooCredentials(accountId);
  await wooApi.updateProductStock(credentials, productId, row.requested_qty, variationId);
}

async function pushDaraz(row) {
  const mapping = await findMapping(row);
  const accountId = row.account_id || mapping?.account_id;
  if (!accountId) throw new Error('Daraz account_id missing in stock push queue/mapping.');

  const account = await accountModel.getAccountById(accountId);
  if (!account) throw new Error('Daraz account not found.');
  const credentials = await credentialModel.findByAccountId(accountId);
  if (!credentials?.access_token) throw new Error('Daraz access token missing.');

  const marketplaceSku = row.marketplace_sku || mapping?.marketplace_sku || row.local_sku;
  const skuField = process.env.DARAZ_STOCK_UPDATE_SKU_FIELD || 'SellerSku';
  const qtyField = process.env.DARAZ_STOCK_UPDATE_QTY_FIELD || 'Quantity';
  const apiPath = process.env.DARAZ_STOCK_UPDATE_ENDPOINT || '/product/stock/update';
  const method = process.env.DARAZ_STOCK_UPDATE_METHOD || 'POST';

  const payload = { [skuField]: marketplaceSku, [qtyField]: row.requested_qty };

  await darazApi.callDarazApi({
    account,
    credentials,
    apiPath,
    method,
    requestType: 'daraz_stock_update',
    query: payload,
    body: payload,
  });
}

async function processQueueItem(row) {
  await markQueue(row.id, 'processing');

  try {
    if (row.marketplace === 'WOO') await pushWoo(row);
    else if (row.marketplace === 'DARAZ') await pushDaraz(row);
    else throw new Error(`Unsupported marketplace for stock push: ${row.marketplace}`);

    await markQueue(row.id, 'success');
    return { success: true, id: row.id, marketplace: row.marketplace };
  } catch (error) {
    await markQueue(row.id, 'failed', error.message);
    return { success: false, id: row.id, marketplace: row.marketplace, error: error.message };
  }
}

async function runStockPushQueue() {
  if (isRunning) return { skipped: true, reason: 'previous_run_still_running' };
  isRunning = true;

  const summary = { checked: 0, success: 0, failed: 0 };

  try {
    const settings = await stockService.getStockSettings();
    const rows = await loadQueueItems(Number(process.env.STOCK_PUSH_QUEUE_LIMIT || 25));
    summary.checked = rows.length;

    for (const row of rows) {
      if (row.marketplace === 'DARAZ' && !settings.daraz_auto_stock_update) continue;
      if (row.marketplace === 'WOO' && !settings.woo_auto_stock_update) continue;

      const result = await processQueueItem(row);
      if (result.success) summary.success += 1;
      else summary.failed += 1;
    }

    if (summary.checked) {
      console.log(`[STOCK_PUSH] Checked: ${summary.checked} | Success: ${summary.success} | Failed: ${summary.failed}`);
    }

    return summary;
  } catch (error) {
    console.error('[STOCK_PUSH_ERROR]:', error.message);
    return { ...summary, error: error.message };
  } finally {
    isRunning = false;
  }
}

function startStockPushJob() {
  runStockPushQueue();
  const interval = Math.min(Math.max(Number(process.env.STOCK_PUSH_INTERVAL_MINUTES || 5), 5), 60);
  cron.schedule(`*/${interval} * * * *`, runStockPushQueue, { timezone: 'Asia/Colombo' });
  console.log(`[STOCK_PUSH] Scheduler started. Runs every ${interval} minutes.`);
}

module.exports = { startStockPushJob, runStockPushQueue };
