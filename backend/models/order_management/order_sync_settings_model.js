const { createGenericModel, db } = require("./_shared/generic_table_model");

const model = createGenericModel("order_sync_settings");

// created_at/updated_at/id are structural, not something a settings form
// should let anyone edit directly. Columns matching last_sync_* / *_at are
// written by the sync job itself (e.g. last_sync_started_at) — the settings
// form round-trips whatever GET returned, so these must stay out of the
// writable payload or a no-op save silently clobbers the sync job's own
// tracking data.
const READONLY_COLUMNS = new Set(["id", "created_at", "updated_at"]);
const READONLY_PATTERN = /(^last_sync|_at$)/i;

async function getSettings() {
  const [rows] = await db.query("SELECT * FROM order_sync_settings ORDER BY id ASC LIMIT 1");
  return rows[0] || null;
}

async function updateSettings(data = {}) {
  const current = await getSettings();

  const payload = { ...data };
  Object.keys(payload).forEach((column) => {
    if (READONLY_COLUMNS.has(column) || READONLY_PATTERN.test(column)) delete payload[column];
  });

  if (!current) {
    return model.create(payload);
  }

  return model.update(current.id, payload);
}

module.exports = { getSettings, updateSettings, READONLY_COLUMNS };
