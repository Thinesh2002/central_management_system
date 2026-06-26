import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:pl-64">
        <main className="flex-1 bg-slate-950 px-3 py-4 sm:px-4 lg:px-5">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
