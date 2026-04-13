import { useEffect, useState } from "react";
import { Button, Card } from "@brp/ui";
import { api } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";
import { BrandingEditor } from "../components/BrandingEditor.tsx";
import { BrpConnection } from "../components/BrpConnection.tsx";
import { DomainSetup } from "../components/DomainSetup.tsx";
import { ProductConfigurator } from "../components/ProductConfigurator.tsx";
import { SettingsSection } from "../components/SettingsSection.tsx";
import { StatusBar } from "../components/StatusBar.tsx";
import { type TemplateId, TemplateSelector } from "../components/TemplateSelector.tsx";
import { useTenant } from "../context/TenantContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

export function Dashboard() {
  const { tenant, refresh, updateLocal } = useTenant();
  const { push } = useToast();
  const [tpl, setTpl] = useState<TemplateId>("minimal");
  const [savingTpl, setSavingTpl] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setTpl((tenant.template as TemplateId) || "minimal");
  }, [tenant]);

  if (!tenant) {
    return <div className="p-8 text-center text-slate-500">Indlæser…</div>;
  }

  const saveTemplate = async (): Promise<void> => {
    setSavingTpl(true);
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/branding", {
        method: "PUT",
        body: JSON.stringify({ template: tpl })
      });
      updateLocal(res.tenant);
      await refresh();
      push("Skabelon gemt", "success");
    } catch {
      push("Kunne ikke gemme skabelon", "error");
    } finally {
      setSavingTpl(false);
    }
  };

  const publish = async (): Promise<void> => {
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/publish", { method: "POST" });
      updateLocal(res.tenant);
      push("Butik er live", "success");
    } catch {
      push("Publicering fejlede", "error");
    }
  };

  return (
    <>
      <StatusBar tenant={tenant} />
      <main className="space-y-6 p-6">
        <div className="flex flex-wrap gap-2">
          {!tenant.isLive ? (
            <Button type="button" onClick={() => void publish()}>
              Publicer
            </Button>
          ) : (
            <span className="text-sm text-emerald-700">Butikken er publiceret</span>
          )}
        </div>

        <BrpConnection tenant={tenant} />

        <BrandingEditor tenant={tenant} />

        <Card
          title="Skabelon"
          description="Udseende for checkout"
          actions={
            <Button type="button" className="text-xs" disabled={savingTpl} onClick={() => void saveTemplate()}>
              Gem
            </Button>
          }
        >
          <TemplateSelector value={tpl} onChange={setTpl} />
        </Card>

        <ProductConfigurator tenant={tenant} />

        <DomainSetup tenant={tenant} />

        <SettingsSection tenant={tenant} />
      </main>
    </>
  );
}
