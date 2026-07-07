const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const SCHEMA_FILES = [
  "00_RESET_ONLY_NEW_DATABASES.sql",
  "01_auth_management.sql",
  "02_marketplace_management.sql",
  "03_product_management.sql",
  "04_inventory_management.sql",
  "05_price_management.sql",
  "06_logs_management.sql",
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    multipleStatements: true,
  });

  try {
    for (const fileName of SCHEMA_FILES) {
      const sqlPath = path.join(__dirname, "..", "database", fileName);
      const sql = fs.readFileSync(sqlPath, "utf8");

      console.log(`[SETUP_DB] Running ${fileName} ...`);
      await connection.query(sql);
      console.log(`[SETUP_DB] Done: ${fileName}`);
    }

    console.log("[SETUP_DB] All databases created successfully.");
    console.log("[SETUP_DB] Login: admin / Admin@123");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[SETUP_DB_ERROR]", error.message);
  process.exit(1);
});
