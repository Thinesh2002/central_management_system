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
  {
    section: "PRODUCTS",
    page_key: "products",
    page_name: "Products",
    path: "/product/local-products",
    icon: "BarChart3",
    exact: true,
  },
  {
    section: "PRODUCTS",
    page_key: "add_product",
    page_name: "Add Product",
    path: "/product/local-products/create",
    icon: "FilePlus2",
    exact: true,
  },
  {
    section: "PRODUCTS",
    page_key: "Categorys",
    page_name: "Categorys",
    path: "/product/categories",
    icon: "Grid3X3",
    exact: true,
  },

  {
    section: "MARKET PLACES",
    page_key: "Daraz_products",
    page_name: "Daraz Products",
    path: "/Daraz/products",
    icon: "ShoppingBag",
    exact: true,
  },
  {
    section: "MARKET PLACES",
    page_key: "woo_products",
    page_name: "WooCommerce Products",
    path: "/woo-products",
    icon: "ShoppingBag",
    exact: true,
  },

    {
    section: "Orders",
    page_key: "Manual_orders",
    page_name: "Manual Orders",
    path: "/manual/orders",
    icon: "ShoppingBag",
    exact: true,
  },

  {
    section: "Orders",
    page_key: "Daraz_orders",
    page_name: "Daraz Orders",
    path: "/daraz/orders",
    icon: "ShoppingBag",
    exact: true,
  },

    {
    section: "Orders",
    page_key: "Woo_orders",
    page_name: "WooCommerce Orders",
    path: "/woo/orders",
    icon: "ShoppingBag",
    exact: true,
  },

  

  {
    section: "INVENTORY",
    page_key: "inventory",
    page_name: "Inventory",
    path: "/inventory",
    icon: "ClipboardList",
    exact: true,
  },


    {
    section: "Logs",
    page_key: "daraz_synce_logs",
    page_name: "Logs",
    path: "/daraz-products/logs",
    icon: "ScrollText",
    exact: true,
  },

      {
    section: "Logs",
    page_key: "System Logs",
    page_name: "System Logs",
    path: "/logs",
    icon: "ScrollText",
    exact: true,
  },

  {
    section: "configuration",
    page_key: "marketplace/accounts",
    page_name: "Marketplace Accounts",
    path: "/marketplace/accounts",
    icon: "Store",
    exact: true,
  },



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
      {/* Mobile overlay */}
      <div
        className={`fixed bottom-0 left-0 right-0 top-16 z-30 bg-black/60 transition lg:hidden ${
          open ? "block" : "hidden"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-58flex-col overflow-hidden border-r border-[#1d2940] bg-[#0f172a] text-slate-100 shadow-2xl shadow-black/40 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close button */}
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

        {/* Navigation */}
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