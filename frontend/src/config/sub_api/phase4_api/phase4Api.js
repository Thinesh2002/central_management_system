import api from '../../api';

export const phase4Api = {
  dashboard() { return api.get('/phase4/dashboard'); },
  roles() { return api.get('/phase4/roles'); },
  createRole(data = {}) { return api.post('/phase4/roles', data); },
  updateRolePermissions(roleId, permission_codes = []) { return api.put(`/phase4/roles/${encodeURIComponent(roleId)}/permissions`, { permission_codes }); },
  auditLogs(params = {}) { return api.get('/phase4/audit-logs', { params }); },
  backups(params = {}) { return api.get('/phase4/backups', { params }); },
  runBackup(data = {}) { return api.post('/phase4/backups/run', data); },
  migrations(params = {}) { return api.get('/phase4/migrations', { params }); },
  runMigration(data = {}) { return api.post('/phase4/migrations/run', data); },
  orderProfit(params = {}) { return api.get('/phase4/order-profit', { params }); },
  saveOrderProfit(data = {}) { return api.post('/phase4/order-profit', data); },
  returns(params = {}) { return api.get('/phase4/returns', { params }); },
  createReturn(data = {}) { return api.post('/phase4/returns', data); },
  courier() { return api.get('/phase4/courier'); },
  createCourierAccount(data = {}) { return api.post('/phase4/courier/accounts', data); },
  createShipment(data = {}) { return api.post('/phase4/courier/shipments', data); },
  updateShipmentStatus(id, data = {}) { return api.patch(`/phase4/courier/shipments/${encodeURIComponent(id)}/status`, data); },
  bulkJobs(params = {}) { return api.get('/phase4/bulk/jobs', { params }); },
  createBulkJob(data = {}) { return api.post('/phase4/bulk/jobs', data); },
  notifications(params = {}) { return api.get('/phase4/notifications', { params }); },
  markNotificationRead(id, is_read = true) { return api.patch(`/phase4/notifications/${encodeURIComponent(id)}/read`, { is_read }); },
  productQuality(params = {}) { return api.get('/phase4/product-quality', { params }); },
  recalculateProductQuality() { return api.post('/phase4/product-quality/recalculate'); },
  queues(params = {}) { return api.get('/phase4/queues', { params }); },
  createQueueJob(data = {}) { return api.post('/phase4/queues', data); },
};

export default phase4Api;
