const mysql = require("mysql2/promise");
require("dotenv").config();

const inventoryManagementDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_INVENTORY_NAME || process.env.INVENTORY_DB_NAME || "cm_inventory_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

module.exports = inventoryManagementDb;
