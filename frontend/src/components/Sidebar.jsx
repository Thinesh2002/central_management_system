import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  X,
  ShieldCheck,
  BarChart3,
  FilePlus2,
  Grid3X3,
  Boxes,
  ShoppingBag,
  Store,
  PackageSearch,
  ListChecks,
  DownloadCloud,
  CloudUpload,
  SlidersHorizontal,
  Settings2,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  Users,
  ScrollText,
  ShieldCheck,
  BarChart3,
  FilePlus2,
  Grid3X3,
  Boxes,
  ShoppingBag,
  Store,
  PackageSearch,
  ListChecks,
  DownloadCloud,
  CloudUpload,
  SlidersHorizontal,
  Settings2,
  ClipboardList,
  FileSpreadsheet,
};

const staticMenu = [
  { section: "Products", page_key: "local_products", page_name: "Local Products", path: "/product/local-products", icon: "Boxes", exact: true },
  { section: "Products", page_key: "add_product", page_name: "Add Product", path: "/product/local-products/create", icon: "FilePlus2", exact: true },
  { section: "Products", page_key: "categories", page_name: "Categories", path: "/product/categories", icon: "Grid3X3", exact: true },
  { section: "Products", page_key: "colours", page_name: "Colours", path: "/colours", icon: "SlidersHorizontal", exact: true },
  { section: "Products", page_key: "models", page_name: "Models", path: "/product/models", icon: "Settings2", exact: true },

  { section: "Inventory", page_key: "inventory_dashboard", page_name: "Inventory Dashboard", path: "/inventory", icon: "ClipboardList", exact: true },
  { section: "Inventory", page_key: "stock_movements", page_name: "Stock Movements", path: "/inventory/stock-ledger", icon: "ListChecks", exact: true },
  { section: "Inventory", page_key: "stock_adjustment", page_name: "Stock Adjustment", path: "/inventory/stock-adjustment", icon: "FilePlus2", exact: true },
  { section: "Inventory", page_key: "low_stock", page_name: "Low Stock", path: "/inventory/low-stock", icon: "PackageSearch", exact: true },
  { section: "Inventory", page_key: "out_of_stock", page_name: "Out of Stock", path: "/inventory/out-of-stock", icon: "PackageSearch", exact: true },

  { section: "Orders", page_key: "manual_orders", page_name: "Manual Orders", path: "/manual/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "daraz_orders", page_name: "Daraz Orders", path: "/daraz/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "woo_orders", page_name: "WooCommerce Orders", path: "/woo/orders", icon: "ShoppingBag", exact: true },

  { section: "Marketplaces", page_key: "marketplace_accounts", page_name: "Marketplace Accounts", path: "/marketplace/accounts", icon: "Store", exact: true },
  { section: "Marketplaces", page_key: "daraz_products", page_name: "Daraz Products", path: "/daraz/products", icon: "ShoppingBag", exact: true },
  { section: "Marketplaces", page_key: "daraz_product_create", page_name: "Create Daraz Product", path: "/daraz-products/create", icon: "CloudUpload", exact: true },
  { section: "Marketplaces", page_key: "woo_products", page_name: "WooCommerce Products", path: "/woo-products", icon: "ShoppingBag", exact: true },
  { section: "Marketplaces", page_key: "woo_product_create", page_name: "Create Woo Product", path: "/woo-products/create", icon: "CloudUpload", exact: true },
  { section: "Marketplaces", page_key: "sku_mappings", page_name: "SKU Mappings", path: "/marketplace/sku-mappings", icon: "ListChecks", exact: true },

  { section: "Finance", page_key: "net_sales", page_name: "Net Sales", path: "/finance/net-sales", icon: "BarChart3", exact: true },
  { section: "Finance", page_key: "daraz_finance", page_name: "Daraz Finance", path: "/daraz/finance", icon: "FileSpreadsheet", exact: true },
  { section: "Finance", page_key: "woo_finance", page_name: "Woo Finance", path: "/woo/finance", icon: "FileSpreadsheet", exact: true },
  { section: "Finance", page_key: "expenses", page_name: "Expenses", path: "/finance/expenses", icon: "FilePlus2", exact: true },

  { section: "Logs", page_key: "sync_logs", page_name: "Sync Logs", path: "/daraz-products/logs", icon: "ScrollText", exact: true },
  { section: "Logs", page_key: "transfer_logs", page_name: "Transfer Logs", path: "/marketplace/logs/transfer", icon: "ScrollText", exact: true },
  { section: "Logs", page_key: "daraz_finance_logs", page_name: "Daraz Finance Logs", path: "/marketplace/logs/daraz_finance_api", icon: "ScrollText", exact: true },
  { section: "Logs", page_key: "woo_logs", page_name: "Woo Logs", path: "/marketplace/logs/woo_product_sync", icon: "ScrollText", exact: true },
  { section: "Logs", page_key: "inventory_movement_logs", page_name: "Inventory Movement Logs", path: "/marketplace/logs/inventory_movement", icon: "ScrollText", exact: true },
  { section: "Logs", page_key: "system_logs", page_name: "System Logs", path: "/logs", icon: "ScrollText", exact: true },
];

function groupMenu(menuItems) {
  return menuItems.reduce((grouped, item) => {
    const sectionName = String(item.section || "MAIN").toUpperCase();

    if (!grouped[sectionName]) {
      grouped[sectionName] = [];
    }

    grouped[sectionName].push(item);
    return grouped;
  }, {});
}

export default function Sidebar({ open, onClose }) {
  const [menu] = useState(staticMenu);
  const groupedMenu = useMemo(() => groupMenu(menu), [menu]);

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 top-16 z-30 bg-black/60 transition lg:hidden ${
          open ? "block" : "hidden"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden border-r border-[#1d2940] bg-[#0f172a] text-slate-100 shadow-2xl shadow-black/40 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-end border-b border-[#1d2940] px-4 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:bg-[#16233a] hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden pb-20">
          {Object.entries(groupedMenu).map(([sectionName, items]) => (
            <div key={sectionName} className="border-b border-[#1d2940] py-3">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFD400]">
                {sectionName}
              </p>

              <div className="space-y-1 px-2">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;

                  return (
                    <NavLink
                      key={item.page_key}
                      to={item.path}
                      end={item.exact}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `relative flex cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-[13px] font-semibold transition ${
                          isActive
                            ? "bg-[#1b3158] text-white"
                            : "text-slate-300 hover:bg-[#16233a] hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-[-8px] top-0 h-full w-[3px] rounded-r bg-[#2f80ff]" />
                          )}

                          <Icon
                            size={16}
                            className={
                              isActive ? "text-[#7fb3ff]" : "text-slate-400"
                            }
                          />

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