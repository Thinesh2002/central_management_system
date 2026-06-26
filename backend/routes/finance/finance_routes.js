const express = require('express');
const controller = require('../../controllers/finance/finance_controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/net-sales/summary', controller.summary);
router.get('/net-sales/daily', controller.daily);
router.get('/net-sales/channel-wise', controller.channelWise);
router.get('/net-sales/order-wise', controller.orderWise);
router.get('/net-sales/top-products', controller.topProducts);
router.get('/net-sales/expenses', controller.expenses);
router.post('/expenses', controller.createExpense);
router.put('/expenses/:id', controller.updateExpense);
router.delete('/expenses/:id', controller.deleteExpense);
router.post('/recalculate', controller.recalculate);

module.exports = router;
