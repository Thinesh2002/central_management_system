const mysql = require("mysql2/promise");
require("dotenv").config();

const productManagementDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_PRODUCT_NAME || process.env.PM_DB_NAME || "cm_product_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

module.exports = productManagementDb;
