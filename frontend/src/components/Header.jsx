import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  Settings,
  UserCog,
  ShieldCheck,
  ScrollText,
  Search,
} from "lucide-react";

import api from "../config/api";
import {
  getStoredUser,
  logout,
  getStoredMenu,
  saveMenu,
} from "../config/auth";
import globalSearchApi from "../config/sub_api/marketplace_api/global_search_api";

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

export default function Header({ onMenuClick }) {
  const user = getStoredUser();
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessMenu, setAccessMenu] = useState(() => getStoredMenu?.() || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

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
    } finally {
      logout();
    }
  }

  function handleNavigate(path) {
    setSettingsOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
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
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    let active = true;
    setSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await globalSearchApi.search({ q: query, limit: 8 });
        const payload = response?.data || {};
        const rows = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.data) ? payload.data : [];
        if (active) setSearchResults(rows);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      const inSettings = dropdownRef.current && dropdownRef.current.contains(event.target);
      const inSearch = searchRef.current && searchRef.current.contains(event.target);
      if (!inSettings && !inSearch) {
        setSettingsOpen(false);
        setSearchOpen(false);
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

        <div className="relative mx-3 hidden min-w-[260px] max-w-xl flex-1 md:block" ref={searchRef}>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
            placeholder="Search pages, products, SKUs, orders..."
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-9 pr-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-700"
          />
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40">
              {searchLoading && <div className="px-3 py-3 text-xs font-semibold text-slate-500">Searching...</div>}
              {!searchLoading && searchResults.length === 0 && <div className="px-3 py-3 text-xs font-semibold text-slate-500">No results found.</div>}
              {!searchLoading && searchResults.map((result, index) => (
                <button
                  key={`${result.route || result.name}-${index}`}
                  type="button"
                  onClick={() => handleNavigate(result.route || "/dashboard")}
                  className="flex w-full items-start gap-2 border-b border-slate-800 px-3 py-2 text-left last:border-b-0 hover:bg-slate-800"
                >
                  <span className="mt-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">{result.type || "Result"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-100">{result.name || result.title || result.route}</span>
                    <span className="block truncate text-[11px] text-slate-500">{result.code || result.sku || result.order_no || result.sku_or_number || result.route}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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