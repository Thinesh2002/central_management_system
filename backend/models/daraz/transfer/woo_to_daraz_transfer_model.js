const productDb = require("../../../config/product_management_db");
const orderDb = require("../../../config/order_management_db");

exports.getSelectedAccounts = async (accountCodes) => {
  const [rows] = await orderDb.query(
    `
    SELECT *
    FROM daraz_accounts
    WHERE account_code IN (?)
    AND token_expired = 0
    `,
    [accountCodes]
  );

  return rows;
};

exports.insertTransferLog = async ({
  woo_product_id,
  daraz_item_id,
  daraz_sku_id,
  account_code,
  account_name,
  status,
  message,
}) => {
  const [result] = await productDb.query(
    `
    INSERT INTO daraz_transfer_logs
    (
      woo_product_id,
      daraz_item_id,
      daraz_sku_id,
      account_code,
      account_name,
      status,
      message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      woo_product_id || null,
      daraz_item_id || null,
      daraz_sku_id || null,
      account_code || null,
      account_name || null,
      status,
      message || null,
    ]
  );

  return result;
};