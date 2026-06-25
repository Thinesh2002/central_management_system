import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  Settings,
  UserCog,
  ShieldCheck,
  ScrollText,
} from "lucide-react";

import api from "../config/api";
import {
  getStoredUser,
  logout,
  getStoredMenu,
  saveMenu,
} from "../config/auth";

function normalizePath(path) {
  if (!path) return "/";
  return path.split("?")[0].replace(/\/+$/, "") || "/";
}

function isMasterAdmin(user) {
  const role = String(user?.role || "").toLowerCase();

  return (
    role === "master_admin" ||
    role === "master admin" ||
    role === "super_admin" ||
    role === "super admin"
  );
}

function canShowMenuLink(menuItems, user, link) {
  // Master Admin full access
  if (isMasterAdmin(user)) return true;

  const linkPath = normalizePath(link.path);
  const linkKeys = Array.isArray(link.pageKeys)
    ? link.pageKeys.map((key) => String(key).toLowerCase())
    : [];

  return menuItems.some((item) => {
    const itemPath = normalizePath(item.path);
    const itemKey = String(item.page_key || "").toLowerCase();

    if (itemPath === linkPath) return true;
    if (linkKeys.includes(itemKey)) return true;

    return false;
  });
}

export default function Header({ onMenuClick }) {
  const user = getStoredUser();
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessMenu, setAccessMenu] = useState(() => getStoredMenu?.() || []);

  const dropdownRef = useRef(null);

  const settingsLinks = useMemo(
    () => [
      {
        label: "User Settings",
        path: "/users",
        pageKeys: ["users", "user_settings"],
        icon: UserCog,
      },
      {
        label: "Page Access",
        path: "/access-control",
        pageKeys: ["access_control", "page_access"],
        icon: ShieldCheck,
      },
      {
        label: "Logs",
        path: "/logs",
        pageKeys: ["logs", "login_logs", "system_logs"],
        icon: ScrollText,
      },
    ],
    []
  );

  const visibleSettingsLinks = useMemo(() => {
    return settingsLinks.filter((link) =>
      canShowMenuLink(accessMenu, user, link)
    );
  }, [settingsLinks, accessMenu, user]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Logout should still work even if the API log request fails.
    } finally {
      logout();
    }
  }

  function handleNavigate(path) {
    setSettingsOpen(false);
    navigate(path);
  }

  useEffect(() => {
    let active = true;

    async function loadUserAccessMenu() {
      try {
        const { data } = await api.get("/access/my-menu");
        const nextMenu = Array.isArray(data?.menu) ? data.menu : [];

        if (!active) return;

        setAccessMenu(nextMenu);
        saveMenu?.(nextMenu);
      } catch {
        const cachedMenu = getStoredMenu?.() || [];
        if (active) setAccessMenu(cachedMenu);
      }
    }

    loadUserAccessMenu();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-800 bg-[#07111f] text-white shadow-lg shadow-black/20">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200 transition hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          <Link
            to="/dashboard"
            className="cursor-pointer text-lg font-bold tracking-wide text-white transition hover:text-slate-300 sm:text-xl"
          >
            Central Management System
          </Link>
        </div>

        {/* Right side */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <p className="max-w-[150px] truncate text-sm font-semibold text-white">
            {user?.name || "User"}
          </p>

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Open settings"
          >
            <Settings size={14} />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-9 z-50 w-40 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/40">
              {visibleSettingsLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleNavigate(link.path)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Icon size={13} />
                    {link.label}
                  </button>
                );
              })}

              {visibleSettingsLinks.length > 0 && (
                <div className="my-1 border-t border-slate-700" />
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}