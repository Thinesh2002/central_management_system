const db = require("../../config/logs_management_db/logs_management_db");

async function create({
  source,
  source_order_id: sourceOrderId,
  template_id: templateId,
  session_id: sessionId,
  daraz_message_id: darazMessageId,
  content,
  status,
  error_message: errorMessage,
  sent_by: sentBy,
}) {
  const [result] = await db.query(
    `INSERT INTO message_logs
       (source, source_order_id, template_id, session_id, daraz_message_id, content, status, error_message, sent_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      source || "daraz",
      sourceOrderId,
      templateId || null,
      sessionId || null,
      darazMessageId || null,
      content,
      status || "sent",
      errorMessage || null,
      sentBy || null,
    ]
  );

  const [rows] = await db.query("SELECT * FROM message_logs WHERE id = ?", [result.insertId]);
  return rows[0] || null;
}

async function listForOrder(source, sourceOrderId) {
  const [rows] = await db.query(
    "SELECT * FROM message_logs WHERE source = ? AND source_order_id = ? ORDER BY sent_at DESC",
    [source, sourceOrderId]
  );
  return rows;
}

module.exports = { create, listForOrder };
