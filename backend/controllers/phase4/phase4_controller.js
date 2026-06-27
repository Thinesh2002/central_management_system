const asyncHandler = require('../../middleware/async_handler');
const model = require('../../models/phase4/phase4_model');

function ok(res, message, data, extra = {}) {
  return res.json({ success: true, message, data, ...extra });
}

const dashboard = asyncHandler(async (req, res) => ok(res, 'Phase 4 dashboard loaded.', await model.dashboard()));

const roles = asyncHandler(async (req, res) => ok(res, 'Roles and permissions loaded.', await model.rolesAndPermissions()));
const createRole = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Role saved successfully.', data: await model.createRole(req.body || {}, req) }));
const updateRolePermissions = asyncHandler(async (req, res) => ok(res, 'Role permissions updated.', await model.updateRolePermissions(req.params.roleId, req.body?.permission_codes || req.body?.permissions || [], req)));

const auditLogs = asyncHandler(async (req, res) => {
  const result = await model.listAuditLogs(req.query || {});
  return ok(res, 'Audit logs loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});
const createAuditLog = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Audit log saved.', data: await model.addAuditLog(req.body || {}) }));

const backups = asyncHandler(async (req, res) => {
  const result = await model.listBackups(req.query || {});
  return ok(res, 'Backup runs loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});
const runBackup = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Backup run completed.', data: await model.runBackup(req.body || {}, req) }));

const migrations = asyncHandler(async (req, res) => {
  const result = await model.listMigrations(req.query || {});
  return ok(res, 'Migration history loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});
const runMigration = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Migration completed.', data: await model.runMigration(req.body || {}, req) }));

const orderProfit = asyncHandler(async (req, res) => {
  const result = await model.orderProfit(req.query || {});
  return ok(res, 'Order profit report loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});
const saveOrderProfit = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Order profit saved.', data: await model.saveOrderProfit(req.body || {}, req) }));

const returns = asyncHandler(async (req, res) => {
  const result = await model.listReturns(req.query || {});
  return ok(res, 'Return/refund data loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});
const createReturn = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Return/refund created.', data: await model.createReturn(req.body || {}, req) }));

const courier = asyncHandler(async (req, res) => ok(res, 'Courier dashboard loaded.', await model.courierDashboard(req.query || {})));
const createCourierAccount = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Courier account saved.', data: await model.createCourierAccount(req.body || {}, req) }));
const createShipment = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Shipment created.', data: await model.createShipment(req.body || {}, req) }));
const updateShipmentStatus = asyncHandler(async (req, res) => ok(res, 'Shipment status updated.', await model.updateShipmentStatus(req.params.id, req.body || {}, req)));

const bulkJobs = asyncHandler(async (req, res) => {
  const result = await model.bulkJobs(req.query || {});
  return ok(res, 'Bulk jobs loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});
const createBulkJob = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Bulk job created.', data: await model.createBulkJob(req.body || {}, req) }));

const notifications = asyncHandler(async (req, res) => {
  const result = await model.notifications(req.query || {});
  return ok(res, 'Notifications loaded.', result.rows, { rows: result.rows, pagination: result.pagination });
});
const markNotificationRead = asyncHandler(async (req, res) => ok(res, 'Notification updated.', await model.markNotificationRead(req.params.id, req.body?.is_read !== false, req)));

const productQuality = asyncHandler(async (req, res) => {
  const result = await model.productQuality(req.query || {});
  return ok(res, 'Product quality loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});
const recalculateProductQuality = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Product quality recalculated.', data: await model.recalculateProductQuality(req) }));

const queues = asyncHandler(async (req, res) => {
  const result = await model.queues(req.query || {});
  return ok(res, 'Queue jobs loaded.', result.rows, { rows: result.rows, summary: result.summary, pagination: result.pagination });
});
const createQueueJob = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Queue job created.', data: await model.createQueueJob(req.body || {}, req) }));

module.exports = {
  dashboard,
  roles,
  createRole,
  updateRolePermissions,
  auditLogs,
  createAuditLog,
  backups,
  runBackup,
  migrations,
  runMigration,
  orderProfit,
  saveOrderProfit,
  returns,
  createReturn,
  courier,
  createCourierAccount,
  createShipment,
  updateShipmentStatus,
  bulkJobs,
  createBulkJob,
  notifications,
  markNotificationRead,
  productQuality,
  recalculateProductQuality,
  queues,
  createQueueJob,
};
