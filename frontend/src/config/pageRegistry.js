import {
  BarChart3,
  Boxes,
  Calculator,
  CloudUpload,
  FilePlus2,
  FileSpreadsheet,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  PackageCheck,
  PackageSearch,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

export const iconMap = {
  BarChart3,
  Boxes,
  Calculator,
  CloudUpload,
  FilePlus2,
  FileSpreadsheet,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  PackageCheck,
  PackageSearch,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
};

export const appPages = [
  {
    section: "Products",
    page_key: "local_products",
    page_name: "Local Products",
    path: "/product/local-products",
    icon: "Boxes",
    keywords: "local products sku inventory image",
  },
  {
    section: "Products",
    page_key: "add_product",
    page_name: "Add Product",
    path: "/product/local-products/create",
    icon: "FilePlus2",
    keywords: "create product add new",
  },
  {
    section: "Products",
    page_key: "categories",
    page_name: "Categories",
    path: "/product/categories",
    icon: "Grid3X3",
    keywords: "category sub category model type",
  },
  {
    section: "Products",
    page_key: "image_dashboard",
    page_name: "Image Dashboard",
    path: "/image-dashboard",
    icon: "PackageSearch",
    keywords: "image dashboard delete audit upload media",
  },

  {
    section: "Marketplaces",
    page_key: "daraz_products",
    page_name: "Daraz Products",
    path: "/daraz/products",
    icon: "ShoppingBag",
    keywords: "daraz product listing edit",
  },
  {
    section: "Marketplaces",
    page_key: "woo_products",
    page_name: "Woo Products",
    path: "/woo-products",
    icon: "ShoppingBag",
    keywords: "woo products woocommerce",
  },
  {
    section: "Marketplaces",
    page_key: "marketplace_transfer",
    page_name: "Transfer",
    path: "/marketplace/transfer",
    icon: "CloudUpload",
    keywords: "transfer local to marketplace",
  },
  {
    section: "Products",
    page_key: "sku_mapping",
    page_name: "SKU Mapping",
    path: "/product/sku-mappings",
    icon: "GitBranch",
    keywords: "sku mapping product management daraz woo local sku",
  },

  {
    section: "Inventory",
    page_key: "inventory_dashboard",
    page_name: "Inventory Dashboard",
    path: "/inventory/dashboard",
    icon: "BarChart3",
    keywords: "inventory stock dashboard",
  },
  {
    section: "Inventory",
    page_key: "inventory_list",
    page_name: "Inventory List",
    path: "/inventory",
    icon: "Boxes",
    keywords: "inventory list stock",
  },
  {
    section: "Inventory",
    page_key: "sku_search",
    page_name: "SKU Search",
    path: "/inventory/sku-search",
    icon: "Search",
    keywords: "sku search stock update",
  },
  {
    section: "Inventory",
    page_key: "stock_ledger",
    page_name: "Stock Logs",
    path: "/inventory/stock-ledger",
    icon: "FileSpreadsheet",
    keywords: "stock logs deduction ledger movement",
  },
  {
    section: "Inventory",
    page_key: "stock_adjustment",
    page_name: "Stock Adjustment",
    path: "/inventory/stock-adjustment",
    icon: "PackageCheck",
    keywords: "manual stock update adjustment",
  },
  {
    section: "Inventory",
    page_key: "demand_analysis",
    page_name: "Demand Analysis",
    path: "/reports/demand-analysis",
    icon: "TrendingUp",
    keywords: "demand reorder forecast sales",
  },

  {
    section: "Orders",
    page_key: "daraz_orders",
    page_name: "Daraz Orders",
    path: "/daraz/orders",
    icon: "ShoppingBag",
    keywords: "daraz orders sync",
  },
  {
    section: "Orders",
    page_key: "woo_orders",
    page_name: "Woo Orders",
    path: "/woo/orders",
    icon: "ShoppingBag",
    keywords: "woocommerce orders woo",
  },
  {
    section: "Orders",
    page_key: "manual_orders",
    page_name: "Manual Orders",
    path: "/manual/orders",
    icon: "ShoppingBag",
    keywords: "manual orders custom",
  },

  {
    section: "Configuration",
    page_key: "marketplace_accounts",
    page_name: "Accounts",
    path: "/marketplace/accounts",
    icon: "Store",
    keywords: "marketplace accounts daraz woo",
  },

  {
    section: "Finance",
    page_key: "net_sales",
    page_name: "Net Sales",
    path: "/finance/net-sales",
    icon: "BarChart3",
    keywords: "net sales profit",
  },
  {
    section: "Finance",
    page_key: "price_dashboard",
    page_name: "Price Dashboard",
    path: "/price-dashboard",
    icon: "Calculator",
    keywords: "price calculation daraz woo fees margin",
  },
  {
    section: "Finance",
    page_key: "daraz_finance",
    page_name: "Daraz Finance",
    path: "/daraz/finance",
    icon: "FileSpreadsheet",
    keywords: "daraz finance payout transaction",
  },

  {
    section: "Admin",
    page_key: "users",
    page_name: "Users",
    path: "/users",
    icon: "Users",
    keywords: "users staff access",
  },
  {
    section: "Admin",
    page_key: "access_control",
    page_name: "Page Access",
    path: "/access-control",
    icon: "ShieldCheck",
    keywords: "page access view edit delete",
  },
  {
    section: "Admin",
    page_key: "logs",
    page_name: "System Logs",
    path: "/logs",
    icon: "FileSpreadsheet",
    keywords: "system login logs",
  },
  {
    section: "Admin",
    page_key: "settings",
    page_name: "Settings",
    path: "/settings",
    icon: "Settings2",
    keywords: "settings system logs page settings",
  },
];

export function normalizePath(path) {
  if (!path) return "/";
  return String(path).split("?")[0].replace(/\/+$/, "") || "/";
}

export function getRegistryPageForPath(path) {
  const clean = normalizePath(path);

  const exact = appPages.find((page) => normalizePath(page.path) === clean);
  if (exact) return exact;

  const prefixMatches = [
    { prefix: "/reports/sku-economics/", page_key: "sku_search" },
    { prefix: "/product/local-products/", page_key: "local_products" },
    { prefix: "/daraz/orders/", page_key: "daraz_orders" },
    { prefix: "/woo/orders/", page_key: "woo_orders" },
    { prefix: "/marketplace/accounts/", page_key: "marketplace_accounts" },
    { prefix: "/daraz-products/edit/", page_key: "daraz_products" },
  ];

  const match = prefixMatches.find((item) => clean.startsWith(item.prefix));

  if (match) {
    return appPages.find((page) => page.page_key === match.page_key) || null;
  }

  return null;
}

export function isMasterAdmin(user) {
  const role = String(user?.role || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return (
    role === "master_admin" ||
    role === "super_admin" ||
    Number(user?.is_master_locked || 0) === 1
  );
}

export function canViewPage(user, menu = [], page) {
  if (!page) return true;
  if (isMasterAdmin(user)) return true;

  const cleanPath = normalizePath(page.path || page.route_path);
  const pageKey = String(page.page_key || "").toLowerCase();

  return (menu || []).some((item) => {
    const itemKey = String(item.page_key || "").toLowerCase();
    const itemPath = normalizePath(item.path || item.route_path);

    return itemKey === pageKey || itemPath === cleanPath;
  });
}

export function filterPagesByAccess(user, menu = []) {
  if (isMasterAdmin(user)) return appPages;
  return appPages.filter((page) => canViewPage(user, menu, page));
}

export function groupMenu(menuItems) {
  return menuItems.reduce((grouped, item) => {
    const sectionName = String(item.section || "Main").toUpperCase();

    if (!grouped[sectionName]) grouped[sectionName] = [];
    grouped[sectionName].push(item);

    return grouped;
  }, {});
}