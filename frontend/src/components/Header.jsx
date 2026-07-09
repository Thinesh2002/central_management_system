import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";

import api from "../config/api";
import { getStoredUser, logout } from "../config/auth";
import GlobalProductSearch from "./GlobalProductSearch";

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
  const [now, setNow] = useState(() => new Date());

  const dateTime = useMemo(() => formatDateTime(now), [now]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore — clear local session below regardless of server response.
    } finally {
      logout();
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="z-50 h-16 w-full shrink-0 border-b border-slate-800 bg-[#07111f] text-white shadow-lg shadow-black/20">
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

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl bg-[#0b1220] px-3 py-1.5 text-xs font-bold text-slate-300 xl:flex">
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
            onClick={handleLogout}
            title="Logout"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-red-950 hover:text-red-300"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
