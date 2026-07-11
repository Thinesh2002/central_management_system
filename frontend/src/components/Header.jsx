import React from "react";
import { Menu } from "lucide-react";

import GlobalProductSearch from "./GlobalProductSearch";
import NotificationBell from "./NotificationBell";

export default function Header({ onOpenSidebar }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-orange-500/20 bg-[#0b1220] px-3 shadow-md shadow-black/40 lg:left-58">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0f172a] text-slate-200 transition hover:bg-slate-800 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={17} />
      </button>

      <div className="mx-auto w-full max-w-2xl">
        <GlobalProductSearch />
      </div>

      <div className="relative flex shrink-0 items-center">
        <NotificationBell inline />
      </div>
    </header>
  );
}
