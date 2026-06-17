const db = require("../../config/product_management_db");

const q = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};
const e = async (sql, params = []) => {
  const [result] = await db.query(sql, params);
  return result;
};

const features = [
  { feature_key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { feature_key: "products", label: "Local Products", path: "/products" },
  { feature_key: "add_product", label: "Add Product", path: "/add-product" },
  { feature_key: "inventory", label: "Local Inventory", path: "/inventory" },
  { feature_key: "categories", label: "Categories", path: "/category-view" },
  { feature_key: "colours", label: "Colours", path: "/colours" },
  { feature_key: "suppliers", label: "Suppliers", path: "/suppliers" },
  { feature_key: "daraz_dashboard", label: "Daraz Seller Central", path: "/daraz-dashboard" },
  { feature_key: "daraz_products", label: "Daraz Products", path: "/daraz/products" },
  { feature_key: "daraz_inventory", label: "Daraz Inventory", path: "/daraz/inventory" },
  { feature_key: "daraz_orders", label: "Daraz Orders", path: "/daraz/orders" },
  { feature_key: "daraz_finance", label: "Daraz Net Sales", path: "/daraz/net-sales" },
  { feature_key: "daraz_sku_mapping", label: "SKU Mapping", path: "/daraz/sku-mapping" },
  { feature_key: "daraz_category_mapping", label: "Category Mapping", path: "/daraz/category-mapping" },
  { feature_key: "daraz_images", label: "Daraz Images", path: "/daraz/images" },
  { feature_key: "daraz_reports", label: "Business Reports", path: "/daraz/business-reports" },
  { feature_key: "daraz_logs", label: "Sync Logs", path: "/daraz/sync-logs" },
  { feature_key: "daraz_pack_rules", label: "Pack Rules", path: "/daraz/pack-rules" }
];

exports.getFeatures = async () => features;

exports.getBookmarks = async (userId = null) => {
  const rows = await q(`SELECT * FROM user_bookmarks WHERE (user_id = ? OR user_id IS NULL) AND is_active = 1 ORDER BY sort_order ASC, label ASC`, [userId]);
  if (rows.length) return rows;
  return features.slice(0, 8).map((f, index) => ({ ...f, sort_order: index, is_active: 1 }));
};

exports.saveBookmark = async ({ user_id = null, feature_key, label, path, sort_order = 0 }) => {
  return e(`
    INSERT INTO user_bookmarks (user_id, feature_key, label, path, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE label = VALUES(label), path = VALUES(path), sort_order = VALUES(sort_order), is_active = 1, updated_at = CURRENT_TIMESTAMP
  `, [user_id, feature_key, label, path, Number(sort_order)]);
};

exports.removeBookmark = async ({ user_id = null, feature_key }) => {
  return e(`UPDATE user_bookmarks SET is_active = 0 WHERE (user_id = ? OR user_id IS NULL) AND feature_key = ?`, [user_id, feature_key]);
};

exports.getPermissions = async ({ user_id = null, role_name = null } = {}) => {
  const rows = await q(`SELECT * FROM user_feature_permissions WHERE (user_id = ? OR ? IS NULL) AND (role_name = ? OR ? IS NULL) ORDER BY feature_key ASC`, [user_id, user_id, role_name, role_name]);
  return rows;
};

exports.savePermission = async ({ user_id = null, role_name = null, feature_key, can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_sync = 0 }) => {
  return e(`
    INSERT INTO user_feature_permissions
      (user_id, role_name, feature_key, can_view, can_create, can_edit, can_delete, can_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_create = VALUES(can_create), can_edit = VALUES(can_edit), can_delete = VALUES(can_delete), can_sync = VALUES(can_sync), updated_at = CURRENT_TIMESTAMP
  `, [user_id, role_name, feature_key, can_view ? 1 : 0, can_create ? 1 : 0, can_edit ? 1 : 0, can_delete ? 1 : 0, can_sync ? 1 : 0]);
};
