const db = require("../../../config/product_management_db");

exports.upsertMapping = async (data) => {
  const account_code = data.account_code;
  const daraz_seller_sku = data.daraz_seller_sku || data.daraz_sku;
  const system_sku = data.system_sku || data.correct_sku;
  const product_id = data.product_id || null;

  const [result] = await db.query(
    `
    INSERT INTO daraz_sku_mapping 
    (account_code, daraz_seller_sku, system_sku, correct_sku, product_id, mapping_status, notes)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
    ON DUPLICATE KEY UPDATE
        system_sku = VALUES(system_sku),
        correct_sku = VALUES(correct_sku),
        product_id = VALUES(product_id),
        notes = VALUES(notes),
        updated_at = CURRENT_TIMESTAMP
    `,
    [account_code, daraz_seller_sku, system_sku, system_sku, product_id, data.notes || null]
  );

  await db.query(
    `UPDATE daraz_skus SET system_sku = ? WHERE account_code = ? AND seller_sku = ?`,
    [system_sku, account_code, daraz_seller_sku]
  ).catch(() => null);

  return result;
};

exports.getMappings = async (account_code = null) => {
  let sql = `SELECT * FROM daraz_sku_mapping`;
  const params = [];
  if (account_code) {
    sql += ` WHERE account_code = ?`;
    params.push(account_code);
  }
  sql += ` ORDER BY updated_at DESC`;
  const [rows] = await db.query(sql, params);
  return rows;
};

exports.deleteMapping = async (account_code, daraz_sku) => {
  const [result] = await db.query(
    `DELETE FROM daraz_sku_mapping WHERE account_code = ? AND daraz_seller_sku = ?`,
    [account_code, daraz_sku]
  );
  return result;
};
