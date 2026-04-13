import { useState } from "react";
import { Button, Card, Input } from "@brp/ui";
import { api, ApiError } from "../api/client.ts";
import type { BrpBusinessUnit, Tenant } from "../api/types.ts";
import { useTenant } from "../context/TenantContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

type BrpConnectionProps = {
  tenant: Tenant;
  mode?: "onboarding" | "dashboard";
};

export function BrpConnection({ tenant, mode = "dashboard" }: BrpConnectionProps) {
  const { refresh, updateLocal } = useTenant();
  const { push } = useToast();
  const [url, setUrl] = useState(tenant.brpApiUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<BrpBusinessUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const test = async (): Promise<void> => {
    setTesting(true);
    setError(null);
    setUnits(null);
    try {
      const res = await api<{ ok: boolean; businessUnits?: BrpBusinessUnit[]; error?: string }>(
        "/admin/tenant/brp/test",
        {
          method: "POST",
          body: JSON.stringify({
            brpApiUrl: url,
            brpApiKey: apiKey || undefined
          })
        }
      );
      if (res.ok && res.businessUnits) {
        setUnits(res.businessUnits);
        push("Forbindelsen virker", "success");
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Test mislykkedes";
      setError(msg);
    } finally {
      setTesting(false);
    }
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string | undefined> = { brpApiUrl: url };
      if (apiKey.length > 0) body.brpApiKey = apiKey;
      const res = await api<{ tenant: Tenant }>("/admin/tenant/brp", {
        method: "PUT",
        body: JSON.stringify(body)
      });
      updateLocal(res.tenant);
      await refresh();
      push("BRP gemt", "success");
      setOpen(false);
      setApiKey("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Kunne ikke gemme";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const sync = async (): Promise<void> => {
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/sync", { method: "POST" });
      updateLocal(res.tenant);
      push("Produkter synkroniseret", "success");
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Sync fejlede", "error");
    }
  };

  const body = (
    <div className="space-y-4">
      <Input label="BRP API URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/brp" />
      <Input
        label="API-nøgle"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        hint={tenant.brpApiKeySet ? "Tom = behold nuværende nøgle" : "Påkrævet ved første tilslutning"}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {units && units.length > 0 ? (
        <p className="text-sm text-emerald-800">
          Fandt {units.length} steder: {units.map((u) => u.name).join(", ")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={testing} onClick={() => void test()}>
          {testing ? "Tester…" : "Test forbindelse"}
        </Button>
        <Button type="button" disabled={saving || !url} onClick={() => void save()}>
          {saving ? "Gemmer…" : "Gem"}
        </Button>
      </div>
    </div>
  );

  if (mode === "onboarding") {
    return <div className="max-w-xl">{body}</div>;
  }

  return (
    <>
      <Card
        title="BRP-forbindelse"
        description="API-adgang til produkter og steder"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="text-xs" onClick={() => void sync()}>
              Synkroniser produkter
            </Button>
            <Button type="button" variant="secondary" className="text-xs" onClick={() => setOpen(true)}>
              Rediger
            </Button>
          </div>
        }
      >
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium text-slate-900">
              {tenant.brpConnected ? (
                <span className="text-emerald-700">Tilsluttet</span>
              ) : (
                <span className="text-amber-700">Ikke tilsluttet</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">API URL</dt>
            <dd className="max-w-[60%] truncate text-right font-mono text-xs text-slate-800">
              {tenant.brpApiUrl ?? "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Rediger BRP</h3>
            <p className="mt-1 text-sm text-slate-500">Opdater URL og nøgle. Test før du gemmer.</p>
            <div className="mt-4">{body}</div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Annuller
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
