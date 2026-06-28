import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArchiveRestore,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  ClipboardCheck,
  CloudUpload,
  DatabaseBackup,
  FilePlus2,
  FileSpreadsheet,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const iconMap = {
  ArchiveRestore,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  ClipboardCheck,
  CloudUpload,
  DatabaseBackup,
  FilePlus2,
  FileSpreadsheet,
  GitBranch,
  Grid3X3,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  TrendingUp,
  Users,
};

const staticMenu = [
  { section: "Main", page_key: "dashboard", page_name: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", exact: true, color: "orange" },
  { section: "Main", page_key: "business_dashboard", page_name: "Business Dashboard", path: "/business-dashboard", icon: "BarChart3", exact: true },

  { section: "Products", page_key: "local_products", page_name: "Local Products", path: "/product/local-products", icon: "Boxes", exact: true },
  { section: "Products", page_key: "add_product", page_name: "Add Product", path: "/product/local-products/create", icon: "FilePlus2", exact: true },
  { section: "Products", page_key: "categories", page_name: "Categories", path: "/product/categories", icon: "Grid3X3", exact: true },
  { section: "Products", page_key: "image_dashboard", page_name: "Image Dashboard", path: "/image-dashboard", icon: "PackageSearch", exact: true },
  { section: "Products", page_key: "product_quality", page_name: "Product Quality", path: "/phase4/product-quality", icon: "ClipboardCheck", exact: true },

  { section: "Inventory", page_key: "inventory_dashboard", page_name: "Inventory Dashboard", path: "/inventory/dashboard", icon: "BarChart3", exact: true },
  { section: "Inventory", page_key: "sku_search", page_name: "SKU Search", path: "/inventory/sku-search", icon: "Search", exact: true },
  { section: "Inventory", page_key: "demand_analysis", page_name: "Demand Analysis", path: "/reports/demand-analysis", icon: "TrendingUp", exact: true },

  { section: "Orders", page_key: "daraz_orders", page_name: "Daraz Orders", path: "/daraz/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "woo_orders", page_name: "Woo Orders", path: "/woo/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "manual_orders", page_name: "Manual Orders", path: "/manual/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "order_profit", page_name: "Order Profit", path: "/phase4/order-profit", icon: "ReceiptText", exact: true },
  { section: "Orders", page_key: "returns_refunds", page_name: "Returns / Refunds", path: "/phase4/returns-refunds", icon: "RotateCcw", exact: true },

  { section: "Marketplaces", page_key: "marketplace_accounts", page_name: "Accounts", path: "/marketplace/accounts", icon: "Store", exact: true },
  { section: "Marketplaces", page_key: "daraz_products", page_name: "Daraz Products", path: "/daraz/products", icon: "ShoppingBag", exact: true },
  { section: "Marketplaces", page_key: "woo_products", page_name: "Woo Products", path: "/woo-products", icon: "ShoppingBag", exact: true },
  { section: "Marketplaces", page_key: "marketplace_transfer", page_name: "Transfer", path: "/marketplace/transfer", icon: "CloudUpload", exact: true },
  { section: "Marketplaces", page_key: "sku_mapping", page_name: "SKU Mapping", path: "/marketplace/sku-mappings", icon: "GitBranch", exact: true },

  { section: "Finance", page_key: "net_sales", page_name: "Net Sales", path: "/finance/net-sales", icon: "BarChart3", exact: true },
  { section: "Finance", page_key: "price_dashboard", page_name: "Price Dashboard", path: "/price-dashboard", icon: "Calculator", exact: true },
  { section: "Finance", page_key: "daraz_finance", page_name: "Daraz Finance", path: "/daraz/finance", icon: "FileSpreadsheet", exact: true },

  { section: "Operations", page_key: "phase4_control", page_name: "Control Center", path: "/phase4", icon: "ListChecks", exact: true },
  { section: "Operations", page_key: "courier_dashboard", page_name: "Courier Dashboard", path: "/phase4/courier", icon: "Truck", exact: true },
  { section: "Operations", page_key: "bulk_tools", page_name: "Bulk Tools", path: "/phase4/bulk-tools", icon: "ArchiveRestore", exact: true },
  { section: "Operations", page_key: "notifications", page_name: "Notifications", path: "/notifications", icon: "Bell", exact: true },
  { section: "Operations", page_key: "queue_dashboard", page_name: "Sync Queue", path: "/phase4/queue-dashboard", icon: "RefreshCcw", exact: true },

  { section: "Admin", page_key: "roles_permissions", page_name: "Roles & Permissions", path: "/phase4/roles-permissions", icon: "ShieldCheck", exact: true },
  { section: "Admin", page_key: "users", page_name: "Users", path: "/users", icon: "Users", exact: true },
  { section: "Admin", page_key: "audit_logs", page_name: "Audit Logs", path: "/phase4/audit-logs", icon: "FileSpreadsheet", exact: true },
  { section: "Admin", page_key: "backup_migration", page_name: "Backup / Migration", path: "/phase4/backup-migration", icon: "DatabaseBackup", exact: true },
  { section: "Admin", page_key: "settings", page_name: "Settings", path: "/settings", icon: "Settings2", exact: true },
];

function groupMenu(menuItems) {
  return menuItems.reduce((grouped, item) => {
    const sectionName = String(item.section || "MAIN").toUpperCase();
    if (!grouped[sectionName]) grouped[sectionName] = [];
    grouped[sectionName].push(item);
    return grouped;
  }, {});
}

function activeClass(isActive, item) {
  if (!isActive) return "text-slate-300 hover:bg-[#16233a] hover:text-white";
  if (item.color === "orange") return "bg-gradient-to-r from-orange-500/25 to-yellow-400/10 text-white ring-1 ring-orange-400/30";
  return "bg-[#1b3158] text-white";
}

export default function Sidebar({ open, onClose }) {
  const [menu] = useState(staticMenu);
  const groupedMenu = useMemo(() => groupMenu(menu), [menu]);

  return (
    <>
      <div className={`fixed bottom-0 left-0 right-0 top-16 z-30 bg-black/60 transition lg:hidden ${open ? "block" : "hidden"}`} onClick={onClose} />
      <aside className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden border-r border-[#1d2940] bg-[#0f172a] text-slate-100 shadow-2xl shadow-black/40 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1d2940] px-4 lg:hidden">
          <span className="text-xs font-black uppercase tracking-widest text-yellow-300">Menu</span>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:bg-[#16233a] hover:text-white" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden pb-20">
          {Object.entries(groupedMenu).map(([sectionName, items]) => (
            <div key={sectionName} className="border-b border-[#1d2940] py-3">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFD400]">{sectionName}</p>
              <div className="space-y-1 px-2">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  return (
                    <NavLink key={item.page_key} to={item.path} end={item.exact} onClick={onClose} className={({ isActive }) => `relative flex cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-[13px] font-semibold transition ${activeClass(isActive, item)}`}>
                      {({ isActive }) => (
                        <>
                          {isActive && <span className={`absolute left-[-8px] top-0 h-full w-[3px] rounded-r ${item.color === "orange" ? "bg-orange-400" : "bg-[#2f80ff]"}`} />}
                          <Icon size={16} className={isActive ? (item.color === "orange" ? "text-orange-300" : "text-[#7fb3ff]") : "text-slate-400"} />
                          <span className="truncate">{item.page_name}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
