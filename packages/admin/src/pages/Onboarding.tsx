import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@brp/ui";
import { api } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";
import type { BrandingDraft } from "../components/BrandingEditor.tsx";
import { BrandingEditor } from "../components/BrandingEditor.tsx";
import { BrpConnection } from "../components/BrpConnection.tsx";
import { DomainSetup } from "../components/DomainSetup.tsx";
import { TemplateSelector, type TemplateId } from "../components/TemplateSelector.tsx";
import { WizardProgress } from "../components/WizardProgress.tsx";
import { useTenant } from "../context/TenantContext.tsx";

function burstConfetti(el: HTMLElement | null): void {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const n = 48;
  for (let i = 0; i < n; i++) {
    const bit = document.createElement("span");
    bit.style.position = "fixed";
    bit.style.left = `${rect.left + rect.width / 2}px`;
    bit.style.top = `${rect.top + rect.height / 2}px`;
    bit.style.width = "8px";
    bit.style.height = "8px";
    bit.style.borderRadius = "2px";
    bit.style.backgroundColor = `hsl(${Math.random() * 360},80%,55%)`;
    bit.style.pointerEvents = "none";
    bit.style.zIndex = "9999";
    bit.style.transition = "transform 1.1s ease-out, opacity 1.1s ease-out";
    document.body.appendChild(bit);
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 160;
    requestAnimationFrame(() => {
      bit.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) rotate(${Math.random() * 360}deg)`;
      bit.style.opacity = "0";
    });
    window.setTimeout(() => bit.remove(), 1200);
  }
}

const labels = ["Tilslut BRP", "Skabelon", "Branding", "Go live"];

export function Onboarding() {
  const navigate = useNavigate();
  const { tenant, refresh, updateLocal } = useTenant();
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<TemplateId>("minimal");
  const [brandingDraft, setBrandingDraft] = useState<BrandingDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrateEl, setCelebrateEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tenant && tenant.onboardingStep >= 5) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (tenant && tenant.onboardingStep >= 1 && tenant.onboardingStep <= 4) {
      setStep(tenant.onboardingStep);
      setTemplate((tenant.template as TemplateId) || "minimal");
    }
  }, [tenant, navigate]);

  const bumpStep = useCallback(
    async (next: number): Promise<void> => {
      if (!tenant) return;
      const res = await api<{ tenant: Tenant }>("/admin/tenant", {
        method: "PUT",
        body: JSON.stringify({ onboardingStep: next })
      });
      updateLocal(res.tenant);
      await refresh();
      setStep(next);
    },
    [tenant, updateLocal, refresh]
  );

  const nextFromBrp = async (): Promise<void> => {
    if (!tenant?.brpConnected) return;
    setBusy(true);
    try {
      await bumpStep(2);
    } finally {
      setBusy(false);
    }
  };

  const nextFromTemplate = async (): Promise<void> => {
    setBusy(true);
    try {
      await api<{ tenant: Tenant }>("/admin/tenant/branding", {
        method: "PUT",
        body: JSON.stringify({ template })
      });
      await bumpStep(3);
    } finally {
      setBusy(false);
    }
  };

  const nextFromBranding = async (): Promise<void> => {
    const d = brandingDraft;
    if (!d) return;
    setBusy(true);
    try {
      await api<{ tenant: Tenant }>("/admin/tenant/branding", {
        method: "PUT",
        body: JSON.stringify({
          businessName: d.businessName,
          logoUrl: d.logoUrl,
          primaryColor: d.primaryColor,
          secondaryColor: d.secondaryColor,
          font: d.font,
          template: d.template
        })
      });
      await bumpStep(4);
    } finally {
      setBusy(false);
    }
  };

  const publish = async (): Promise<void> => {
    setBusy(true);
    try {
      await api<{ tenant: Tenant }>("/admin/tenant", {
        method: "PUT",
        body: JSON.stringify({ onboardingStep: 5 })
      });
      const pub = await api<{ tenant: Tenant }>("/admin/tenant/publish", { method: "POST" });
      updateLocal(pub.tenant);
      burstConfetti(celebrateEl);
      await refresh();
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    } finally {
      setBusy(false);
    }
  };

  if (!tenant) {
    return <div className="p-8 text-center text-slate-500">Indlæser…</div>;
  }

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <WizardProgress current={step} labels={labels} />
        <div
          key={step}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300"
        >
          {step === 1 ? (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-slate-900">Tilslut BRP</h1>
              <p className="text-sm text-slate-600">Angiv din BRP API-adresse og nøgle. Brug mock i udvikling: http://127.0.0.1:8787/mock/brp</p>
              <BrpConnection tenant={tenant} mode="onboarding" />
              <div className="flex justify-between pt-4">
                <span />
                <Button type="button" disabled={!tenant.brpConnected || busy} onClick={() => void nextFromBrp()}>
                  Næste
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-slate-900">Vælg skabelon</h1>
              <p className="text-sm text-slate-600">Du kan skifte senere i overblikket.</p>
              <TemplateSelector value={template} onChange={setTemplate} />
              <div className="flex justify-between pt-4">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void bumpStep(1)}>
                  Tilbage
                </Button>
                <Button type="button" disabled={busy} onClick={() => void nextFromTemplate()}>
                  Næste
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-slate-900">Branding</h1>
              <p className="text-sm text-slate-600">Tilpas udtrykket og se forhåndsvisning til højre.</p>
              <BrandingEditor tenant={tenant} mode="onboarding" onDraftChange={setBrandingDraft} />
              <div className="flex justify-between pt-4">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void bumpStep(2)}>
                  Tilbage
                </Button>
                <Button type="button" disabled={busy || !brandingDraft} onClick={() => void nextFromBranding()}>
                  Næste
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-slate-900">Publicer</h1>
              <p className="text-sm text-slate-600">Gennemse og gå live. Du kan altid tage butikken offline igen.</p>
              <ul className="list-inside list-disc text-sm text-slate-700">
                <li>BRP: {tenant.brpConnected ? "Tilsluttet" : "Mangler"}</li>
                <li>Skabelon: {tenant.template}</li>
                <li>Butiksnavn: {tenant.businessName ?? "—"}</li>
              </ul>
              <DomainSetup tenant={tenant} mode="onboarding" />
              <div ref={setCelebrateEl} className="flex flex-wrap justify-between gap-2 pt-4">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void bumpStep(3)}>
                  Tilbage
                </Button>
                <Button type="button" disabled={busy} onClick={() => void publish()}>
                  {busy ? "Publicerer…" : "Publicer din butik"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
