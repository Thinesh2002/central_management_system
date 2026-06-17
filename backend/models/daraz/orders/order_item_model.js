const db = require("../../../config/order_management_db");
const Fdb = require("../../../config/finance_db");

/*
----------------------------------
GET ALL ORDER ITEMS
----------------------------------
*/
const getOrderItems = async () => {
  const [rows] = await db.query(
    "SELECT * FROM order_items ORDER BY id DESC"
  );
  return rows;
};


/*
----------------------------------
GET FINANCE WITH PRODUCT DATA
----------------------------------
*/
const getFinanceWithImage = async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id,
        f.account_code,
        f.transaction_number,
        f.order_no,
        f.fee_name,
        f.amount,

        oi.product_name,
        oi.sku AS seller_sku,
        oi.quantity,
        oi.price,
        oi.image AS product_image

      FROM daraz_finance_transactions f
      LEFT JOIN order_management_db.order_items oi 
        ON f.order_no = oi.order_id

      ORDER BY f.id DESC
    `;

    const [rows] = await Fdb.query(query);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("Finance With Product Data Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance data with product data",
      error: error.message
    });
  }
};

module.exports = {
  getOrderItems,
  getFinanceWithImage
};