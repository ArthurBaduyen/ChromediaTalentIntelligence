import { AdminShell } from "../layout/AdminShell";
import { Link } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import { APP_ROUTES } from "../../../shared/config/routes";
import { useThemePreference } from "../../../shared/hooks/useThemePreference";

export function SettingsPage() {
  const { theme, toggleTheme } = useThemePreference();

  return (
    <AdminShell>
      <div className="flex min-h-full flex-1 flex-col bg-surface-default p-4 shadow-lg">
        <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
          <div className="w-full max-w-[560px] rounded-lg border border-border-default bg-surface-muted px-8 py-6 text-center">
            <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
            <p className="mt-2 text-sm text-text-muted">Theme and design system shortcuts</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button variant="secondary" onClick={toggleTheme}>
                Theme: {theme}
              </Button>
              <Link to={APP_ROUTES.design}>
                <Button variant="ghost">Open /design</Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-text-muted">Theme preference is persisted locally.</p>
          </div>
        </main>
      </div>
    </AdminShell>
  );
}
