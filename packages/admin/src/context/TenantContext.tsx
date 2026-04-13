import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { api } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";
import { useAuth } from "./AuthContext.tsx";

type TenantContextValue = {
  tenant: Tenant | null;
  refresh: () => Promise<void>;
  updateLocal: (t: Tenant) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { token, tenant, setTenant } = useAuth();

  const refresh = useCallback(async () => {
    if (!token) return;
    const res = await api<{ tenant: Tenant }>("/admin/tenant");
    setTenant(res.tenant);
  }, [token, setTenant]);

  const updateLocal = useCallback(
    (t: Tenant) => {
      setTenant(t);
    },
    [setTenant]
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      refresh,
      updateLocal
    }),
    [tenant, refresh, updateLocal]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant requires TenantProvider");
  return ctx;
}
