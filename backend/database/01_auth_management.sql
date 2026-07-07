-- =====================================================================
-- 01_auth_management.sql
-- Database: cm_auth_management
-- Users, roles, page registry, per-user page permissions.
-- =====================================================================

USE cm_auth_management;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_uid                VARCHAR(64)  NOT NULL,
  name                    VARCHAR(150) NOT NULL,
  email                   VARCHAR(190) NOT NULL,
  password                VARCHAR(255) NOT NULL,
  role                    ENUM('master_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  status                  ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  is_master_locked        TINYINT(1) NOT NULL DEFAULT 0,
  failed_login_attempts   INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until            DATETIME NULL,
  last_login_at           DATETIME NULL,
  last_login_ip           VARCHAR(64) NULL,
  password_changed_at     DATETIME NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_users_user_uid (user_uid),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- app_pages (page registry used for menu + permission control)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_pages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_key        VARCHAR(100) NOT NULL,
  page_name       VARCHAR(150) NOT NULL,
  route_path      VARCHAR(190) NOT NULL,
  icon            VARCHAR(80)  NULL DEFAULT 'LayoutDashboard',
  display_order   INT UNSIGNED NOT NULL DEFAULT 100,
  status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_app_pages_page_key (page_key),
  KEY idx_app_pages_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- user_permissions (per user, per page, view/edit/delete flags)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_permissions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  page_key    VARCHAR(100) NOT NULL,
  can_view    TINYINT(1) NOT NULL DEFAULT 0,
  can_edit    TINYINT(1) NOT NULL DEFAULT 0,
  can_delete  TINYINT(1) NOT NULL DEFAULT 0,
  updated_by  BIGINT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_permissions_user_page (user_id, page_key),
  KEY idx_user_permissions_user (user_id),
  KEY idx_user_permissions_page (page_key),

  CONSTRAINT fk_user_permissions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Seed: default menu pages
-- ---------------------------------------------------------------------
INSERT INTO app_pages (page_key, page_name, route_path, icon, display_order, status) VALUES
('dashboard',            'Dashboard',              '/dashboard',                'LayoutDashboard', 10,  'active'),
('local_products',       'Local Products',         '/product/local-products',   'Package',         20,  'active'),
('images_dashboard',     'Images Dashboard',       '/product/images',           'Image',           25,  'active'),
('daraz_products',       'Daraz Products',         '/product/daraz-products',   'ShoppingBag',      30,  'active'),
('woo_products',         'WooCommerce Products',   '/product/woo-products',     'ShoppingCart',     40,  'active'),
('categories',           'Categories',             '/product/categories',       'FolderTree',       50,  'active'),
('colours',              'Colours',                '/product/colours',         'Palette',          60,  'active'),
('inventory',            'Inventory',              '/inventory',                'Boxes',            70,  'active'),
('pricing',              'Pricing',                '/pricing',                  'Tag',              80,  'active'),
('marketplace_accounts', 'Marketplace Accounts',   '/marketplace/accounts',     'Store',            90,  'active'),
('sync_logs',            'Sync Logs',              '/product/sync-logs',        'RefreshCw',        100, 'active'),
('users',                'Users',                  '/users',                    'Users',            110, 'active'),
('access_control',       'Access Control',         '/access-control',           'ShieldCheck',      120, 'active'),
('logs',                 'System Logs',            '/logs',                     'FileText',         130, 'active')
ON DUPLICATE KEY UPDATE page_name = VALUES(page_name);

-- ---------------------------------------------------------------------
-- Seed: default master admin
--   username / email : admin@system.local (login uses email or user_uid)
--   user_uid         : admin
--   password          : Admin@123
-- ---------------------------------------------------------------------
INSERT INTO users (user_uid, name, email, password, role, status, password_changed_at)
VALUES (
  'admin',
  'System Administrator',
  'admin@system.local',
  '$2b$10$EOt19Jkm474rp.ts3I6umu5vU8ekP57KhvM2nW2DFEZTLYXwKnZOS',
  'master_admin',
  'active',
  NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Grant the seeded admin full permissions on every page
INSERT INTO user_permissions (user_id, page_key, can_view, can_edit, can_delete)
SELECT u.id, p.page_key, 1, 1, 1
FROM users u
CROSS JOIN app_pages p
WHERE u.user_uid = 'admin'
ON DUPLICATE KEY UPDATE can_view = 1, can_edit = 1, can_delete = 1;
