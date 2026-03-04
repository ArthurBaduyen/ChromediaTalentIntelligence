import { ReactElement } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { AppRole } from "./permissions";
import { useAuth } from "./AuthProvider";
import { APP_ROUTES } from "../config/routes";

export function defaultPathForRole(role: AppRole, candidateId?: string) {
  if (role === "super_admin" || role === "admin") return APP_ROUTES.admin.dashboard;
  if (role === "candidate") return APP_ROUTES.login;
  return APP_ROUTES.customer.home;
}

export function ProtectedRoute({
  allowedRoles,
  children,
  requireCandidateOwnership = false
}: {
  allowedRoles: AppRole[];
  children: ReactElement;
  requireCandidateOwnership?: boolean;
}) {
  const { isReady, isAuthenticated, role, session } = useAuth();
  const location = useLocation();
  const params = useParams();

  if (!isReady) {
    return <div className="grid min-h-screen place-items-center bg-[#f1f5f9] text-sm text-[#667085]">Loading...</div>;
  }

  if (!isAuthenticated || !role) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={defaultPathForRole(role, session?.candidateId)} replace />;
  }

  if (requireCandidateOwnership && role === "candidate") {
    const routeCandidateId = params.candidateId;
    if (!routeCandidateId || !session?.candidateId || routeCandidateId !== session.candidateId) {
      return <Navigate to={APP_ROUTES.candidate.start(session?.candidateId ?? "alex-morgan")} replace />;
    }
  }

  return children;
}
