import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../../../config/api";
import { getStoredUser, getToken } from "../../../config/auth";
import { isMasterAdmin } from "../../../utils/accessMenu";

const PermissionsContext = createContext(null);

const FULL_ACCESS = { canView: true, canEdit: true, canDelete: true };
const NO_ACCESS = { canView: false, canEdit: false, canDelete: false };

export function PermissionsProvider({ children }) {
  const user = getStoredUser();
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (!getToken()) return undefined;

    let active = true;

    async function loadPermissions() {
      try {
        const { data } = await api.get("/access/my-permissions");
        if (active) setPages(Array.isArray(data?.pages) ? data.pages : []);
      } catch {
        if (active) setPages([]);
      }
    }

    loadPermissions();

    return () => {
      active = false;
    };
  }, [user]);

  const value = useMemo(() => {
    const master = isMasterAdmin(user);
    const role = String(user?.role || "").toLowerCase();

    // Cost price is sensitive margin data — only master admins and admins
    // should ever see it, regardless of that user's per-page view/edit/delete
    // grants in the Access Control matrix.
    const canViewCostPrice = master || role === "admin";

    function getPermission(pageKey) {
      if (master) return FULL_ACCESS;

      const page = pages.find((item) => item.page_key === pageKey);
      if (!page) return NO_ACCESS;

      return {
        canView: Boolean(page.permission?.can_view),
        canEdit: Boolean(page.permission?.can_edit),
        canDelete: Boolean(page.permission?.can_delete),
      };
    }

    return { isMasterAdmin: master, canViewCostPrice, getPermission };
  }, [pages, user]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePagePermission(pageKey) {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error("usePagePermission must be used within a PermissionsProvider");
  }

  return context.getPermission(pageKey);
}

export function useCanViewCostPrice() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error("useCanViewCostPrice must be used within a PermissionsProvider");
  }

  return context.canViewCostPrice;
}

export function useIsMasterAdmin() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error("useIsMasterAdmin must be used within a PermissionsProvider");
  }

  return context.isMasterAdmin;
}
