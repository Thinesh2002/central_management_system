const { createGenericModel, db } = require("./_shared/generic_table_model");

const model = createGenericModel("order_sync_settings");

// created_at/updated_at/id are structural, not something a settings form
// should let anyone edit directly.
const READONLY_COLUMNS = new Set(["id", "created_at", "updated_at"]);

async function getSettings() {
  const [rows] = await db.query("SELECT * FROM order_sync_settings ORDER BY id ASC LIMIT 1");
  return rows[0] || null;
}

async function updateSettings(data = {}) {
  const current = await getSettings();

  const payload = { ...data };
  READONLY_COLUMNS.forEach((column) => delete payload[column]);

  if (!current) {
    return model.create(payload);
  }

  return model.update(current.id, payload);
}

module.exports = { getSettings, updateSettings, READONLY_COLUMNS };
