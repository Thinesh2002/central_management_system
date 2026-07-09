const db = require("../../config/message_management_db/message_management_db");

async function list() {
  const [rows] = await db.query("SELECT * FROM message_templates ORDER BY name ASC");
  return rows;
}

async function findById(id) {
  const [rows] = await db.query("SELECT * FROM message_templates WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function create({ name, trigger_key: triggerKey, content, is_active: isActive, created_by: createdBy }) {
  const [result] = await db.query(
    `INSERT INTO message_templates (name, trigger_key, content, is_active, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, triggerKey || "custom", content, isActive === undefined ? 1 : isActive ? 1 : 0, createdBy || null, createdBy || null]
  );

  return findById(result.insertId);
}

async function update(id, payload = {}) {
  const columns = [];
  const values = [];

  if (payload.name !== undefined) {
    columns.push("name = ?");
    values.push(payload.name);
  }

  if (payload.trigger_key !== undefined) {
    columns.push("trigger_key = ?");
    values.push(payload.trigger_key);
  }

  if (payload.content !== undefined) {
    columns.push("content = ?");
    values.push(payload.content);
  }

  if (payload.is_active !== undefined) {
    columns.push("is_active = ?");
    values.push(payload.is_active ? 1 : 0);
  }

  if (payload.updated_by !== undefined) {
    columns.push("updated_by = ?");
    values.push(payload.updated_by);
  }

  if (!columns.length) return findById(id);

  await db.query(`UPDATE message_templates SET ${columns.join(", ")} WHERE id = ?`, [...values, id]);

  return findById(id);
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

module.exports = { list, findById, create, update, remove, renderTemplate };
