import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../config/api";
import { getStoredUser, logout } from "../config/auth";
import { useAccessMenu } from "../hooks/useAccessMenu";
import { canAccessPage } from "../utils/accessMenu";
import { usePageOverlay } from "./common/page_overlay/PageOverlayProvider";
import {
  LayoutDashboard,
  Users,
  X,
  LogOut,
  BarChart3,
  FilePlus2,
  Grid3X3,
  Image,
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
  Palette,
  DollarSign,
  Package,
  Clock,
  MessageSquare,
  Sparkles,
  Bell,
  Truck,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  Users,
  BarChart3,
  FilePlus2,
  Grid3X3,
  Image,
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
  Palette,
  DollarSign,
  Package,
  Clock,
  MessageSquare,
  Sparkles,
  Bell,
  Truck,
};

const staticMenu = [
  {
    section: "PRODUCT MANAGEMENT",
    page_key: "products",
    pageKeys: ["products", "local_products"],
    page_name: "Local Products",
    path: "/product/local-products",
    icon: "BarChart3",
    exact: true,
  },
  {
    section: "PRODUCT MANAGEMENT",
    page_key: "images_dashboard",
    page_name: "Images Dashboard",
    path: "/product/images",
    icon: "Image",
    exact: true,
  },
  {
    section: "PRODUCT MANAGEMENT",
    page_key: "category_master",
    pageKeys: ["category_master", "categories"],
    page_name: "Category / Code Master",
    path: "/product/categories",
    icon: "Grid3X3",
    exact: true,
  },
  {
    section: "PRODUCT MANAGEMENT",
    page_key: "colour_master",
    pageKeys: ["colour_master", "colours"],
    page_name: "Colours",
    path: "/product/colours",
    icon: "Palette",
    exact: true,
  },
  {
    section: "PRODUCT MANAGEMENT",
    page_key: "sku_mapping",
    page_name: "SKU Mapping",
    path: "/product/sku-mapping",
    icon: "PackageSearch",
    exact: true,
  },
  {
    section: "MARKETPLACE MANAGEMENT",
    page_key: "daraz_products",
    page_name: "Daraz Products",
    path: "/product/daraz-products",
    icon: "ShoppingBag",
    exact: true,
  },
  {
    section: "OPTIMIZATION",
    page_key: "daraz_title_optimizer",
    page_name: "Title Optimizer",
    path: "/product/daraz-products/title-optimizer",
    icon: "Sparkles",
    exact: true,
  },
  {
    section: "MARKETPLACE MANAGEMENT",
    page_key: "woo_products",
    page_name: "WooCommerce Products",
    path: "/product/woo-products",
    icon: "Store",
    exact: true,
  },
  {
    section: "REPORTS",
    page_key: "sales_dashboard",
    page_name: "Sales",
    path: "/reports/sales",
    icon: "BarChart3",
    exact: true,
  },
  {
    section: "REPORTS",
    page_key: "price_rules",
    page_name: "Price Rules",
    path: "/price-rules",
    icon: "SlidersHorizontal",
    exact: true,
  },
  {
    section: "ORDER MANAGEMENT",
    page_key: "orders",
    page_name: "Orders",
    path: "/order-management/orders",
    icon: "Package",
    exact: false,
  },
  {
    section: "ORDER MANAGEMENT",
    page_key: "order_customers",
    page_name: "Customers",
    path: "/order-management/customers",
    icon: "Users",
    exact: true,
  },
  {
    section: "ORDER MANAGEMENT",
    page_key: "product_trends",
    page_name: "Product Trends",
    path: "/order-management/product-trends",
    icon: "BarChart3",
    exact: true,
  },
  {
    section: "ORDER MANAGEMENT",
    page_key: "order_sync_settings",
    page_name: "Daraz Sync Settings",
    path: "/order-management/sync-settings",
    icon: "Clock",
    exact: true,
  },
  {
    section: "FINANCE",
    page_key: "daraz_finance",
    page_name: "Daraz Finance",
    path: "/order-management/finance",
    icon: "DollarSign",
    exact: true,
  },
  {
    section: "MESSAGES",
    page_key: "message_templates",
    page_name: "Message Templates",
    path: "/order-management/message-templates",
    icon: "MessageSquare",
    exact: true,
  },
  {
    section: "CONFIGURATION",
    page_key: "marketplace_accounts",
    page_name: "Marketplace Accounts",
    path: "/marketplace/accounts",
    icon: "Store",
    exact: true,
  },
  {
    section: "CONFIGURATION",
    page_key: "daraz_metrics",
    page_name: "Daraz Metrics",
    path: "/marketplace/daraz-metrics",
    icon: "BarChart3",
    exact: true,
  },
  {
    section: "SUPPLIER MANAGEMENT",
    page_key: "suppliers",
    page_name: "Suppliers",
    path: "/suppliers",
    icon: "Truck",
    exact: true,
  },
  {
    section: "SUPPLIER MANAGEMENT",
    page_key: "purchase_orders",
    page_name: "Purchase Orders",
    path: "/purchase-orders",
    icon: "ClipboardList",
    exact: true,
  },
  {
    section: "SUPPLIER MANAGEMENT",
    page_key: "grn",
    page_name: "Goods Received Notes",
    path: "/goods-received",
    icon: "Boxes",
    exact: true,
  },
  {
    section: "SETTINGS",
    page_key: "notifications",
    page_name: "Notifications",
    path: "/notifications",
    icon: "Bell",
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
  const user = getStoredUser();
  const accessMenu = useAccessMenu();
  const { closeOverlay } = usePageOverlay();
  const [menu] = useState(staticMenu);

  const visibleMenu = useMemo(
    // Notifications is cross-cutting (same as the backend route, which only
    // requires login, no page-permission grant) - always shown regardless
    // of the user's granular access-control assignments.
    () => menu.filter((item) => item.page_key === "notifications" || canAccessPage(accessMenu, user, item)),
    [menu, accessMenu, user]
  );

  const groupedMenu = useMemo(() => groupMenu(visibleMenu), [visibleMenu]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore — clear local session below regardless of server response.
    } finally {
      logout();
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition lg:hidden ${
          open ? "block" : "hidden"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-58 flex-col overflow-hidden border-r border-[#1d2940] bg-[#0f172a] text-slate-100 shadow-2xl shadow-black/40 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + mobile close button */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#1d2940] px-3">
          <NavLink
            to="/dashboard"
            onClick={() => {
              closeOverlay();
              onClose();
            }}
            className="truncate text-sm font-bold text-white"
          >
            Central Management
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:bg-[#16233a] hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden">
          {Object.entries(groupedMenu).map(([sectionName, items]) => (
            <div key={sectionName} className="border-b border-[#1d2940] py-3">
              {sectionName !== "MESSAGES" && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFD400]">
                  {sectionName}
                </p>
              )}

              <div className="space-y-0.5 px-2">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;

                  return (
                    <NavLink
                      key={item.page_key}
                      to={item.path}
                      end={item.exact}
                      onClick={() => {
                        closeOverlay();
                        onClose();
                      }}
                      className={({ isActive }) =>
                        `relative flex cursor-pointer items-center gap-2.5 rounded-md px-3.5 py-2 text-[12px] font-semibold transition ${
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
                            size={15}
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

        {/* User + logout */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#1d2940] px-3 py-2.5">
          <p className="min-w-0 truncate text-[12px] font-semibold text-slate-300">{user?.name || "User"}</p>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#1d2940] text-slate-400 transition hover:bg-red-950 hover:text-red-300"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}