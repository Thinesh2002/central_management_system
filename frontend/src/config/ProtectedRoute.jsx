import React from "react";
import { Navigate } from "react-router-dom";
import { getStoredUser, isLoggedIn } from "./auth";

export default function ProtectedRoute({ children, roles }) {
  const user = getStoredUser();

  if (!isLoggedIn() || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
