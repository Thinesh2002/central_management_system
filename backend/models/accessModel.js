const pool = require("../config/db");
const { makePageKey, normalizeRoutePath, toFlag, cleanString } = require("../utils/validators");

const ACTIONS = ["view", "edit", "delete"];
const ACTION_COLUMN = {
  view: "can_view",
  edit: "can_edit",
  delete: "can_delete",
};

const PAGE_DEFAULTS = {
  master_admin: { can_view: 1, can_edit: 1, can_delete: 1 },
  admin: { can_view: 0, can_edit: 0, can_delete: 0 },
  user: { can_view: 0, can_edit: 0, can_delete: 0 },
};

function defaultForRole(role, pageKey = "") {
  if (role === "master_admin") return { ...PAGE_DEFAULTS.master_admin };

  if (role === "admin") {
    if (["dashboard", "users", "access_control", "logs"].includes(pageKey)) {
      return {
        can_view: 1,
        can_edit: pageKey === "users" || pageKey === "access_control" ? 1 : 0,
        can_delete: pageKey === "users" ? 1 : 0,
      };
    }
  }

  if (role === "user" && pageKey === "dashboard") {
    return { can_view: 1, can_edit: 0, can_delete: 0 };
  }

  return { ...PAGE_DEFAULTS[role] || PAGE_DEFAULTS.user };
}

function cleanPermissionFlags(row = {}) {
  return {
    can_view: toFlag(row.can_view),
    can_edit: toFlag(row.can_edit),
    can_delete: toFlag(row.can_delete),
  };
}

async function listPages({ includeInactive = false } = {}) {
  const [rows] = await pool.query(
    `SELECT id, page_key, page_name, route_path, icon, display_order, status, created_at, updated_at
     FROM app_pages
     ${includeInactive ? "" : "WHERE status = 'active'"}
     ORDER BY display_order ASC, page_name ASC`
  );
  return rows;
}

async function getPageByKey(pageKey) {
  const [rows] = await pool.query(
    `SELECT id, page_key, page_name, route_path, icon, display_order, status, created_at, updated_at
     FROM app_pages
     WHERE page_key = ?
     LIMIT 1`,
    [pageKey]
  );
  return rows[0] || null;
}

async function getPageByPath(routePath) {
  const path = normalizeRoutePath(routePath);
  const [rows] = await pool.query(
    `SELECT id, page_key, page_name, route_path, icon, display_order, status, created_at, updated_at
     FROM app_pages
     WHERE route_path = ? AND status = 'active'
     LIMIT 1`,
    [path]
  );
  return rows[0] || null;
}

async function ensurePermissionForUserAndPage(user, pageKey, updatedBy = null) {
  const defaults = defaultForRole(user.role, pageKey);
  await pool.query(
    `INSERT IGNORE INTO user_permissions
      (user_id, page_key, can_view, can_edit, can_delete, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, pageKey, defaults.can_view, defaults.can_edit, defaults.can_delete, updatedBy]
  );
}

async function ensureUserDefaultPermissions(userId, role = "user", updatedBy = null) {
  const [pages] = await pool.query(`SELECT page_key FROM app_pages WHERE status = 'active'`);

  for (const page of pages) {
    const defaults = defaultForRole(role, page.page_key);
    await pool.query(
      `INSERT IGNORE INTO user_permissions
        (user_id, page_key, can_view, can_edit, can_delete, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, page.page_key, defaults.can_view, defaults.can_edit, defaults.can_delete, updatedBy]
    );
  }
}

