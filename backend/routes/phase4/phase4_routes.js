const express = require('express');
const controller = require('../../controllers/phase4/phase4_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/dashboard', controller.dashboard);

router.get('/roles', controller.roles);
router.post('/roles', controller.createRole);
router.put('/roles/:roleId/permissions', controller.updateRolePermissions);
router.patch('/roles/:roleId/permissions', controller.updateRolePermissions);

router.get('/audit-logs', controller.auditLogs);
router.post('/audit-logs', controller.createAuditLog);

router.get('/backups', controller.backups);
router.post('/backups/run', controller.runBackup);

router.get('/migrations', controller.migrations);
router.post('/migrations/run', controller.runMigration);

router.get('/order-profit', controller.orderProfit);
router.post('/order-profit', controller.saveOrderProfit);

router.get('/returns', controller.returns);
router.post('/returns', controller.createReturn);

router.get('/courier', controller.courier);
router.post('/courier/accounts', controller.createCourierAccount);
router.post('/courier/shipments', controller.createShipment);
router.patch('/courier/shipments/:id/status', controller.updateShipmentStatus);

router.get('/bulk/jobs', controller.bulkJobs);
router.post('/bulk/jobs', controller.createBulkJob);

router.get('/notifications', controller.notifications);
router.patch('/notifications/:id/read', controller.markNotificationRead);

router.get('/product-quality', controller.productQuality);
router.post('/product-quality/recalculate', controller.recalculateProductQuality);

router.get('/queues', controller.queues);
router.post('/queues', controller.createQueueJob);

module.exports = router;
