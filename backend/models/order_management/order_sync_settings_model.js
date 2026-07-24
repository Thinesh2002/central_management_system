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

// Gates the SCHEDULED/cron-triggered sync only — "Run Sync Now" always runs
// unconditionally (an explicit manual click shouldn't be silently ignored).
// sync_enabled/auto_sync_enabled/sync_interval_minutes previously existed on
// the settings form but nothing ever read them - both the Daraz and Woo cron
// jobs ran on a hardcoded */30 schedule regardless of what was saved here.
function isScheduledSyncDue(settings) {
  if (!settings) return true;
  if (!settings.sync_enabled || !settings.auto_sync_enabled) return false;
  if (!settings.last_sync_started_at) return true;

  const intervalMinutes = Number(settings.sync_interval_minutes) > 0 ? Number(settings.sync_interval_minutes) : 30;
  const elapsedMs = Date.now() - new Date(settings.last_sync_started_at).getTime();

  return elapsedMs >= intervalMinutes * 60 * 1000;
}

async function recordSyncStart() {
  const current = await getSettings();
  if (!current) return;

  await model.update(current.id, {
    last_sync_started_at: new Date(),
    last_sync_status: "running",
  });
}

async function recordSyncResult({ success, errorMessage = null } = {}) {
  const current = await getSettings();
  if (!current) return;

  const intervalMinutes = Number(current.sync_interval_minutes) > 0 ? Number(current.sync_interval_minutes) : 30;

  await model.update(current.id, {
    last_sync_finished_at: new Date(),
    last_sync_status: success ? "success" : "failed",
    last_error_message: errorMessage,
    next_sync_at: new Date(Date.now() + intervalMinutes * 60 * 1000),
  });
}

module.exports = {
  getSettings,
  updateSettings,
  isScheduledSyncDue,
  recordSyncStart,
  recordSyncResult,
  READONLY_COLUMNS,
};
