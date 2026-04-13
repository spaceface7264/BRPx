import { useState } from "react";
import { Button, Card, Input } from "@brp/ui";
import { api, ApiError } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";
import { useTenant } from "../context/TenantContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

type DomainSetupProps = {
  tenant: Tenant;
  mode?: "onboarding" | "dashboard";
};

export function DomainSetup({ tenant, mode = "dashboard" }: DomainSetupProps) {
  const { refresh, updateLocal } = useTenant();
  const { push } = useToast();
  const [domain, setDomain] = useState(tenant.customDomain ?? "");
  const [busy, setBusy] = useState(false);

  const cnameTarget = `${tenant.platformSubdomain ?? "dit-butik"}.brpfront.dk`;

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/domain", {
        method: "PUT",
        body: JSON.stringify({ customDomain: domain })
      });
      updateLocal(res.tenant);
      await refresh();
      push("Domæne gemt", "success");
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Kunne ikke gemme domæne", "error");
    } finally {
      setBusy(false);
    }
  };

  const checkDns = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await api<{ verified: boolean; cnameTarget: string; tenant: Tenant }>("/admin/tenant/domain/check", {
        method: "POST"
      });
      updateLocal(res.tenant);
      push(res.verified ? "DNS ser OK ud (demo)" : "DNS ikke bekræftet endnu", res.verified ? "success" : "info");
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Tjek fejlede", "error");
    } finally {
      setBusy(false);
    }
  };

  const inner = (
    <div className="space-y-4 text-sm text-slate-700">
      <p>
        Platform-underdomæne:{" "}
        <span className="font-mono text-slate-900">
          {tenant.platformSubdomain ?? "…"}.brpfront.dk
        </span>
      </p>
      <Input label="Tilpasset domæne" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="butik.ditdomæne.dk" />
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium text-slate-800">CNAME</p>
        <p className="mt-1">
          Peger dit domæne mod <span className="font-mono">{cnameTarget}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void save()}>
          Gem
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void checkDns()}>
          Tjek DNS
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        SSL: {tenant.customDomain ? (tenant.domainVerified ? "Klar (demo)" : "Afventer") : "Ikke sat"}
      </p>
    </div>
  );

  if (mode === "onboarding") {
    return <div className="max-w-xl">{inner}</div>;
  }

  return (
    <Card title="Domæne" description="Underdomæne og CNAME">
      {inner}
    </Card>
  );
}
