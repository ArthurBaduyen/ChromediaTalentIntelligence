import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { APP_ROUTES } from "../config/routes";
import { defaultPathForRole } from "../auth/ProtectedRoute";

export function NotFoundPage() {
  const { isAuthenticated, role } = useAuth();
  const backPath =
    isAuthenticated && role
      ? defaultPathForRole(role)
      : APP_ROUTES.login;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f1f5f9] px-4">
      <section className="w-full max-w-[560px] rounded-lg border border-[#eaecf0] bg-white p-8 text-center shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#1595d4]">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#242424]">Page not found</h1>
        <p className="mt-3 text-sm text-[#667085]">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to={backPath}
            className="inline-flex h-10 items-center rounded-[6px] bg-[#1595d4] px-4 text-sm font-semibold text-white hover:bg-[#0f7db3]"
          >
            Go back
          </Link>
          <Link
            to={APP_ROUTES.login}
            className="inline-flex h-10 items-center rounded-[6px] border border-[#d0d5dd] bg-white px-4 text-sm font-semibold text-[#344054] hover:bg-[#f8fafc]"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
