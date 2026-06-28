import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Calculator,
  CloudUpload,
  FilePlus2,
  FileSpreadsheet,
  Grid3X3,
  LayoutDashboard,
  PackageSearch,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  TrendingUp,
  X,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  BarChart3,
  Boxes,
  Calculator,
  CloudUpload,
  FilePlus2,
  FileSpreadsheet,
  Grid3X3,
  PackageSearch,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  TrendingUp,
};

const staticMenu = [
  { section: "Main", page_key: "dashboard", page_name: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", exact: true },

  { section: "Products", page_key: "local_products", page_name: "Local Products", path: "/product/local-products", icon: "Boxes", exact: true },
  { section: "Products", page_key: "add_product", page_name: "Add Product", path: "/product/local-products/create", icon: "FilePlus2", exact: true },
  { section: "Products", page_key: "categories", page_name: "Categories", path: "/product/categories", icon: "Grid3X3", exact: true },
  { section: "Products", page_key: "image_dashboard", page_name: "Image Dashboard", path: "/image-dashboard", icon: "PackageSearch", exact: true },

  { section: "Inventory", page_key: "inventory_dashboard", page_name: "Inventory Dashboard", path: "/inventory/dashboard", icon: "BarChart3", exact: true },
  { section: "Inventory", page_key: "sku_search", page_name: "SKU Search", path: "/inventory/sku-search", icon: "Search", exact: true },

  { section: "Orders", page_key: "daraz_orders", page_name: "Daraz Orders", path: "/daraz/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "woo_orders", page_name: "Woo Orders", path: "/woo/orders", icon: "ShoppingBag", exact: true },
  { section: "Orders", page_key: "manual_orders", page_name: "Manual Orders", path: "/manual/orders", icon: "ShoppingBag", exact: true },

  { section: "Marketplaces", page_key: "marketplace_accounts", page_name: "Accounts", path: "/marketplace/accounts", icon: "Store", exact: true },
  { section: "Marketplaces", page_key: "daraz_products", page_name: "Daraz Products", path: "/daraz/products", icon: "ShoppingBag", exact: true },
  { section: "Marketplaces", page_key: "woo_products", page_name: "Woo Products", path: "/woo-products", icon: "ShoppingBag", exact: true },
  { section: "Marketplaces", page_key: "marketplace_transfer", page_name: "Transfer", path: "/marketplace/transfer", icon: "CloudUpload", exact: true },
  { section: "Marketplaces", page_key: "sku_mapping", page_name: "SKU Mapping", path: "/marketplace/sku-mappings", icon: "Search", exact: true },

  { section: "Finance", page_key: "net_sales", page_name: "Net Sales", path: "/finance/net-sales", icon: "BarChart3", exact: true },
  { section: "Finance", page_key: "price_dashboard", page_name: "Price Dashboard", path: "/price-dashboard", icon: "Calculator", exact: true },
  { section: "Finance", page_key: "daraz_finance", page_name: "Daraz Finance", path: "/daraz/finance", icon: "FileSpreadsheet", exact: true },

  { section: "Reports", page_key: "demand_analysis", page_name: "Demand Analysis", path: "/reports/demand-analysis", icon: "TrendingUp", exact: true },
  { section: "Settings", page_key: "settings", page_name: "Settings", path: "/settings", icon: "Settings2", exact: true },
];

function groupMenu(menuItems) {
  return menuItems.reduce((grouped, item) => {
    const sectionName = String(item.section || "MAIN").toUpperCase();
    if (!grouped[sectionName]) grouped[sectionName] = [];
    grouped[sectionName].push(item);
    return grouped;
  }, {});
}

export default function Sidebar({ open, onClose }) {
  const [menu] = useState(staticMenu);
  const groupedMenu = useMemo(() => groupMenu(menu), [menu]);

  return (
    <>
      <div className={`fixed bottom-0 left-0 right-0 top-16 z-30 bg-black/60 transition lg:hidden ${open ? "block" : "hidden"}`} onClick={onClose} />
      <aside className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden border-r border-[#1d2940] bg-[#0f172a] text-slate-100 shadow-2xl shadow-black/40 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 shrink-0 items-center justify-end border-b border-[#1d2940] px-4 lg:hidden">
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
                    <NavLink key={item.page_key} to={item.path} end={item.exact} onClick={onClose} className={({ isActive }) => `relative flex cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-[13px] font-semibold transition ${isActive ? "bg-[#1b3158] text-white" : "text-slate-300 hover:bg-[#16233a] hover:text-white"}`}>
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute left-[-8px] top-0 h-full w-[3px] rounded-r bg-[#2f80ff]" />}
                          <Icon size={16} className={isActive ? "text-[#7fb3ff]" : "text-slate-400"} />
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
