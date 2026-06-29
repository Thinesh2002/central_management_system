const logModel = require("../models/logModel");

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

module.exports = { getLogs, getLoginLogs, getSystemLogs };
