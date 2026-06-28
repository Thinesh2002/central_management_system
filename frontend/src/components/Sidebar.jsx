import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, X } from "lucide-react";
import api from "../config/api";
import { getStoredMenu, getStoredUser, saveMenu } from "../config/auth";
import { appPages, filterPagesByAccess, groupMenu, iconMap } from "../config/pageRegistry";

function activeClass(isActive, item) {
  if (!isActive) {
    return "text-slate-300 hover:bg-[#16233a] hover:text-white hover:shadow-[inset_3px_0_0_rgba(251,191,36,0.45)]";
  }
  if (item.color === "orange") {
    return "bg-gradient-to-r from-orange-500/25 to-yellow-400/10 text-white ring-1 ring-orange-400/30 shadow-[inset_3px_0_0_rgba(251,146,60,1)]";
  }
  return "bg-[#1b3158] text-white ring-1 ring-blue-400/20 shadow-[inset_3px_0_0_rgba(96,165,250,1)]";
}

function mergeDbPage(staticPage, dbPage) {
  if (!dbPage) return staticPage;
  return {
    ...staticPage,
    page_name: dbPage.page_name || staticPage.page_name,
    path: dbPage.route_path || staticPage.path,
    icon: dbPage.icon || staticPage.icon,
    display_order: dbPage.display_order ?? staticPage.display_order,
  };
}

export default function Sidebar({ open, onClose }) {
  const user = getStoredUser();
  const [dbMenu, setDbMenu] = useState(() => getStoredMenu?.() || []);

  useEffect(() => {
    let alive = true;
    async function loadMenu() {
      try {
        const { data } = await api.get("/access/my-menu");
        const next = Array.isArray(data?.menu) ? data.menu : [];
        if (!alive) return;
        setDbMenu(next);
        saveMenu?.(next);
      } catch {
        if (alive) setDbMenu(getStoredMenu?.() || []);
      }
    }
    loadMenu();
    return () => { alive = false; };
  }, []);

  const menu = useMemo(() => {
    const dbByKey = new Map((dbMenu || []).map((item) => [String(item.page_key || "").toLowerCase(), item]));
    const merged = appPages.map((page) => mergeDbPage(page, dbByKey.get(String(page.page_key).toLowerCase())));
    return filterPagesByAccess(user, dbMenu, merged);
  }, [dbMenu, user]);

  const groupedMenu = useMemo(() => groupMenu(menu), [menu]);

  return (
    <>
      <div className={`fixed bottom-0 left-0 right-0 top-16 z-30 bg-black/60 transition lg:hidden ${open ? "block" : "hidden"}`} onClick={onClose} />
      <aside className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-col overflow-hidden border-r border-[#1d2940] bg-gradient-to-b from-[#0f172a] via-[#0b1324] to-[#070b14] text-slate-100 shadow-2xl shadow-black/50 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1d2940] px-4 lg:hidden">
          <span className="text-xs font-black uppercase tracking-widest text-yellow-300">Menu</span>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md p-2 text-slate-400 transition hover:bg-[#16233a] hover:text-white" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden pb-20">
          {Object.entries(groupedMenu).map(([sectionName, items]) => (
            <div key={sectionName} className="border-b border-[#1d2940]/80 py-3">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFD400]">{sectionName}</p>
              <div className="space-y-1 px-2">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  return (
                    <NavLink key={item.page_key} to={item.path} end onClick={onClose} className={({ isActive }) => `relative flex cursor-pointer items-center gap-3 rounded-md px-4 py-2.5 text-[13px] font-semibold transition ${activeClass(isActive, item)}`}>
                      {({ isActive }) => (
                        <>
                          <Icon size={16} className={isActive ? (item.color === "orange" ? "text-orange-300" : "text-[#7fb3ff]") : "text-slate-400"} />
                          <span className="truncate">{item.page_name}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {!menu.length ? (
            <div className="m-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
              No page access assigned. Ask Master Admin to enable pages for this user.
            </div>
          ) : null}
        </nav>
      </aside>
    </>
  );
}
