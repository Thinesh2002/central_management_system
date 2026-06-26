const db = require("../../../config/order_management_db/cm_order_management");

function jsonValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  return JSON.stringify(value);
}

function normaliseDate(value) {
  if (!value) return null;

  const num = Number(value);

  if (Number.isFinite(num)) {
    // Daraz sometimes returns milliseconds timestamp as string.
    const date = new Date(num > 9999999999 ? num : num * 1000);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;

  return null;
}

async function createSyncRun(data) {
  const [result] = await db.query(
    `
    INSERT INTO daraz_order_sync_runs (
      sync_uid,
      account_id,
      account_code,
      sync_type,
      sync_status,
      date_from,
      date_to,
      request_summary,
      started_at,
      triggered_by,
      triggered_by_user_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `,
    [
      data.sync_uid,
      data.account_id || null,
      data.account_code,
      data.sync_type || "auto_orders",
      data.sync_status || "running",
      normaliseDate(data.date_from),
      normaliseDate(data.date_to),
      jsonValue(data.request_summary || {}),
      data.triggered_by || "system",
      data.triggered_by_user_id || null,
    ]
  );

  return result.insertId;
}

async function finishSyncRun(id, data) {
  await db.query(
    `
    UPDATE daraz_order_sync_runs
    SET
      sync_status = ?,
      total_fetched = ?,
      total_inserted = ?,
      total_updated = ?,
      total_failed = ?,
      total_skipped = ?,
      response_summary = ?,
      error_code = ?,
      error_message = ?,
      finished_at = NOW(),
      duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000
    WHERE id = ?
    `,
    [
      data.sync_status || "success",
      data.total_fetched || 0,
      data.total_inserted || 0,
      data.total_updated || 0,
      data.total_failed || 0,
      data.total_skipped || 0,
      jsonValue(data.response_summary || {}),
      data.error_code || null,
      data.error_message || null,
      id,
    ]
  );
}

async function updateSyncSettings(platformCode, data) {
  await db.query(
    `
    UPDATE order_sync_settings
    SET
      last_sync_started_at = COALESCE(?, last_sync_started_at),
      last_sync_finished_at = COALESCE(?, last_sync_finished_at),
      last_sync_status = COALESCE(?, last_sync_status),
      last_error_message = ?
    WHERE platform_code = ?
    `,
    [
      data.last_sync_started_at || null,
      data.last_sync_finished_at || null,
      data.last_sync_status || null,
      data.last_error_message || null,
      platformCode,
    ]
  );
}

async function getSyncSettings() {
  const [rows] = await db.query(
    `SELECT * FROM order_sync_settings WHERE platform_code = 'DARAZ' LIMIT 1`
  );

  return rows[0] || null;
}

async function logApi(data) {
  await db.query(
    `
    INSERT INTO daraz_order_api_logs (
      request_uid,
      sync_run_id,
      bulk_action_id,
      account_id,
      account_code,
      section,
      request_type,
      api_endpoint,
      http_method,
      request_query,
      request_body,
      response_body,
      http_status_code,
      api_code,
      api_message,
      api_status,
      duration_ms,
      request_time,
      response_time,
      error_stack
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.request_uid,
      data.sync_run_id || null,
      data.bulk_action_id || null,
      data.account_id || null,
      data.account_code || null,
      data.section || "orders",
      data.request_type || "daraz_order_request",
      data.api_endpoint,
      data.http_method || "GET",
      jsonValue(data.request_query || {}),
      jsonValue(data.request_body || {}),
      jsonValue(data.response_body || {}),
      data.http_status_code || null,
      data.api_code || null,
      data.api_message || null,
      data.api_status || "success",
      data.duration_ms || null,
      data.request_time || new Date(),
      data.response_time || new Date(),
      data.error_stack || null,
    ]
  );
}

async function findLocalStatus(darazStatus) {
  const [rows] = await db.query(
    `
    SELECT local_status
    FROM daraz_order_status_mappings
    WHERE daraz_status = ? AND active_status = 1
    LIMIT 1
    `,
    [darazStatus || "unknown"]
  );

  return rows[0]?.local_status || "unknown";
}

async function upsertOrder(order) {
  const localStatus = await findLocalStatus(order.daraz_status);

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM daraz_orders
    WHERE account_code = ? AND order_id = ?
    LIMIT 1
    `,
    [order.account_code, order.order_id]
  );

  if (existingRows.length) {
    const id = existingRows[0].id;

    await db.query(
      `
      UPDATE daraz_orders
      SET
        order_number = ?,
        daraz_status = ?,
        local_status = ?,
        sync_status = 'updated',

        customer_first_name = ?,
        customer_last_name = ?,
        customer_full_name = ?,
        customer_email = ?,
        customer_phone = ?,

        shipping_name = ?,
        shipping_phone = ?,
        shipping_address_1 = ?,
        shipping_address_2 = ?,
        shipping_city = ?,
        shipping_region = ?,
        shipping_postcode = ?,
        shipping_country = ?,

        billing_name = ?,
        billing_phone = ?,
        billing_address = ?,

        payment_method = ?,
        payment_status = ?,
        currency = ?,
        items_count = ?,
        total_quantity = ?,

        subtotal = ?,
        shipping_fee = ?,
        voucher_amount = ?,
        discount_amount = ?,
        tax_amount = ?,
        total_amount = ?,

        order_created_at = ?,
        order_updated_at = ?,
        paid_at = ?,

        package_id = ?,
        shipment_provider = ?,
        shipment_type = ?,
        tracking_number = ?,

        last_synced_at = NOW(),
        raw_order_json = ?
      WHERE id = ?
      `,
      [
        order.order_number || null,
        order.daraz_status || null,
        localStatus,

        order.customer_first_name || null,
        order.customer_last_name || null,
        order.customer_full_name || null,
        order.customer_email || null,
        order.customer_phone || null,

        order.shipping_name || null,
        order.shipping_phone || null,
        order.shipping_address_1 || null,
        order.shipping_address_2 || null,
        order.shipping_city || null,
        order.shipping_region || null,
        order.shipping_postcode || null,
        order.shipping_country || null,

        order.billing_name || null,
        order.billing_phone || null,
        order.billing_address || null,

        order.payment_method || null,
        order.payment_status || null,
        order.currency || "LKR",
        order.items_count || 0,
        order.total_quantity || 0,

        order.subtotal || 0,
        order.shipping_fee || 0,
        order.voucher_amount || 0,
        order.discount_amount || 0,
        order.tax_amount || 0,
        order.total_amount || 0,

        normaliseDate(order.order_created_at),
        normaliseDate(order.order_updated_at),
        normaliseDate(order.paid_at),

        order.package_id || null,
        order.shipment_provider || null,
        order.shipment_type || null,
        order.tracking_number || null,

        jsonValue(order.raw_order_json || order),
        id,
      ]
    );

    return { id, action: "updated" };
  }

  const [result] = await db.query(
    `
    INSERT INTO daraz_orders (
      account_id,
      account_code,
      order_id,
      order_number,
      daraz_status,
      local_status,
      sync_status,

      customer_first_name,
      customer_last_name,
      customer_full_name,
      customer_email,
      customer_phone,

      shipping_name,
      shipping_phone,
      shipping_address_1,
      shipping_address_2,
      shipping_city,
      shipping_region,
      shipping_postcode,
      shipping_country,

      billing_name,
      billing_phone,
      billing_address,

      payment_method,
      payment_status,
      currency,
      items_count,
      total_quantity,

      subtotal,
      shipping_fee,
      voucher_amount,
      discount_amount,
      tax_amount,
      total_amount,

      order_created_at,
      order_updated_at,
      paid_at,

      package_id,
      shipment_provider,
      shipment_type,
      tracking_number,

      last_synced_at,
      raw_order_json
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, 'new',
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      NOW(), ?
    )
    `,
    [
      order.account_id || null,
      order.account_code,
      order.order_id,
      order.order_number || null,
      order.daraz_status || null,
      localStatus,

      order.customer_first_name || null,
      order.customer_last_name || null,
      order.customer_full_name || null,
      order.customer_email || null,
      order.customer_phone || null,

      order.shipping_name || null,
      order.shipping_phone || null,
      order.shipping_address_1 || null,
      order.shipping_address_2 || null,
      order.shipping_city || null,
      order.shipping_region || null,
      order.shipping_postcode || null,
      order.shipping_country || null,

      order.billing_name || null,
      order.billing_phone || null,
      order.billing_address || null,

      order.payment_method || null,
      order.payment_status || null,
      order.currency || "LKR",
      order.items_count || 0,
      order.total_quantity || 0,

      order.subtotal || 0,
      order.shipping_fee || 0,
      order.voucher_amount || 0,
      order.discount_amount || 0,
      order.tax_amount || 0,
      order.total_amount || 0,

      normaliseDate(order.order_created_at),
      normaliseDate(order.order_updated_at),
      normaliseDate(order.paid_at),

      order.package_id || null,
      order.shipment_provider || null,
      order.shipment_type || null,
      order.tracking_number || null,

      jsonValue(order.raw_order_json || order),
    ]
  );

  return { id: result.insertId, action: "inserted" };
}

async function upsertOrderItem(orderDbId, item) {
  const [rows] = await db.query(
    `
    SELECT id
    FROM daraz_order_items
    WHERE account_code = ? AND order_item_id = ?
    LIMIT 1
    `,
    [item.account_code, item.order_item_id]
  );

  if (rows.length) {
    const id = rows[0].id;

    await db.query(
      `
      UPDATE daraz_order_items
      SET
        package_id = ?,
        product_id = ?,
        sku = ?,
        shop_sku = ?,
        seller_sku = ?,
        product_name = ?,
        variation = ?,
        product_main_image = ?,
        product_url = ?,
        item_status = ?,
        local_item_status = ?,
        quantity = ?,
        currency = ?,
        unit_price = ?,
        paid_price = ?,
        shipping_fee = ?,
        voucher_amount = ?,
        tax_amount = ?,
        total_amount = ?,
        tracking_number = ?,
        shipment_provider = ?,
        raw_item_json = ?
      WHERE id = ?
      `,
      [
        item.package_id || null,
        item.product_id || null,
        item.sku || null,
        item.shop_sku || null,
        item.seller_sku || null,
        item.product_name || null,
        item.variation || null,
        item.product_main_image || null,
        item.product_url || null,
        item.item_status || null,
        item.local_item_status || "unknown",
        item.quantity || 1,
        item.currency || "LKR",
        item.unit_price || 0,
        item.paid_price || 0,
        item.shipping_fee || 0,
        item.voucher_amount || 0,
        item.tax_amount || 0,
        item.total_amount || 0,
        item.tracking_number || null,
        item.shipment_provider || null,
        jsonValue(item.raw_item_json || item),
        id,
      ]
    );

    return { id, action: "updated" };
  }

  const [result] = await db.query(
    `
    INSERT INTO daraz_order_items (
      order_id,
      account_code,
      daraz_order_id,
      order_item_id,
      package_id,
      product_id,
      sku,
      shop_sku,
      seller_sku,
      product_name,
      variation,
      product_main_image,
      product_url,
      item_status,
      local_item_status,
      quantity,
      currency,
      unit_price,
      paid_price,
      shipping_fee,
      voucher_amount,
      tax_amount,
      total_amount,
      tracking_number,
      shipment_provider,
      raw_item_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderDbId,
      item.account_code,
      item.daraz_order_id,
      item.order_item_id,
      item.package_id || null,
      item.product_id || null,
      item.sku || null,
      item.shop_sku || null,
      item.seller_sku || null,
      item.product_name || null,
      item.variation || null,
      item.product_main_image || null,
      item.product_url || null,
      item.item_status || null,
      item.local_item_status || "unknown",
      item.quantity || 1,
      item.currency || "LKR",
      item.unit_price || 0,
      item.paid_price || 0,
      item.shipping_fee || 0,
      item.voucher_amount || 0,
      item.tax_amount || 0,
      item.total_amount || 0,
      item.tracking_number || null,
      item.shipment_provider || null,
      jsonValue(item.raw_item_json || item),
    ]
  );

  return { id: result.insertId, action: "inserted" };
}

async function listOrders(filters = {}) {
  const where = ["o.deleted_at IS NULL"];
  const params = [];

  if (filters.account_code) {
    where.push("o.account_code = ?");
    params.push(filters.account_code);
  }

  if (filters.status) {
    where.push("(o.local_status = ? OR o.daraz_status = ?)");
    params.push(filters.status, filters.status);
  }

  if (filters.search) {
    where.push(`
      (
        o.order_id LIKE ?
        OR o.order_number LIKE ?
        OR o.customer_full_name LIKE ?
        OR o.customer_phone LIKE ?
        OR o.tracking_number LIKE ?
      )
    `);

    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s);
  }

  if (filters.date_from) {
    where.push("o.order_created_at >= ?");
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    where.push("o.order_created_at <= ?");
    params.push(filters.date_to);
  }

  const limit = Math.min(Number(filters.limit || 50), 200);
  const offset = Math.max(Number(filters.offset || 0), 0);

  const [rows] = await db.query(
    `
    SELECT
      o.*,

      (
        SELECT i.product_main_image
        FROM daraz_order_items i
        WHERE i.order_id = o.id
        ORDER BY i.id ASC
        LIMIT 1
      ) AS main_image,

      (
        SELECT i.product_name
        FROM daraz_order_items i
        WHERE i.order_id = o.id
        ORDER BY i.id ASC
        LIMIT 1
      ) AS first_product_name,

      (
        SELECT COUNT(*)
        FROM daraz_order_items i
        WHERE i.order_id = o.id
      ) AS item_rows_count,

      (
        SELECT t.tracking_status
        FROM daraz_order_tracking_events t
        WHERE t.order_id = o.id
        ORDER BY t.event_time DESC, t.id DESC
        LIMIT 1
      ) AS latest_tracking_status,

      (
        SELECT t.tracking_description
        FROM daraz_order_tracking_events t
        WHERE t.order_id = o.id
        ORDER BY t.event_time DESC, t.id DESC
        LIMIT 1
      ) AS latest_tracking_description

    FROM daraz_orders o
    WHERE ${where.join(" AND ")}
    ORDER BY COALESCE(o.order_created_at, o.created_at) DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM daraz_orders o
    WHERE ${where.join(" AND ")}
    `,
    params
  );

  return {
    rows,
    total: countRow.total,
    limit,
    offset,
  };
}

async function getOrderDetail(id) {
  const [orders] = await db.query(
    `
    SELECT *
    FROM daraz_orders
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  const order = orders[0] || null;
  if (!order) return null;

  const [items] = await db.query(
    `
    SELECT *
    FROM daraz_order_items
    WHERE order_id = ?
    ORDER BY id ASC
    `,
    [id]
  );

  const [tracking] = await db.query(
    `
    SELECT *
    FROM daraz_order_tracking_events
    WHERE order_id = ?
    ORDER BY event_time DESC, id DESC
    `,
    [id]
  );

  const [awb] = await db.query(
    `
    SELECT *
    FROM daraz_order_awb_documents
    WHERE order_id = ?
    ORDER BY id DESC
    `,
    [id]
  );

  const [history] = await db.query(
    `
    SELECT *
    FROM daraz_order_status_history
    WHERE order_id = ?
    ORDER BY id DESC
    `,
    [id]
  );

  return {
    order,
    items,
    tracking,
    awb,
    history,
  };
}

async function getOrderById(id) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM daraz_orders
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}


async function getOrderItemsByOrderId(orderId) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM daraz_order_items
    WHERE order_id = ?
    ORDER BY id ASC
    `,
    [orderId]
  );

  return rows;
}

async function updateOrderItemsStatus(orderId, data = {}) {
  const darazStatus = data.daraz_status || data.item_status || data.status || null;
  const localStatus = data.local_status || (darazStatus ? await findLocalStatus(darazStatus) : null);

  await db.query(
    `
    UPDATE daraz_order_items
    SET
      item_status = COALESCE(?, item_status),
      local_item_status = COALESCE(?, local_item_status),
      updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
    `,
    [darazStatus, localStatus, orderId]
  );

  return localStatus;
}

async function insertStatusHistory(data) {
  await db.query(
    `
    INSERT INTO daraz_order_status_history (
      order_id,
      order_item_id,
      account_code,
      daraz_order_id,
      daraz_order_item_id,
      old_daraz_status,
      new_daraz_status,
      old_local_status,
      new_local_status,
      change_source,
      daraz_api_called,
      daraz_api_success,
      request_payload,
      response_payload,
      error_code,
      error_message,
      changed_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.order_id,
      data.order_item_id || null,
      data.account_code,
      data.daraz_order_id,
      data.daraz_order_item_id || null,
      data.old_daraz_status || null,
      data.new_daraz_status || null,
      data.old_local_status || null,
      data.new_local_status || null,
      data.change_source || "user_action",
      data.daraz_api_called ? 1 : 0,
      data.daraz_api_success ? 1 : 0,
      jsonValue(data.request_payload || {}),
      jsonValue(data.response_payload || {}),
      data.error_code || null,
      data.error_message || null,
      data.changed_by || null,
    ]
  );
}

