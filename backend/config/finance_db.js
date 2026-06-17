const mysql = require("mysql2/promise");
require("dotenv").config();

const financePool = mysql.createPool({
  host: process.env.F_DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.F_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z",
});

// Test DB connection on startup
(async () => {
  try {
    const conn = await financePool.getConnection();
    await conn.ping();
    conn.release();
    console.log("Finance DB connected successfully.");
  } catch (err) {
    console.error("Finance DB connection error:", err.message);
  }
})();

module.exports = financePool;
