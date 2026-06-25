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

      <div className="lg:pl-58">
        <main className="min-h-[calc(100vh-136px)] bg-slate-950 px-1 py-2 sm:px-2 lg:px-2">
          <div className="mx-auto w-full ]
          ">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}