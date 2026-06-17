const db = require("../../config/product_management_db");


exports.createSupplier = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO suppliers
    (
      supplier_name,
      contact_person,
      phone,
      email,
      address,

      bank_name,
      bank_branch,
      account_holder_name,
      account_number,
      swift_code,

      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.supplier_name,
      data.contact_person || null,
      data.phone || null,
      data.email || null,
      data.address || null,

      data.bank_name || null,
      data.bank_branch || null,
      data.account_holder_name || null,
      data.account_number || null,
      data.swift_code || null,

      data.status || "active",
    ]
  );

  return result.insertId;
};

exports.getAllSuppliers = async ({ search = "", status = "" }) => {
  let sql = `
    SELECT 
      s.*,
      COUNT(sp.id) AS total_skus
    FROM suppliers s
    LEFT JOIN supplier_products sp ON sp.supplier_id = s.id
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        s.supplier_name LIKE ?
        OR s.contact_person LIKE ?
        OR s.phone LIKE ?
        OR s.email LIKE ?
        OR s.bank_name LIKE ?
        OR s.account_number LIKE ?
      )
    `;

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }

  if (status) {
    sql += ` AND s.status = ?`;
    params.push(status);
  }

  sql += `
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
};

exports.getSupplierById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM suppliers
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

exports.updateSupplier = async (id, data) => {
  const [result] = await db.query(
    `
    UPDATE suppliers
    SET
      supplier_name = ?,
      contact_person = ?,
      phone = ?,
      email = ?,
      address = ?,

      bank_name = ?,
      bank_branch = ?,
      account_holder_name = ?,
      account_number = ?,
      swift_code = ?,

      status = ?
    WHERE id = ?
    `,
    [
      data.supplier_name,
      data.contact_person || null,
      data.phone || null,
      data.email || null,
      data.address || null,

      data.bank_name || null,
      data.bank_branch || null,
      data.account_holder_name || null,
      data.account_number || null,
      data.swift_code || null,

      data.status || "active",
      id,
    ]
  );

  return result;
};

exports.deleteSupplier = async (id) => {
  const [result] = await db.query(
    `
    DELETE FROM suppliers
    WHERE id = ?
    `,
    [id]
  );

  return result;
};

/* =========================
   SUPPLIER PRODUCT MODEL
========================= */

exports.createSupplierProduct = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO supplier_products
    (
      supplier_id,
      sku,
      product_name,
      purchase_price,
      moq,
      lead_time_days,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.supplier_id,
      data.sku,
      data.product_name || null,
      data.purchase_price || 0,
      data.moq || 1,
      data.lead_time_days || 0,
      data.notes || null,
    ]
  );

  return result.insertId;
};

exports.getSupplierProducts = async ({ search = "", supplier_id = "" }) => {
  let sql = `
    SELECT 
      sp.*,
      s.supplier_name,
      s.phone,
      s.email,
      s.bank_name,
      s.account_holder_name,
      s.account_number
    FROM supplier_products sp
    INNER JOIN suppliers s ON s.id = sp.supplier_id
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        sp.sku LIKE ?
        OR sp.product_name LIKE ?
        OR s.supplier_name LIKE ?
      )
    `;

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword);
  }

  if (supplier_id) {
    sql += ` AND sp.supplier_id = ?`;
    params.push(supplier_id);
  }

  sql += ` ORDER BY sp.created_at DESC`;

  const [rows] = await db.query(sql, params);
  return rows;
};

exports.getSupplierProductById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM supplier_products
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

exports.getSupplierProductBySku = async (sku) => {
  const [rows] = await db.query(
    `
    SELECT 
      sp.*,
      s.supplier_name,
      s.contact_person,
      s.phone,
      s.email,
      s.address,
      s.bank_name,
      s.bank_branch,
      s.account_holder_name,
      s.account_number,
      s.swift_code
    FROM supplier_products sp
    INNER JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.sku = ?
    ORDER BY sp.purchase_price ASC
    `,
    [sku]
  );

  return rows;
};

exports.updateSupplierProduct = async (id, data) => {
  const [result] = await db.query(
    `
    UPDATE supplier_products
    SET
      supplier_id = ?,
      sku = ?,
      product_name = ?,
      purchase_price = ?,
      moq = ?,
      lead_time_days = ?,
      notes = ?
    WHERE id = ?
    `,
    [
      data.supplier_id,
      data.sku,
      data.product_name || null,
      data.purchase_price || 0,
      data.moq || 1,
      data.lead_time_days || 0,
      data.notes || null,
      id,
    ]
  );

  return result;
};

exports.deleteSupplierProduct = async (id) => {
  const [result] = await db.query(
    `
    DELETE FROM supplier_products
    WHERE id = ?
    `,
    [id]
  );

  return result;
};

exports.createShipment = async (data) => {
  const [result] = await db.query(
    `
    INSERT INTO supplier_shipments
    (
      supplier_id,
      shipment_code,
      shipment_date,
      expected_arrival_date,
      status,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      data.supplier_id,
      data.shipment_code,
      data.shipment_date || null,
      data.expected_arrival_date || null,
      data.status || "draft",
      data.notes || null,
    ]
  );

  return result.insertId;
};

