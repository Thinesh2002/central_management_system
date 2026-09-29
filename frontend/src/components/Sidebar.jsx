import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../config/api";
import { getStoredUser, logout } from "../config/auth";
import { useAccessMenu } from "../hooks/useAccessMenu";
import { canAccessPage } from "../utils/accessMenu";
import { usePageOverlay } from "./common/page_overlay/PageOverlayProvider";
import { useAppShell } from "./common/app_shell/AppShellContext";
import { staticMenu } from "../utils/sidebarMenu";
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
  Monitor,
  ShieldCheck,
  Wallet,
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
  Monitor,
  ShieldCheck,
  Wallet,
};

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
  const shell = useAppShell();
  const [menu] = useState(shell.menu || staticMenu);

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
            to={shell.homePath}
            onClick={() => {
              closeOverlay();
              onClose();
            }}
            className="truncate text-sm font-bold text-white"
          >
            {shell.title}
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