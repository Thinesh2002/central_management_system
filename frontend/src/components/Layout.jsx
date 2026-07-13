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
      <Header onOpenSidebar={() => setSidebarOpen(true)} />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-16 lg:pl-58">
        <main className="flex-1 bg-slate-950 p-3">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
