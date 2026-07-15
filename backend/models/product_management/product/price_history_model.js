const db = require("../../../config/price_management_db/price_management_db");

// price_history was defined in the base schema (05_price_management.sql)
// as a generic field-change log but never wired to any code until now -
// GRN receipts are the first real writer, logging cost_price changes.
async function create({
  sku,
  field_name: fieldName,
  old_value: oldValue = null,
  new_value: newValue = null,
  changed_by: changedBy = null,
}) {
  await db.query(
    `INSERT INTO price_history (sku, field_name, old_value, new_value, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [sku, fieldName, oldValue, newValue, changedBy]
  );
}

async function listBySku(sku, { field_name: fieldName, limit = 100 } = {}) {
  const params = [sku];
  let whereSql = "WHERE sku = ?";

  if (fieldName) {
    whereSql += " AND field_name = ?";
    params.push(fieldName);
  }

  const [rows] = await db.query(
    `SELECT * FROM price_history ${whereSql} ORDER BY id DESC LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

module.exports = { create, listBySku };
