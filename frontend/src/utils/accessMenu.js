export function normalizePath(path) {
  if (!path) return "/";
  return path.split("?")[0].replace(/\/+$/, "") || "/";
}

export function isMasterAdmin(user) {
  const role = String(user?.role || "").toLowerCase();

  return (
    role === "master_admin" ||
    role === "master admin" ||
    role === "super_admin" ||
    role === "super admin"
  );
}

// menuItems: rows from GET /access/my-menu (page_key, route_path).
// item: a static menu/link descriptor with `path` and either `page_key` or a `pageKeys` array.
export function canAccessPage(menuItems = [], user, item = {}) {
  if (isMasterAdmin(user)) return true;

  const itemPath = normalizePath(item.path);

  const itemKeys = (
    Array.isArray(item.pageKeys) ? item.pageKeys : [item.page_key]
  )
    .filter(Boolean)
    .map((key) => String(key).toLowerCase());

  return menuItems.some((menuItem) => {
    const menuPath = normalizePath(menuItem.route_path);
    const menuKey = String(menuItem.page_key || "").toLowerCase();

    if (menuPath === itemPath) return true;
    if (itemKeys.includes(menuKey)) return true;

    return false;
  });
}
