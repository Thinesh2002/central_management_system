const express = require('express');
const controller = require('../../../controllers/daraz/daraz_orders/daraz_order_status_controller');
const { protect } = require('../../../middleware/auth');

const router = express.Router();
router.use(protect);
router.post('/pack', controller.pack);
router.post('/ready-to-ship', controller.readyToShip);
router.post('/cancel', controller.cancel);
router.post('/sync', controller.syncStatus);
router.post('/print-awb', controller.printAwb);
router.post('/print-invoice', controller.printInvoice);
router.post('/invoice-number', controller.setInvoiceNumber);
router.post('/sync-tracking', controller.syncTracking);
module.exports = router;
