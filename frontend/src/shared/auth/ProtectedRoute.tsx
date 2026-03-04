import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppRole } from "./permissions";
import { useAuth } from "./AuthProvider";
import { APP_ROUTES } from "../config/routes";

export function defaultPathForRole(role: AppRole) {
  if (role === "super_admin" || role === "admin") return APP_ROUTES.admin.dashboard;
  return APP_ROUTES.login;
}

export function ProtectedRoute({
  allowedRoles,
  children
}: {
  allowedRoles: AppRole[];
  children: ReactElement;
}) {
  const { isReady, isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <div className="grid min-h-screen place-items-center bg-[#f1f5f9] text-sm text-[#667085]">Loading...</div>;
  }

  if (!isAuthenticated || !role) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  return children;
}
