import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppRole } from "./permissions";
import { apiGetSession, apiLogin, apiLogout, AuthSession, getStoredAuthSession, persistAuthSession } from "./session";

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  isAuthenticated: boolean;
  role: AppRole | null;
  login: (email: string, password: string) => Promise<{ success: true } | { success: false; message: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const resolved = await apiGetSession();
      if (!resolved) {
        setSession(null);
        persistAuthSession(null);
        setIsReady(true);
        return;
      }
      setSession(resolved);
      persistAuthSession(resolved);
      setIsReady(true);
    };
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const result = await apiLogin(email, password);
    if (!result.success) {
      return { success: false, message: result.message };
    }
    const nextSession = result.session;
    setSession(nextSession);
    persistAuthSession(nextSession);
    setIsReady(true);
    return { success: true };
  };

  const logout = async () => {
    await apiLogout();
    setSession(null);
    persistAuthSession(null);
    setIsReady(true);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isReady,
      isAuthenticated: Boolean(session),
      role: session?.role ?? null,
      login,
      logout
    }),
    [isReady, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
