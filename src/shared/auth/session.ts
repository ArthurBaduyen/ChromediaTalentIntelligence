import { AppRole } from "./permissions";

export type AuthSession = {
  role: AppRole;
  email: string;
  name: string;
  candidateId?: string;
  sessionToken?: string;
};

export const AUTH_STORAGE_KEY = "chromedia.auth.session.v1";

export const DEMO_ACCOUNTS: Array<AuthSession & { password: string }> = [
  { role: "admin", email: "admin@chromedia.local", password: "password123", name: "Admin User" },
  { role: "client", email: "client@chromedia.local", password: "password123", name: "Client User" }
];

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.email || !parsed.role || !parsed.name) return null;
    return {
      email: parsed.email,
      role: parsed.role,
      name: parsed.name,
      candidateId: parsed.candidateId,
      sessionToken: typeof parsed.sessionToken === "string" ? parsed.sessionToken : undefined
    };
  } catch {
    return null;
  }
}

export function persistAuthSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function resolveDemoAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalizedEmail && account.password === password);
}

export async function apiLogin(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    return { success: false as const, message: payload?.message ?? "Invalid email or password." };
  }
  const payload = (await response.json()) as AuthSession;
  return { success: true as const, session: payload };
}

export async function apiGetSession(sessionToken: string) {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    headers: { "x-session-token": sessionToken }
  });
  if (!response.ok) return null;
  return (await response.json()) as AuthSession;
}

export async function apiLogout(sessionToken?: string) {
  if (!sessionToken) return;
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "x-session-token": sessionToken }
  }).catch(() => {
    // noop
  });
}
