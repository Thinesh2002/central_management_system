const mysql = require("mysql2/promise");
require("dotenv").config();

const marketplaceManagementDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_MARKETPLACE_NAME || process.env.MP_DB_NAME || "cm_marketplace_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

module.exports = marketplaceManagementDb;
