/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, financeApi } from "../lib/api";
import { getStoredUser, getToken } from "../lib/auth";
import { Spinner } from "./ui";

const SessionContext = createContext(null);

const NO_ACCESS = {
  dashboard: { view: false },
  ledger: { view: false, edit: false, delete: false },
  daraz: { view: false, edit: false },
};

export function SessionProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setAccess(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [meRes, accessRes] = await Promise.all([authApi.me(), financeApi.access()]);
      setUser(meRes.data.user);
      setAccess(accessRes.data.data || NO_ACCESS);
    } catch {
      setAccess(NO_ACCESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, access: access || NO_ACCESS, loading, refresh, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export function RequireAuth({ children, permission }) {
  const location = useLocation();
  const { access, loading } = useSession();

  if (!getToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (permission) {
    const [page, action] = permission.split(".");
    if (!access[page]?.[action]) return <NoAccess />;
  }

  return children;
}

function NoAccess() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center">
      <h1 className="text-lg font-semibold text-white">No access</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Your account doesn't have permission for this page. Ask an administrator to grant you
        access to the requested Finance page.
      </p>
    </div>
  );
}
