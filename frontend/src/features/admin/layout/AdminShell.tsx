import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../../../shared/components/Sidebar";
import {
  AuditIcon,
  CandidatesIcon,
  DashboardIcon,
  LogoutIcon,
  SettingsIcon,
  ShareIcon,
  SkillsIcon,
  UserCircleIcon
} from "../../../shared/components/Icons";
import { useAuth } from "../../../shared/auth/AuthProvider";
import { APP_ROUTES } from "../../../shared/config/routes";

type AdminShellProps = {
  children: ReactNode;
  hideSidebar?: boolean;
};

function BrandLogo() {
  return (
    <svg
      viewBox="0 0 32 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[22px] w-8 text-[#2c2c2c]"
      aria-label="Chromedia"
    >
      <path
        d="M27.5 5.5c-1.8-2-4.1-3-6.7-3-4.9 0-8.8 3.8-8.8 8.8s3.9 8.7 8.8 8.7c2.6 0 4.9-1 6.7-3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M5.2 11.2h12.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function AdminShell({ children, hideSidebar = false }: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, role } = useAuth();

  const topItems = [
    {
      label: "Dashboard",
      icon: <DashboardIcon className="h-5 w-5" />,
      active: location.pathname.startsWith(APP_ROUTES.admin.dashboard),
      to: APP_ROUTES.admin.dashboard
    },
    {
      label: "Candidates",
      icon: <CandidatesIcon className="h-5 w-5" />,
      active: location.pathname.startsWith(APP_ROUTES.admin.candidates),
      to: APP_ROUTES.admin.candidates
    },
    {
      label: "Skills",
      icon: <SkillsIcon className="h-5 w-5" />,
      active: location.pathname.startsWith(APP_ROUTES.admin.skills),
      to: APP_ROUTES.admin.skills
    },
    {
      label: "Shared Profiles",
      icon: <ShareIcon className="h-5 w-5" />,
      active: location.pathname.startsWith(APP_ROUTES.admin.sharedProfiles),
      to: APP_ROUTES.admin.sharedProfiles
    },
    ...(role === "super_admin"
      ? [
          {
            label: "Audit Logs",
            icon: <AuditIcon className="h-5 w-5" />,
            active: location.pathname.startsWith(APP_ROUTES.admin.auditLogs),
            to: APP_ROUTES.admin.auditLogs
          }
        ]
      : [])
  ];
  const resolvedBottomItems = [
    {
      label: "Account",
      icon: <UserCircleIcon className="h-5 w-5" />,
      to: APP_ROUTES.admin.account,
      active: location.pathname.startsWith(APP_ROUTES.admin.account)
    },
    {
      label: "Settings",
      icon: <SettingsIcon className="h-5 w-5" />,
      to: APP_ROUTES.admin.settings,
      active: location.pathname.startsWith(APP_ROUTES.admin.settings)
    },
    {
      label: "Logout",
      icon: <LogoutIcon className="h-5 w-5" />,
      onClick: async () => {
        await logout();
        navigate(APP_ROUTES.login, { replace: true });
      },
      active: false
    }
  ];

  if (hideSidebar) {
    return (
      <div className="h-screen overflow-hidden bg-[var(--color-bg-app,#f1f5f9)]">
        <section className="h-full overflow-y-auto">{children}</section>
      </div>
    );
  }

  return (
    <div className="grid h-screen min-w-[1280px] grid-cols-[200px_1fr] overflow-hidden bg-[var(--color-bg-app,#f1f5f9)]">
      <Sidebar topItems={topItems} bottomItems={resolvedBottomItems} logo={<BrandLogo />} />
      <section className="min-h-0 overflow-y-auto">{children}</section>
    </div>
  );
}
