const db = require("../../config/db"); // products DB
const OMDB = require("../../config/order_management_db"); // orders DB

exports.getProductTrend = async () => {

  // 1️⃣ Get SKU Mapping
  const [mappings] = await db.query(`
    SELECT daraz_sku, correct_sku
    FROM daraz_sku_mapping
  `);

  const skuMap = {};
  for (const m of mappings) {
    skuMap[m.daraz_sku] = m.correct_sku;
  }

  // 2️⃣ Get Sales + order_items image
  const [sales] = await OMDB.query(`
    SELECT 
      oi.sku,
      MAX(oi.image) AS order_image,

      SUM(CASE 
        WHEN o.created_at_daraz >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        THEN oi.quantity ELSE 0 END
      ) AS last_30_days_qty,

      SUM(oi.quantity) AS last_90_days_qty,

      SUM(oi.quantity * oi.price) AS total_sales_amount

    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.order_status = 'delivered'
    AND o.created_at_daraz >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY oi.sku
  `);

  // 3️⃣ Get All Product SKUs + main_image
  const [products] = await db.query(`
    SELECT sku, main_image
    FROM products
  `);

  const productMap = {};
  for (const p of products) {
    productMap[p.sku] = p.main_image;
  }

  // 4️⃣ Process Trend + Mapping Status
  const result = [];

  for (const row of sales) {

    const originalSku = row.sku;
    const mappedSku = skuMap[originalSku];
    const finalSku = mappedSku || originalSku;

    let mappingStatus = "NOT_MAPPED";

    if (mappedSku) {
      if (productMap[mappedSku]) {
        mappingStatus = "CORRECT_SKU";
      } else {
        mappingStatus = "WRONG_SKU";
      }
    }

    result.push({
      original_sku: originalSku,
      final_sku: finalSku,
      mapping_status: mappingStatus,

      last_30_days_qty: Number(row.last_30_days_qty || 0),
      last_90_days_qty: Number(row.last_90_days_qty || 0),
      total_sales_amount: Number(row.total_sales_amount || 0),

      product_main_image: productMap[finalSku] || null,
      order_item_image: row.order_image || null
    });
  }

  // Sort by 30 days qty
  result.sort((a, b) => b.last_30_days_qty - a.last_30_days_qty);

  return result;
};
