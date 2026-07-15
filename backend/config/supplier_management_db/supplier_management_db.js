const mysql = require("mysql2/promise");
require("dotenv").config();

const supplierManagementDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_SUPPLIER_NAME || "cm_supplier_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

module.exports = supplierManagementDb;
