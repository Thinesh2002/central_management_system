const db = require("../../config/order_management_db");

exports.getAllAccounts = async () => {
  const [rows] = await db.query(
    "SELECT * FROM daraz_accounts"
  );
  return rows;
};

exports.updateLastSync = async (account_code) => {
  await db.query(
    "UPDATE daraz_accounts SET last_sync_time = NOW() WHERE account_code = ?",
    [account_code]
  );
};

exports.getAccountByCode = async (account_code) => {
  const [rows] = await db.query(
    "SELECT * FROM daraz_accounts WHERE account_code = ?",
    [account_code]
  );

  return rows[0];
};