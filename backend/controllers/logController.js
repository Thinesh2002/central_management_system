const logModel = require("../models/logModel");
const inventoryLogModel = require("../models/order_management/inventory_log_model");
const titleOptimizerLogModel = require("../models/daraz/product_management/daraz_title_optimizer_log_model");
const accountModel = require("../models/marketplace/account_model");
const userModel = require("../models/userModel");

async function getLogs(req, res) {
  const logs = await logModel.listLogs({ limit: req.query.limit || 100 });
  return res.json({ success: true, logs });
}

async function getLoginLogs(req, res) {
  const logs = await logModel.listLoginLogs(req.query.limit || 100);
  return res.json({ success: true, logs });
}

async function getSystemLogs(req, res) {
  const logs = await logModel.listSystemLogs(req.query.limit || 100);
  return res.json({ success: true, logs });
}

async function getInventoryLogs(req, res) {
  const logs = await inventoryLogModel.listRecent({
    status: req.query.status,
    sku: req.query.sku,
    limit: req.query.limit || 200,
  });
  return res.json({ success: true, logs });
}

async function getTitleOptimizerLogs(req, res) {
  const logs = await titleOptimizerLogModel.listRecent({
    event_type: req.query.event_type,
    account_id: req.query.account_id,
    status: req.query.status,
    limit: req.query.limit || 200,
  });

  const [accounts, users] = await Promise.all([accountModel.getAllAccounts(), userModel.listUsers()]);

  const accountNameById = new Map(accounts.map((account) => [account.id, account.account_name || account.account_code]));
  const userNameById = new Map(users.map((user) => [user.id, user.name || user.email]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    account_name: accountNameById.get(log.account_id) || null,
    reviewed_by_name: userNameById.get(log.reviewed_by) || null,
  }));

  return res.json({ success: true, logs: enrichedLogs });
}

module.exports = { getLogs, getLoginLogs, getSystemLogs, getInventoryLogs, getTitleOptimizerLogs };