async function updateOrderStatus(id, data) {
  const localStatus = await findLocalStatus(data.daraz_status);

  await db.query(
    `
    UPDATE daraz_orders
    SET
      daraz_status = ?,
      local_status = ?,
      sync_status = 'synced',
      last_status_sync_at = NOW()
    WHERE id = ?
    `,
    [data.daraz_status, localStatus, id]
  );

  return localStatus;
}

async function markAwbGenerated(id, data) {
  await db.query(
    `
    INSERT INTO daraz_order_awb_documents (
      order_id,
      account_code,
      daraz_order_id,
      package_id,
      awb_number,
      tracking_number,
      document_type,
      file_type,
      file_url,
      local_file_path,
      print_status,
      generated_at,
      api_response_json,
      error_message,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
    `,
    [
      id,
      data.account_code,
      data.daraz_order_id,
      data.package_id || null,
      data.awb_number || null,
      data.tracking_number || null,
      data.document_type || "awb",
      data.file_type || "url",
      data.file_url || null,
      data.local_file_path || null,
      data.print_status || "generated",
      jsonValue(data.api_response_json || {}),
      data.error_message || null,
      data.created_by || null,
    ]
  );

  await db.query(
    `
    UPDATE daraz_orders
    SET
      awb_printed = 1,
      awb_printed_at = NOW(),
      awb_print_count = awb_print_count + 1
    WHERE id = ?
    `,
    [id]
  );
}

async function listApiLogs(filters = {}) {
  const limit = Math.min(Number(filters.limit || 100), 500);

  const [rows] = await db.query(
    `
    SELECT *
    FROM daraz_order_api_logs
    ORDER BY id DESC
    LIMIT ?
    `,
    [limit]
  );

  return rows;
}

async function listSyncLogs(filters = {}) {
  const limit = Math.min(Number(filters.limit || 100), 500);

  const [rows] = await db.query(
    `
    SELECT *
    FROM daraz_order_sync_runs
    ORDER BY id DESC
    LIMIT ?
    `,
    [limit]
  );

  return rows;
}

module.exports = {
  createSyncRun,
  finishSyncRun,
  updateSyncSettings,
  getSyncSettings,
  logApi,
  upsertOrder,
  upsertOrderItem,
  listOrders,
  getOrderDetail,
  getOrderById,
  getOrderItemsByOrderId,
  updateOrderItemsStatus,
  insertStatusHistory,
  updateOrderStatus,
  markAwbGenerated,
  listApiLogs,
  listSyncLogs,
  findLocalStatus,
};