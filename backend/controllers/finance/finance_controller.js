const asyncHandler = require('../../middleware/async_handler');
const financeModel = require('../../models/finance/finance_model');

function userId(req) { return req.user?.id || req.user?.user_uid || null; }
function ok(res, message, data, extra = {}) { return res.json({ success: true, message, data, ...extra }); }

const summary = asyncHandler(async (req, res) => ok(res, 'Net sales summary loaded.', await financeModel.summary(req.query || {})));
const daily = asyncHandler(async (req, res) => ok(res, 'Daily net sales loaded.', await financeModel.daily(req.query || {})));
const channelWise = asyncHandler(async (req, res) => ok(res, 'Channel-wise net sales loaded.', await financeModel.channelWise(req.query || {})));
const orderWise = asyncHandler(async (req, res) => { const result = await financeModel.orderWise(req.query || {}); return ok(res, 'Order-wise profit loaded.', result.rows, { rows: result.rows, pagination: result.pagination }); });
const topProducts = asyncHandler(async (req, res) => ok(res, 'Top products loaded.', await financeModel.topProducts(req.query || {})));
const expenses = asyncHandler(async (req, res) => { const result = await financeModel.expenses(req.query || {}); return ok(res, 'Expenses loaded.', result.rows, { rows: result.rows, pagination: result.pagination }); });
const createExpense = asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Expense saved.', data: await financeModel.createExpense(req.body || {}, userId(req)) }));
const updateExpense = asyncHandler(async (req, res) => ok(res, 'Expense updated.', await financeModel.updateExpense(req.params.id, req.body || {})));
const deleteExpense = asyncHandler(async (req, res) => ok(res, 'Expense deleted.', await financeModel.deleteExpense(req.params.id)));
const recalculate = asyncHandler(async (req, res) => ok(res, 'Finance recalculated.', await financeModel.recalculate(req.body || {})));

module.exports = { summary, daily, channelWise, orderWise, topProducts, expenses, createExpense, updateExpense, deleteExpense, recalculate };
