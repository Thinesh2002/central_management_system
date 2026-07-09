const { createGenericModel, db } = require("./_shared/generic_table_model");

const model = createGenericModel("message_templates", { defaultSort: "id" });

async function listActive() {
  const [rows] = await db.query(
    "SELECT * FROM message_templates WHERE is_active = 1 ORDER BY name ASC"
  );
  return rows;
}

async function remove(id) {
  const [result] = await db.query("DELETE FROM message_templates WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

// Fills {{placeholder}} tokens with real order fields — unresolved tokens
// (a typo, or a field this order source doesn't have) are left blank rather
// than sent to the buyer literally as "{{...}}".
function renderTemplate(content, values = {}) {
  return String(content || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

module.exports = { ...model, listActive, remove, renderTemplate };
