import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";

type AuthState = {
  token: string | null;
  tenant: Tenant | null;
  isReady: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<Tenant>;
  register: (email: string, password: string, businessName: string) => Promise<Tenant>;
  logout: () => void;
  setTenant: (t: Tenant | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setTok] = useState<string | null>(() => getToken());
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isReady] = useState(true);

  useEffect(() => {
    if (!isReady || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ tenant: Tenant }>("/admin/tenant");
        if (!cancelled) setTenant(res.tenant);
      } catch {
        if (!cancelled) {
          setToken(null);
          setTok(null);
          setTenant(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, token]);

  useEffect(() => {
    const onUnauth = (): void => {
      setTok(null);
      setTenant(null);
      navigate("/login", { replace: true });
    };
    window.addEventListener("brp:unauthorized", onUnauth);
    return () => window.removeEventListener("brp:unauthorized", onUnauth);
  }, [navigate]);

  const login = useCallback(async (email: string, password: string): Promise<Tenant> => {
    const res = await api<{ token: string; tenant: Tenant }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setToken(res.token);
    setTok(res.token);
    setTenant(res.tenant);
    return res.tenant;
  }, []);

  const register = useCallback(async (email: string, password: string, businessName: string): Promise<Tenant> => {
    const res = await api<{ token: string; tenant: Tenant }>("/admin/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, businessName })
    });
    setToken(res.token);
    setTok(res.token);
    setTenant(res.tenant);
    return res.tenant;
  }, []);

  const logout = useCallback(() => {
    void api("/admin/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    setTok(null);
    setTenant(null);
    navigate("/login");
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      tenant,
      isReady,
      login,
      register,
      logout,
      setTenant
    }),
    [token, tenant, isReady, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
