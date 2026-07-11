import React from "react";
import { Menu } from "lucide-react";

import GlobalProductSearch from "./GlobalProductSearch";
import NotificationBell from "./NotificationBell";

export default function Header({ onOpenSidebar }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-[#1d2940] bg-[#0f172a] px-3 shadow-lg shadow-black/30">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0b1220] text-slate-200 transition hover:bg-slate-800 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={17} />
      </button>

      <div className="hidden shrink-0 text-[13px] font-bold uppercase tracking-wide text-slate-300 lg:block lg:w-58">
        Central Management
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <GlobalProductSearch />
      </div>

      <div className="relative flex shrink-0 items-center">
        <NotificationBell inline />
      </div>
    </header>
  );
}
