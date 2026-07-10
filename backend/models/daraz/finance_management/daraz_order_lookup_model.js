const db = require("../../../config/order_management_db/order_management_db");

const IMAGE_COLUMN_CANDIDATES = [
  "product_main_image",
  "product_image_url",
  "image_url",
  "image",
  "product_image",
];

const TITLE_COLUMN_CANDIDATES = ["product_title", "name", "product_name", "title"];

let cachedItemColumns = null;

async function getDarazOrderItemColumns() {
  if (cachedItemColumns) return cachedItemColumns;

  const [rows] = await db.query(`SHOW COLUMNS FROM daraz_order_items`);
  const existing = new Set(rows.map((row) => row.Field));

  cachedItemColumns = {
    image: IMAGE_COLUMN_CANDIDATES.find((name) => existing.has(name)) || null,
    title: TITLE_COLUMN_CANDIDATES.find((name) => existing.has(name)) || null,
  };

  return cachedItemColumns;
}

function qid(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function inClause(values) {
  return values.map(() => "?").join(",");
}

// Daraz Finance transactions only carry the order number, not a thumbnail —
// this cross-references the actual synced Daraz orders (cm_order_management)
// to pull the first item's image/title for display on the finance page.
async function getOrderThumbnailsByOrderNos(orderNos = []) {
  const uniqueOrderNos = [...new Set(orderNos.filter(Boolean).map(String))];
  if (!uniqueOrderNos.length) return {};

  const { image, title } = await getDarazOrderItemColumns();

  const selectImage = image ? `i.${qid(image)}` : "NULL";
  const selectTitle = title ? `i.${qid(title)}` : "NULL";

  const [rows] = await db.query(
    `SELECT o.order_number AS order_no, ${selectImage} AS thumbnail_url, ${selectTitle} AS product_title
     FROM daraz_orders o
     LEFT JOIN daraz_order_items i ON i.daraz_order_id = o.id
     WHERE o.order_number IN (${inClause(uniqueOrderNos)})
     ORDER BY o.id ASC, i.id ASC`,
    uniqueOrderNos
  );

  // First row per order_no wins (i.e. the first line item's image) — dedup
  // here in JS rather than SQL GROUP BY to sidestep ONLY_FULL_GROUP_BY.
  const map = {};
  rows.forEach((row) => {
    if (!row.order_no || map[row.order_no]) return;
    map[row.order_no] = {
      thumbnail_url: row.thumbnail_url || null,
      product_title: row.product_title || null,
    };
  });

  return map;
}

module.exports = { getOrderThumbnailsByOrderNos };
