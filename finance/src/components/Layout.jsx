import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, ReceiptText, Wallet, X } from "lucide-react";
import { useSession } from "./Session";
import { authApi } from "../lib/api";
import { logout } from "../lib/auth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: ["dashboard", "view"] },
  { to: "/daraz", label: "Daraz Income", icon: ReceiptText, permission: ["daraz", "view"] },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, access } = useSession();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Logging out locally is what matters; the server call only writes a log row.
    }
    logout();
  };

  const nav = NAV.filter(({ permission: [page, action] }) => access[page]?.[action]);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-neutral-800 bg-[#111111] transition-transform lg:tranneutral-x-0 ${
          open ? "tranneutral-x-0" : "-tranneutral-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Finance</p>
              <p className="text-[11px] text-neutral-400">Management</p>
            </div>
          </div>
          <button type="button" className="rounded p-1 text-neutral-400 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                  isActive ? "bg-orange-500/15 font-medium text-orange-300" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-800 p-3">
          <p className="truncate text-sm font-medium text-neutral-200">{user?.name || "—"}</p>
          <p className="truncate text-xs text-neutral-500">{user?.email || user?.user_uid}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={17} />
      </button>

      <main className="min-w-0 flex-1 overflow-y-auto lg:pl-56">
        <div className="px-3 pb-10 pt-14 lg:px-4 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
