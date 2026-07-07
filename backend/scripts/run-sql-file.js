const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const fileName = process.argv[2];

  if (!fileName) {
    console.error("[RUN_SQL_FILE] Usage: node scripts/run-sql-file.js <file-in-database-folder>");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "database", fileName);
  const sql = fs.readFileSync(sqlPath, "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    multipleStatements: true,
  });

  try {
    console.log(`[RUN_SQL_FILE] Running ${fileName} ...`);
    await connection.query(sql);
    console.log(`[RUN_SQL_FILE] Done: ${fileName}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[RUN_SQL_FILE_ERROR]", error.message);
  process.exit(1);
});
