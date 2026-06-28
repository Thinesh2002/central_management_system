import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, Search, Settings, ShieldCheck, SlidersHorizontal, ScrollText, UserCog } from "lucide-react";

import api from "../config/api";
import { getStoredUser, logout, getStoredMenu, saveMenu } from "../config/auth";
import { appPages, canViewPage, isMasterAdmin, normalizePath } from "../config/pageRegistry";

function canShowMenuLink(menuItems, user, link) {
  if (isMasterAdmin(user)) return true;
  const linkPath = normalizePath(link.path);
  const linkKeys = Array.isArray(link.pageKeys) ? link.pageKeys.map((key) => String(key).toLowerCase()) : [];
  return (menuItems || []).some((item) => {
    const itemPath = normalizePath(item.path || item.route_path);
    const itemKey = String(item.page_key || "").toLowerCase();
    return itemPath === linkPath || linkKeys.includes(itemKey);
  });
}

function formatClock(date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Header({ onMenuClick }) {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessMenu, setAccessMenu] = useState(() => getStoredMenu?.() || []);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

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

  const pageMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return appPages
      .filter((page) => canViewPage(user, accessMenu, page))
      .filter((page) => `${page.page_name} ${page.path} ${page.keywords || ""}`.toLowerCase().includes(q))
      .map((page) => ({ label: page.page_name, path: page.path }))
      .slice(0, 8);
  }, [query, accessMenu, user]);

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch { /* local logout still required */ }
    finally { logout(); }
  }

  function go(path) {
    setSettingsOpen(false);
    setQuery("");
    navigate(path);
  }

  function submitSearch(event) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    if (pageMatches.length) return go(pageMatches[0].path);
    return go(`/inventory/sku-search?sku=${encodeURIComponent(value)}`);
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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setSettingsOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        // keep typed text, only close native focus/dropdown by leaving matches hidden via focus state not needed
      }
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

        <form ref={searchRef} onSubmit={submitSearch} className="relative hidden min-w-[260px] max-w-[560px] flex-1 md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages or SKU"
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-yellow-400/70"
          />
          {query.trim() && pageMatches.length ? (
            <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-xl shadow-black/40">
              {pageMatches.map((item) => (
                <button key={item.path} type="button" onClick={() => go(item.path)} className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800">
                  {item.label}<span className="ml-2 text-slate-500">{item.path}</span>
                </button>
              ))}
              <button type="button" onClick={() => go(`/inventory/sku-search?sku=${encodeURIComponent(query.trim())}`)} className="block w-full border-t border-slate-800 px-3 py-2 text-left text-xs font-semibold text-yellow-100 hover:bg-slate-800">
                Search SKU: {query.trim()}
              </button>
            </div>
          ) : null}
        </form>

        <div className="relative flex shrink-0 items-center gap-2" ref={dropdownRef}>
          <p className="max-w-[120px] truncate text-sm font-semibold text-white">{user?.name || "User"}</p>

          <button type="button" onClick={() => setSettingsOpen((prev) => !prev)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white" aria-label="Open settings">
            <Settings size={15} />
          </button>

          <div className="hidden min-w-[92px] rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-center xl:block">
            <p className="font-mono text-sm font-bold leading-4 text-slate-100">{formatClock(now)}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{formatDate(now)}</p>
          </div>

          {settingsOpen && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/40">
              {visibleSettingsLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button key={link.path} type="button" onClick={() => go(link.path)} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white">
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