async function ensureAllUserPermissionsForPage(pageKey, updatedBy = null) {
  const [users] = await pool.query(`SELECT id, role FROM users`);

  for (const user of users) {
    const defaults = defaultForRole(user.role, pageKey);
    await pool.query(
      `INSERT IGNORE INTO user_permissions
        (user_id, page_key, can_view, can_edit, can_delete, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, pageKey, defaults.can_view, defaults.can_edit, defaults.can_delete, updatedBy]
    );
  }
}

async function ensureAllUserPermissions() {
  const [users] = await pool.query(`SELECT id, role FROM users`);
  for (const user of users) {
    await ensureUserDefaultPermissions(user.id, user.role);
  }
}

async function createPage(payload, updatedBy = null) {
  const pageName = cleanString(payload.page_name);
  const pageKey = makePageKey(payload.page_key || payload.page_name);
  const routePath = normalizeRoutePath(payload.route_path || pageKey.replaceAll("_", "-"));
  const icon = cleanString(payload.icon || "LayoutDashboard");

  if (!pageName || !pageKey || !routePath) {
    const error = new Error("Page name, page key and route path are required.");
    error.statusCode = 400;
    throw error;
  }

  const [maxRows] = await pool.query(`SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM app_pages`);
  const displayOrder = Number(payload.display_order || maxRows[0]?.next_order || 100);

  const [result] = await pool.query(
    `INSERT INTO app_pages
      (page_key, page_name, route_path, icon, display_order, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [pageKey, pageName, routePath, icon, displayOrder]
  );

  await ensureAllUserPermissionsForPage(pageKey, updatedBy);
  return getPageByKey(pageKey) || { id: result.insertId, page_key: pageKey, page_name: pageName, route_path: routePath, icon };
}

async function updatePage(pageId, payload) {
  const existing = await getPageById(pageId);
  if (!existing) return null;

  const updates = [];
  const values = [];

  if (payload.page_name !== undefined) {
    updates.push("page_name = ?");
    values.push(cleanString(payload.page_name));
  }
  if (payload.page_key !== undefined) {
    updates.push("page_key = ?");
    values.push(makePageKey(payload.page_key));
  }
  if (payload.route_path !== undefined) {
    updates.push("route_path = ?");
    values.push(normalizeRoutePath(payload.route_path));
  }
  if (payload.icon !== undefined) {
    updates.push("icon = ?");
    values.push(cleanString(payload.icon || "LayoutDashboard"));
  }
  if (payload.display_order !== undefined) {
    updates.push("display_order = ?");
    values.push(Number(payload.display_order || 100));
  }
  if (payload.status !== undefined) {
    updates.push("status = ?");
    values.push(payload.status === "inactive" ? "inactive" : "active");
  }

  if (!updates.length) return existing;

  values.push(pageId);
  await pool.query(`UPDATE app_pages SET ${updates.join(", ")} WHERE id = ?`, values);
  return getPageById(pageId);
}

async function getPageById(pageId) {
  const [rows] = await pool.query(
    `SELECT id, page_key, page_name, route_path, icon, display_order, status, created_at, updated_at
     FROM app_pages
     WHERE id = ?
     LIMIT 1`,
    [pageId]
  );
  return rows[0] || null;
}

async function deletePage(pageId) {
  const page = await getPageById(pageId);
  if (!page) return null;

  if (["dashboard", "users", "access_control", "logs"].includes(page.page_key)) {
    const error = new Error("Core system pages cannot be deleted.");
    error.statusCode = 403;
    throw error;
  }

  await pool.query(`UPDATE app_pages SET status = 'inactive' WHERE id = ?`, [pageId]);
  return page;
}

async function getUserPermissionMatrix(targetUser) {
  await ensureUserDefaultPermissions(targetUser.id, targetUser.role);

  const pages = await listPages({ includeInactive: false });
  const [permissions] = await pool.query(
    `SELECT page_key, can_view, can_edit, can_delete
     FROM user_permissions
     WHERE user_id = ?`,
    [targetUser.id]
  );

  const map = new Map(permissions.map((row) => [row.page_key, row]));

  return pages.map((page) => {
    const permission = map.get(page.page_key) || defaultForRole(targetUser.role, page.page_key);
    return {
      ...page,
      permission: {
        page_key: page.page_key,
        ...cleanPermissionFlags(permission),
      },
    };
  });
}

async function updateUserPermissions(targetUserId, permissionRows = [], updatedBy = null) {
  for (const row of permissionRows) {
    const pageKey = makePageKey(row.page_key);
    if (!pageKey) continue;

    const flags = cleanPermissionFlags(row);
    await pool.query(
      `INSERT INTO user_permissions
        (user_id, page_key, can_view, can_edit, can_delete, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        can_view = VALUES(can_view),
        can_edit = VALUES(can_edit),
        can_delete = VALUES(can_delete),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP`,
      [targetUserId, pageKey, flags.can_view, flags.can_edit, flags.can_delete, updatedBy]
    );
  }
}

async function hasPermission(user, pageKey, action = "view") {
  if (!user?.id || !pageKey || !ACTION_COLUMN[action]) return false;
  if (user.role === "master_admin") return true;

  await ensureUserDefaultPermissions(user.id, user.role);

  const column = ACTION_COLUMN[action];
  const [rows] = await pool.query(
    `SELECT ${column} AS allowed
     FROM user_permissions
     WHERE user_id = ? AND page_key = ?
     LIMIT 1`,
    [user.id, pageKey]
  );

  return Number(rows[0]?.allowed || 0) === 1;
}

async function listUserMenu(user) {
  await ensureUserDefaultPermissions(user.id, user.role);

  if (user.role === "master_admin") {
    return listPages({ includeInactive: false });
  }

  const [pages] = await pool.query(
    `SELECT p.id, p.page_key, p.page_name, p.route_path, p.icon, p.display_order, p.status
     FROM app_pages p
     INNER JOIN user_permissions up ON up.page_key = p.page_key
     WHERE p.status = 'active' AND up.user_id = ? AND up.can_view = 1
     ORDER BY p.display_order ASC, p.page_name ASC`,
    [user.id]
  );

  return pages;
}

module.exports = {
  ACTIONS,
  ACTION_COLUMN,
  defaultForRole,
  listPages,
  getPageById,
  getPageByKey,
  getPageByPath,
  createPage,
  updatePage,
  deletePage,
  ensureUserDefaultPermissions,
  ensureAllUserPermissions,
  getUserPermissionMatrix,
  updateUserPermissions,
  hasPermission,
  listUserMenu,
};
