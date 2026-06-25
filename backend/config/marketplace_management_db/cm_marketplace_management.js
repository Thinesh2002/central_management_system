const mysql = require("mysql2/promise");
require("dotenv").config();

const marketplaceManagementDb = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.MP_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = marketplaceManagementDb;