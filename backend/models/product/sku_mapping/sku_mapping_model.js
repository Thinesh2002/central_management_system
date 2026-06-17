const db = require("../../../config/db");

// Create or Update mapping
exports.upsertMapping = async (data) => {
  const { account_code, daraz_sku, correct_sku, product_id } = data;

  const [result] = await db.query(
    `
    INSERT INTO daraz_sku_mapping 
    (account_code, daraz_sku, correct_sku, product_id)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        correct_sku = VALUES(correct_sku),
        product_id = VALUES(product_id),
        updated_at = CURRENT_TIMESTAMP
    `,
    [account_code, daraz_sku, correct_sku, product_id]
  );

  return result;
};

// Get mappings
exports.getMappings = async (account_code) => {
  const [rows] = await db.query(
    `
    SELECT *
    FROM daraz_sku_mapping
    WHERE account_code = ?
    ORDER BY updated_at DESC
    `,
    [account_code]
  );

  return rows;
};

// Delete mapping
exports.deleteMapping = async (account_code, daraz_sku) => {
  const [result] = await db.query(
    `
    DELETE FROM daraz_sku_mapping
    WHERE account_code = ?
    AND daraz_sku = ?
    `,
    [account_code, daraz_sku]
  );

  return result;
};
