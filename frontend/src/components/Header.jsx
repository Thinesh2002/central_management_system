import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  ScrollText,
  UserCog,
} from "lucide-react";

import api from "../config/api";
import { getStoredUser, logout, getStoredMenu, saveMenu } from "../config/auth";

function normalizePath(path) {
  if (!path) return "/";
  return path.split("?")[0].replace(/\/+$/, "") || "/";
}

function isMasterAdmin(user) {
  const role = String(user?.role || "").toLowerCase();
  return role === "master_admin" || role === "master admin" || role === "super_admin" || role === "super admin";
}

function canShowMenuLink(menuItems, user, link) {
  if (isMasterAdmin(user)) return true;
  const linkPath = normalizePath(link.path);
  const linkKeys = Array.isArray(link.pageKeys) ? link.pageKeys.map((key) => String(key).toLowerCase()) : [];
  return menuItems.some((item) => {
    const itemPath = normalizePath(item.path);
    const itemKey = String(item.page_key || "").toLowerCase();
    return itemPath === linkPath || linkKeys.includes(itemKey);
  });
}

function formatDateTime(value) {
  return value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Header({ onMenuClick }) {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessMenu, setAccessMenu] = useState(() => getStoredMenu?.() || []);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const dropdownRef = useRef(null);

  const settingsLinks = useMemo(
    () => [
      { label: "System Settings", path: "/settings", pageKeys: ["settings", "page_settings"], icon: SlidersHorizontal },
      { label: "User Settings", path: "/users", pageKeys: ["users", "user_settings"], icon: UserCog },
      { label: "Page Access", path: "/access-control", pageKeys: ["access_control", "page_access"], icon: ShieldCheck },
      { label: "Logs", path: "/logs", pageKeys: ["logs", "login_logs", "system_logs"], icon: ScrollText },
    ],
    []
  );

  const visibleSettingsLinks = useMemo(() => settingsLinks.filter((link) => canShowMenuLink(accessMenu, user, link)), [settingsLinks, accessMenu, user]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // local logout still required
    } finally {
      logout();
    }
  }

  function handleNavigate(path) {
    setSettingsOpen(false);
    navigate(path);
  }

  function submitSearch(event) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/inventory/sku-search?sku=${encodeURIComponent(value)}`);
    setQuery("");
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setSettingsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-800 bg-[#07111f] text-white shadow-lg shadow-black/20">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuClick} className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200 transition hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Open sidebar">
            <Menu size={18} />
          </button>
          <Link to="/dashboard" className="hidden truncate text-lg font-bold tracking-wide text-white transition hover:text-slate-300 sm:block sm:text-xl">
            Central Management System
          </Link>
        </div>

        <form onSubmit={submitSearch} className="hidden min-w-[260px] max-w-[520px] flex-1 md:block">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search SKU and open report"
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-yellow-400/70"
            />
          </div>
        </form>

        <div className="relative flex shrink-0 items-center gap-2" ref={dropdownRef}>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300 xl:flex">
            <CalendarClock size={14} className="text-yellow-200" />
            {formatDateTime(now)}
          </div>

          <p className="max-w-[120px] truncate text-sm font-semibold text-white">{user?.name || "User"}</p>

          <button type="button" onClick={() => setSettingsOpen((prev) => !prev)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white" aria-label="Open settings">
            <Settings size={15} />
          </button>

          {settingsOpen && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/40">
              {visibleSettingsLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button key={link.path} type="button" onClick={() => handleNavigate(link.path)} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white">
                    <Icon size={14} />
                    {link.label}
                  </button>
                );
              })}
              {visibleSettingsLinks.length > 0 && <div className="my-1 border-t border-slate-700" />}
              <button type="button" onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200">
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
