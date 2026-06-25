const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.ORDER_DB_HOST || process.env.DB_HOST,
  user: process.env.ORDER_DB_USER || process.env.DB_USER,
  password: process.env.ORDER_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.ORDER_DB_NAME || "cm_order_management",
  waitForConnections: true,
  connectionLimit: Number(process.env.ORDER_DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  timezone: "+00:00",
  charset: "utf8mb4",
});

module.exports = db;
