const mysql = require("mysql2/promise");
require("dotenv").config();

const productManagementDb = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.PM_DB_NAME || "cm_product_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = productManagementDb;