const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const sqlPath = path.join(__dirname, "..", "database", "00_RESET_ONLY_NEW_DATABASES.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    multipleStatements: true,
  });

  try {
    console.log("[SETUP_DB] Dropping old DBs and creating approved new DBs...");
    await connection.query(sql);
    console.log("[SETUP_DB] Done.");
    console.log("[SETUP_DB] Login: admin / Admin@123");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[SETUP_DB_ERROR]", error.message);
  process.exit(1);
});
