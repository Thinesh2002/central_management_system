const Fdb = require("../../../config/finance_db");

const getAllFinanceWithImage = async () => {
  const query = `
    SELECT 
      f.id,
      f.account_code,
      f.transaction_number,
      f.order_no,
      f.orderItem_no,
      f.transaction_date,
      f.fee_type,
      f.fee_name,
      f.transaction_type,
      f.amount,
      f.VAT_in_amount,
      f.WHT_amount,
      f.paid_status,

      -- PRODUCT DATA FROM ORDER ITEMS
      oi.product_name,
      oi.sku AS seller_sku,
      oi.quantity,
      oi.price,
      oi.image AS product_image

    FROM daraz_finance_transactions f
    LEFT JOIN order_management_db.order_items oi
      ON CAST(f.order_no AS CHAR) = CAST(oi.order_id AS CHAR)

    ORDER BY f.id DESC
  `;

  const [rows] = await Fdb.query(query);
  return rows;
};

module.exports = {
  getAllFinanceWithImage
};