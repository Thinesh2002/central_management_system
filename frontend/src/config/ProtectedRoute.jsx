import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredMenu, getStoredUser, isLoggedIn } from "./auth";
import { canViewPage, getRegistryPageForPath, isMasterAdmin } from "./pageRegistry";

function AccessDenied() {
  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-4">
      <div className="max-w-lg rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center text-slate-100 shadow-xl shadow-black/20">
        <h1 className="text-xl font-bold text-red-200">Page access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Master Admin has not given view access for this page. Ask Master Admin to enable View/Edit/Delete access from Page Access.
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, roles, pageKey }) {
  const user = getStoredUser();
  const location = useLocation();

  if (!isLoggedIn() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isMasterAdmin(user)) {
    const menu = getStoredMenu?.() || [];
    const current = getRegistryPageForPath(location.pathname);
    const page = current || (pageKey ? { page_key: pageKey, path: location.pathname } : null);
    if (page && !canViewPage(user, menu, page)) {
      return <AccessDenied />;
    }
  }

  return children;
}
