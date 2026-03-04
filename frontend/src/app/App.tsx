import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AccountPage } from "../features/admin/pages/AccountPage";
import { DashboardPage } from "../features/admin/pages/DashboardPage";
import { CandidateProfilePage } from "../features/admin/pages/CandidateProfilePage";
import { CandidatesPage } from "../features/admin/pages/CandidatesPage";
import { AuditLogsPage } from "../features/admin/pages/AuditLogsPage";
import { SettingsPage } from "../features/admin/pages/SettingsPage";
import { SkillsPage } from "../features/admin/pages/SkillsPage";
import { SharedProfilesPage } from "../features/admin/pages/SharedProfilesPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { CandidateSkillFormPage } from "../features/candidate/pages/CandidateSkillFormPage";
import { CandidateSkillStartPage } from "../features/candidate/pages/CandidateSkillStartPage";
import { CandidateHomePage } from "../features/candidate/pages/CandidateHomePage";
import { CustomerHomePage } from "../features/customer/pages/CustomerHomePage";
import { DesignSystemPage } from "../features/design/pages/DesignSystemPage";
import { useAuth } from "../shared/auth/AuthProvider";
import { defaultPathForRole, ProtectedRoute } from "../shared/auth/ProtectedRoute";
import { NotFoundPage } from "../shared/components/NotFoundPage";
import { APP_ROUTES } from "../shared/config/routes";
import { applyTheme, readStoredTheme } from "../shared/hooks/useThemePreference";

function RootRedirect() {
  const { isReady, isAuthenticated, role, session } = useAuth();
  if (!isReady) {
    return <div className="grid min-h-screen place-items-center bg-[#f1f5f9] text-sm text-[#667085]">Loading...</div>;
  }
  if (!isAuthenticated || !role) {
    return <Navigate to={APP_ROUTES.login} replace />;
  }
  if (role === "candidate") {
    return <Navigate to={APP_ROUTES.login} replace />;
  }
  return <Navigate to={defaultPathForRole(role, session?.candidateId)} replace />;
}

export function App() {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path={APP_ROUTES.login} element={<LoginPage />} />
      <Route path={APP_ROUTES.design} element={<DesignSystemPage />} />
      <Route
        path={APP_ROUTES.admin.dashboard}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.admin.account}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.admin.settings}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.admin.candidates}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <CandidatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/candidates/:candidateId"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <CandidateProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.admin.skills}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SkillsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.admin.sharedProfiles}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SharedProfilesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.admin.auditLogs}
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/candidates/:candidateId/preview"
        element={
          <ProtectedRoute allowedRoles={["admin", "client"]}>
            <CandidateProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/shared/:shareToken" element={<CandidateProfilePage />} />
      <Route
        path="/candidate/:candidateId/start"
        element={<CandidateSkillStartPage />}
      />
      <Route
        path="/candidate/:candidateId/skills"
        element={<CandidateSkillFormPage />}
      />
      <Route
        path={APP_ROUTES.customer.home}
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <CustomerHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_ROUTES.candidate.home}
        element={
          <ProtectedRoute allowedRoles={["candidate"]}>
            <CandidateHomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
