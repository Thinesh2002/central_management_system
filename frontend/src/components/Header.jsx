import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock3,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import api from "../config/api";
import {
  getStoredMenu,
  getStoredUser,
  logout,
  saveMenu,
} from "../config/auth";
import GlobalProductSearch from "./GlobalProductSearch";

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

function formatDateTime(date) {
  return {
    date: new Intl.DateTimeFormat("en-LK", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date),
  };
}

export default function Header({ onMenuClick }) {
  const user = getStoredUser();
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessMenu, setAccessMenu] = useState(() => getStoredMenu?.() || []);
  const [now, setNow] = useState(() => new Date());

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

  const dateTime = useMemo(() => formatDateTime(now), [now]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
    } finally {
      logout();
    }
  }

  function handleNavigate(path) {
    setSettingsOpen(false);
    navigate(path);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
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
            className="shrink-0 cursor-pointer text-lg font-bold tracking-wide text-white transition hover:text-slate-300 sm:text-xl"
          >
            Central Management System
          </Link>
        </div>

        <GlobalProductSearch />

        <div className="relative flex shrink-0 items-center gap-2" ref={dropdownRef}>
          <div className="hidden items-center gap-2 rounded-xl  bg-[#0b1220] px-3 py-1.5 text-xs font-bold text-slate-300 xl:flex">
          
            <div className="leading-tight">
              <p className="tabular-nums text-[14px] font-black text-slate-100">{dateTime.time}</p>
              <p className="mt-0.5 text-[10px] font-bold text-orange-300">{dateTime.date}</p>
            </div>
          </div>

          <p className="max-w-[150px] truncate text-sm font-semibold text-white">
            {user?.name || "User"}
          </p>

          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Open settings"
          >
            <Settings size={15} />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/40">
              <div className="mb-1 rounded-md bg-[#07111f] px-2 py-1.5 xl:hidden">
                <p className="text-[12px] font-black text-slate-100">{dateTime.time}</p>
                <p className="mt-0.5 text-[11px] font-bold text-orange-300">{dateTime.date}</p>
              </div>

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
