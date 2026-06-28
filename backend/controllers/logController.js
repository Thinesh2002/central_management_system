const logModel = require("../models/logModel");
const { sendCsv } = require("../utils/csv");

function wantsCsv(req) {
  return String(req.query.export || req.query.format || '').toLowerCase() === 'csv';
}

async function getLogs(req, res) {
  const logs = await logModel.listLogs({ limit: req.query.limit || 1000 });
  if (wantsCsv(req)) return sendCsv(res, 'system_logs_export.csv', logs);
  return res.json({ success: true, logs });
}

async function getLoginLogs(req, res) {
  const logs = await logModel.listLoginLogs(req.query.limit || 1000);
  if (wantsCsv(req)) return sendCsv(res, 'login_logs_export.csv', logs);
  return res.json({ success: true, logs });
}

async function getSystemLogs(req, res) {
  const logs = await logModel.listSystemLogs(req.query.limit || 1000);
  if (wantsCsv(req)) return sendCsv(res, 'system_logs_export.csv', logs);
  return res.json({ success: true, logs });
}

async function getAuditLogs(req, res) {
  const logs = await logModel.listAuditLogs(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'audit_logs_export.csv', logs);
  return res.json({ success: true, logs, rows: logs });
}

async function getAutomationLogs(req, res) {
  const logs = await logModel.listAutomationLogs(req.query || {});
  if (wantsCsv(req)) return sendCsv(res, 'automation_logs_export.csv', logs);
  return res.json({ success: true, logs, rows: logs });
}

module.exports = { getLogs, getLoginLogs, getSystemLogs, getAuditLogs, getAutomationLogs };
