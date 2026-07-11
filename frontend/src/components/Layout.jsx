import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import NotificationBell from "./NotificationBell";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // A page opened inside the full-screen overlay iframe (PageOverlayProvider)
  // is a real, independent instance of this app — it would otherwise render
  // its own full sidebar nested inside the outer page's sidebar. The `embed`
  // flag strips all of that down to bare page content.
  const embedded = searchParams.get("embed") === "1";

  if (embedded) {
    return <main className="h-screen overflow-y-auto bg-slate-950 p-1.5 text-slate-100">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Floating mobile menu button — the sidebar is the only way to open
          itself on small screens now that there's no header to host a
          toggle button. */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-3 top-3 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-[#0f172a] text-slate-200 shadow-lg shadow-black/40 transition hover:bg-slate-800 lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={18} />
      </button>

      <NotificationBell />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:pl-58">
        <main className="m-1.5 flex-1 bg-slate-950 p-1.5">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
