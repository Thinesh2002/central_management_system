import React from "react";
import { Navigate } from "react-router-dom";
import { getStoredUser, isLoggedIn } from "./auth";
import { useAppShell } from "../components/common/app_shell/AppShellContext";

export default function ProtectedRoute({ children, roles }) {
  const user = getStoredUser();
  const { homePath } = useAppShell();

  if (!isLoggedIn() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to={homePath} replace />;
  }

  return children;
}
