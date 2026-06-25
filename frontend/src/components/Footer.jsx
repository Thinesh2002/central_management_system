import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#07111f] px-4 py-4 text-center text-xs font-medium text-slate-400 sm:px-6 lg:px-8">
      © {new Date().getFullYear()} TECKVORA PVT LTD. All rights reserved.
    </footer>
  );
}