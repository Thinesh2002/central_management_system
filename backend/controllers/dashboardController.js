const authPool = require("../config/db");
const logsPool = require("../config/logs_management_db/logs_management_db");

async function getDashboard(req, res) {
  const [[userStats]] = await authPool.query(
    `SELECT
      COUNT(*) AS total_users,
      SUM(role = 'master_admin') AS master_admins,
      SUM(role = 'admin') AS admins,
      SUM(role = 'user') AS users,
      SUM(status = 'active') AS active_users,
      SUM(status = 'inactive') AS inactive_users
     FROM users`
  );

  const [[pageStats]] = await authPool.query(
    `SELECT
      COUNT(*) AS total_pages,
      SUM(status = 'active') AS active_pages,
      SUM(status = 'inactive') AS inactive_pages
     FROM app_pages`
  );

  const [[loginStats]] = await logsPool.query(
    `SELECT
      COUNT(*) AS total_login_logs,
      SUM(status = 'success') AS successful_logins,
      SUM(status = 'failed') AS failed_logins,
      SUM(status = 'blocked') AS blocked_logins
     FROM login_logs`
  );

  return res.json({
    success: true,
    stats: {
      ...userStats,
      ...pageStats,
      ...loginStats,
    },
  });
}

module.exports = { getDashboard };
