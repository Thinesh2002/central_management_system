function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}

function getMissingTableName(error) {
  const msg = error?.sqlMessage || error?.message || "";
  const match = msg.match(/Table '([^']+)' doesn't exist/i);
  return match?.[1] || null;
}

function getBadColumnName(error) {
  const msg = error?.sqlMessage || error?.message || "";
  const match = msg.match(/Unknown column '([^']+)'/i);
  return match?.[1] || null;
}

function errorHandler(error, req, res, next) {
  console.error("[API_ERROR]", {
    code: error.code,
    errno: error.errno,
    sqlState: error.sqlState,
    sqlMessage: error.sqlMessage,
    message: error.message,
    sql: error.sql,
  });

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate value already exists. Please use different data.",
    });
  }

  if (error.code === "ER_NO_SUCH_TABLE") {
    const missingTable = getMissingTableName(error);

    return res.status(500).json({
      success: false,
      message: missingTable
        ? `Database table missing: ${missingTable}`
        : "Database table missing.",
      missing_table: missingTable,
      sql_message: error.sqlMessage,
    });
  }

  if (error.code === "ER_BAD_FIELD_ERROR") {
    const badColumn = getBadColumnName(error);

    return res.status(500).json({
      success: false,
      message: badColumn
        ? `Database column missing/wrong: ${badColumn}`
        : "Database column mismatch.",
      missing_column: badColumn,
      sql_message: error.sqlMessage,
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server error. Please try again.",
  });
}

module.exports = { notFound, errorHandler };