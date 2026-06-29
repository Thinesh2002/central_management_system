const mysql = require("mysql2/promise");
require("dotenv").config();

const priceManagementDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_PRICE_NAME || process.env.PRICE_DB_NAME || "cm_price_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

module.exports = priceManagementDb;
