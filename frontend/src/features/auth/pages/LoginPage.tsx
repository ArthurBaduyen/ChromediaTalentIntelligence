import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import { FormInputField } from "../../../shared/components/FormInputField";
import { useAuth } from "../../../shared/auth/AuthProvider";
import { APP_ROUTES } from "../../../shared/config/routes";
import { DEMO_ACCOUNTS } from "../../../shared/auth/session";

const brandLogo = "https://www.figma.com/api/mcp/asset/18a2c059-6d4d-42f8-a8b2-1256d07938c5";

export function LoginPage() {
  const { isAuthenticated, session, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("superadmin@chromedia.local");
  const [password, setPassword] = useState("password123");
  const [resetPassword, setResetPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [error, setError] = useState("");

  const from = (location.state as { from?: string } | null)?.from;
  const resetToken = new URLSearchParams(location.search).get("resetToken");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError("");
    navigate(from ?? APP_ROUTES.admin.dashboard, { replace: true });
  };

  const onSubmitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetToken) return;
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: resetPassword })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Failed to reset password");
      return;
    }
    setError("");
    setResetDone(true);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#f1f5f9] px-4">
      <div className="w-full max-w-[460px] rounded-lg border border-[#eaecf0] bg-white p-6 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <div className="mb-4 flex justify-center">
          <img src={brandLogo} alt="Chromedia" className="h-[56px] w-auto object-contain" />
        </div>
        <h1 className="text-2xl font-semibold text-[#242424]">Sign in</h1>
        <p className="mt-1 text-sm text-[#667085]">Use a super admin, admin, or client demo account below.</p>
        {isAuthenticated && session ? (
          <div className="mt-3 flex items-center justify-between rounded-md border border-[#dbe3ea] bg-[#f8fafc] px-3 py-2 text-xs text-[#475467]">
            <span>Signed in as {session.email}</span>
            <button
              type="button"
              className="font-semibold text-[#1595d4]"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </div>
        ) : null}

        {resetToken ? (
          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmitReset}>
            <FormInputField
              label="New Password"
              value={resetPassword}
              onChange={setResetPassword}
              type="password"
              autoComplete="new-password"
            />
            {error ? <p className="text-xs text-[#f1080c]">{error}</p> : null}
            {resetDone ? <p className="text-xs text-[#027a48]">Password reset complete. You can now sign in.</p> : null}
            <Button variant="primary" className="h-10 w-full" type="submit">
              Set new password
            </Button>
          </form>
        ) : (
          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <FormInputField label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <FormInputField
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="current-password"
            />
            {error ? <p className="text-xs text-[#f1080c]">{error}</p> : null}
            <Button variant="primary" className="h-10 w-full" type="submit">
              Sign in
            </Button>
          </form>
        )}

        <div className="mt-5 rounded-md bg-[#f8fafc] p-3 text-xs text-[#475467]">
          <p className="mb-2 font-semibold text-[#344054]">Demo accounts</p>
          {DEMO_ACCOUNTS.map((account) => (
            <p key={account.email}>
              {account.role === "super_admin" ? "super admin" : account.role}: {account.email} / {account.password}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
