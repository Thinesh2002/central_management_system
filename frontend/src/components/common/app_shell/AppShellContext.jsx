import { createContext, useContext } from "react";

// The same page/route modules are built into more than one app (the main
// CMS at system.teckvora.com and the standalone Inventory Management app at
// inventory.teckvora.com - see src/inventory_app/). Each entry point
// provides its own shell here so the shared Sidebar, Login and overlay
// chrome show that app's name, home page and menu instead of hard-coding
// the CMS ones. Defaults are the CMS shell, so main.jsx needs no provider.
const DEFAULT_SHELL = {
  title: "Central Management",
  homePath: "/dashboard",
  // null = Sidebar's full CMS menu.
  menu: null,
};

const AppShellContext = createContext(DEFAULT_SHELL);

export function AppShellProvider({ value, children }) {
  return (
    <AppShellContext.Provider value={{ ...DEFAULT_SHELL, ...value }}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  return useContext(AppShellContext);
}
