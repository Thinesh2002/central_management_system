import { useEffect, useState } from "react";
import api from "../config/api";
import { getStoredMenu, saveMenu } from "../config/auth";

export function useAccessMenu() {
  const [menu, setMenu] = useState(() => getStoredMenu?.() || []);

  useEffect(() => {
    let active = true;

    async function loadUserAccessMenu() {
      try {
        const { data } = await api.get("/access/my-menu");
        const nextMenu = Array.isArray(data?.menu) ? data.menu : [];

        if (!active) return;

        setMenu(nextMenu);
        saveMenu?.(nextMenu);
      } catch {
        const cachedMenu = getStoredMenu?.() || [];
        if (active) setMenu(cachedMenu);
      }
    }

    loadUserAccessMenu();

    return () => {
      active = false;
    };
  }, []);

  return menu;
}
