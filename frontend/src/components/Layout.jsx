import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import Header from "./Header";

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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:pl-58">
        <main className="m-3 flex-1 rounded-2xl border border-slate-800 p-3">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