exports.getShipments = async ({ search = "", supplier_id = "", status = "" }) => {
  let sql = `
    SELECT
      sh.*,
      s.supplier_name,
      s.phone,
      COUNT(so.id) AS total_orders,
      COALESCE(SUM(so.order_qty), 0) AS total_qty,
      COALESCE(SUM(so.total_amount), 0) AS total_amount
    FROM supplier_shipments sh
    INNER JOIN suppliers s ON s.id = sh.supplier_id
    LEFT JOIN supplier_shipment_orders so ON so.shipment_id = sh.id
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        sh.shipment_code LIKE ?
        OR s.supplier_name LIKE ?
        OR so.sku LIKE ?
        OR so.product_name LIKE ?
      )
    `;

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  if (supplier_id) {
    sql += ` AND sh.supplier_id = ?`;
    params.push(supplier_id);
  }

  if (status) {
    sql += ` AND sh.status = ?`;
    params.push(status);
  }

  sql += `
    GROUP BY sh.id
    ORDER BY sh.created_at DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
};

exports.getShipmentById = async (id) => {
  const [rows] = await db.query(
    `
    SELECT
      sh.*,
      s.supplier_name,
      s.contact_person,
      s.phone,
      s.email,
      s.address
    FROM supplier_shipments sh
    INNER JOIN suppliers s ON s.id = sh.supplier_id
    WHERE sh.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

exports.updateShipment = async (id, data) => {
  const [result] = await db.query(
    `
    UPDATE supplier_shipments
    SET
      supplier_id = ?,
      shipment_code = ?,
      shipment_date = ?,
      expected_arrival_date = ?,
      status = ?,
      notes = ?
    WHERE id = ?
    `,
    [
      data.supplier_id,
      data.shipment_code,
      data.shipment_date || null,
      data.expected_arrival_date || null,
      data.status || "draft",
      data.notes || null,
      id,
    ]
  );

  return result;
};

exports.deleteShipment = async (id) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
      DELETE FROM supplier_shipment_orders
      WHERE shipment_id = ?
      `,
      [id]
    );

    const [result] = await connection.query(
      `
      DELETE FROM supplier_shipments
      WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.createShipmentOrder = async (shipmentId, data) => {
  const totalAmount =
    Number(data.order_qty || 0) * Number(data.purchase_price || 0);

  const [result] = await db.query(
    `
    INSERT INTO supplier_shipment_orders
    (
      shipment_id,
      sku,
      product_name,
      order_qty,
      purchase_price,
      total_amount,
      received_qty,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      shipmentId,
      data.sku,
      data.product_name || null,
      data.order_qty || 0,
      data.purchase_price || 0,
      totalAmount,
      data.received_qty || 0,
      data.status || "ordered",
    ]
  );

  return result.insertId;
};

exports.getShipmentOrders = async (shipmentId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM supplier_shipment_orders
    WHERE shipment_id = ?
    ORDER BY created_at DESC
    `,
    [shipmentId]
  );

  return rows;
};

exports.getShipmentOrderById = async (orderId) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM supplier_shipment_orders
    WHERE id = ?
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0];
};

exports.updateShipmentOrder = async (orderId, data) => {
  const totalAmount =
    Number(data.order_qty || 0) * Number(data.purchase_price || 0);

  const [result] = await db.query(
    `
    UPDATE supplier_shipment_orders
    SET
      sku = ?,
      product_name = ?,
      order_qty = ?,
      purchase_price = ?,
      total_amount = ?,
      received_qty = ?,
      status = ?
    WHERE id = ?
    `,
    [
      data.sku,
      data.product_name || null,
      data.order_qty || 0,
      data.purchase_price || 0,
      totalAmount,
      data.received_qty || 0,
      data.status || "ordered",
      orderId,
    ]
  );

  return result;
};

exports.deleteShipmentOrder = async (orderId) => {
  const [result] = await db.query(
    `
    DELETE FROM supplier_shipment_orders
    WHERE id = ?
    `,
    [orderId]
  );

  return result;
};