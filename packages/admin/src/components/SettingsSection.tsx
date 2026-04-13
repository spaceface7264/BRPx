import { useState } from "react";
import { Button, Card, Input } from "@brp/ui";
import { api, ApiError } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useTenant } from "../context/TenantContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

export function SettingsSection({ tenant }: { tenant: Tenant }) {
  const { logout } = useAuth();
  const { refresh, updateLocal } = useTenant();
  const { push } = useToast();
  const [termsUrl, setTermsUrl] = useState(tenant.termsUrl ?? "");
  const [privacyUrl, setPrivacyUrl] = useState(tenant.privacyUrl ?? "");
  const [ga, setGa] = useState(tenant.gaMeasurementId ?? "");
  const [redirect, setRedirect] = useState(tenant.postPurchaseRedirectUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [delPwd, setDelPwd] = useState("");

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant", {
        method: "PUT",
        body: JSON.stringify({
          termsUrl,
          privacyUrl,
          gaMeasurementId: ga,
          postPurchaseRedirectUrl: redirect
        })
      });
      updateLocal(res.tenant);
      await refresh();
      push("Indstillinger gemt", "success");
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Kunne ikke gemme", "error");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/unpublish", { method: "POST" });
      updateLocal(res.tenant);
      push("Butik taget offline", "success");
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Fejl", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!delPwd) {
      push("Angiv adgangskode for at slette", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/admin/tenant/account", { method: "DELETE", body: JSON.stringify({ password: delPwd }) });
      push("Konto slettet", "success");
      logout();
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Sletning fejlede", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Indstillinger" description="Links, sporings-ID og risikozone">
      <div className="space-y-4">
        <Input label="Vilkår (URL)" value={termsUrl} onChange={(e) => setTermsUrl(e.target.value)} />
        <Input label="Privatliv (URL)" value={privacyUrl} onChange={(e) => setPrivacyUrl(e.target.value)} />
        <Input label="Google Analytics measurement ID" value={ga} onChange={(e) => setGa(e.target.value)} />
        <Input
          label="Omdirigering efter køb"
          value={redirect}
          onChange={(e) => setRedirect(e.target.value)}
          placeholder="https://…"
        />
        <Button type="button" disabled={busy} onClick={() => void save()}>
          Gem
        </Button>

        <div className="mt-8 border-t border-red-100 pt-6">
          <h3 className="text-sm font-semibold text-red-800">Risikozone</h3>
          <p className="mt-1 text-xs text-slate-600">Handlinger her påvirker din live-butik eller konto.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void unpublish()}>
              Tag butik offline
            </Button>
          </div>
          <div className="mt-6 space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-3">
            <p className="text-sm font-medium text-red-900">Slet konto</p>
            <Input
              label="Bekræft med adgangskode"
              type="password"
              value={delPwd}
              onChange={(e) => setDelPwd(e.target.value)}
            />
            <Button type="button" variant="danger" disabled={busy} onClick={() => void deleteAccount()}>
              Slet
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
