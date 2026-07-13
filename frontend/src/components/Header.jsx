import React from "react";
import { Menu } from "lucide-react";

import GlobalProductSearch from "./GlobalProductSearch";
import NotificationBell from "./NotificationBell";

// A slim utility bar scoped to the content column (not a page-wide header) -
// just search and notifications, sitting above whatever page is loaded.
export default function Header({ onOpenSidebar }) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2.5">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0f172a] text-slate-200 transition hover:bg-slate-800 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={17} />
      </button>

      <div className="min-w-0 flex-1">
        <GlobalProductSearch />
      </div>

      <NotificationBell />
    </div>
  );
}
