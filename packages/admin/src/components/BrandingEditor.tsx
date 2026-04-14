import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Input } from "@brp/ui";
import { api } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";
import { useTenant } from "../context/TenantContext.tsx";
import { useToast } from "../context/ToastContext.tsx";
import { type TemplateId, TemplateSelector } from "./TemplateSelector.tsx";

const checkoutOrigin = import.meta.env.VITE_CHECKOUT_URL ?? "http://localhost:5173";

const presets = ["#4F46E5", "#0EA5E9", "#10B981", "#F97316", "#DC2626", "#111827", "#7C3AED", "#E11D48"];

export type BrandingDraft = {
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  template: string;
};

type BrandingUpdateMessage = {
  type: "branding-update";
  payload: {
    primaryColor?: string;
    secondaryColor?: string;
    font?: string;
    logoUrl?: string;
    businessName?: string;
    template?: string;
  };
};

function postToPreview(win: Window | null, payload: BrandingUpdateMessage["payload"]): void {
  if (!win) return;
  const msg: BrandingUpdateMessage = { type: "branding-update", payload };
  win.postMessage(msg, new URL(checkoutOrigin).origin);
}

type BrandingEditorProps = {
  tenant: Tenant;
  mode?: "onboarding" | "dashboard";
  onDraftChange?: (d: BrandingDraft) => void;
};

export function BrandingEditor({ tenant, mode = "dashboard", onDraftChange }: BrandingEditorProps) {
  const { refresh, updateLocal } = useTenant();
  const { push } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [draft, setDraft] = useState<BrandingDraft>({
    businessName: tenant.businessName ?? "",
    logoUrl: tenant.logoUrl ?? "",
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    font: tenant.font,
    template: tenant.template
  });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      businessName: tenant.businessName ?? "",
      logoUrl: tenant.logoUrl ?? "",
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      font: tenant.font,
      template: tenant.template
    });
  }, [tenant]);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const pushDraft = useCallback(
    (next: BrandingDraft) => {
      setDraft(next);
      onDraftChange?.(next);
    },
    [onDraftChange]
  );

  useEffect(() => {
    const win = iframeRef.current?.contentWindow ?? null;
    postToPreview(win, {
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      font: draft.font,
      logoUrl: draft.logoUrl,
      businessName: draft.businessName,
      template: draft.template
    });
  }, [draft]);

  const onIframeLoad = (): void => {
    const win = iframeRef.current?.contentWindow ?? null;
    postToPreview(win, {
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      font: draft.font,
      logoUrl: draft.logoUrl,
      businessName: draft.businessName,
      template: draft.template
    });
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/branding", {
        method: "PUT",
        body: JSON.stringify({
          businessName: draft.businessName,
          logoUrl: draft.logoUrl,
          primaryColor: draft.primaryColor,
          secondaryColor: draft.secondaryColor,
          font: draft.font,
          template: draft.template
        })
      });
      updateLocal(res.tenant);
      await refresh();
      push("Branding gemt", "success");
    } catch {
      push("Kunne ikke gemme branding", "error");
    } finally {
      setSaving(false);
    }
  };

  const token = tenant.previewToken ?? "";
  const isDev = import.meta.env.DEV;
  const iframeSrc = isDev
    ? "http://localhost:5173?preview=true"
    : token.length > 0
      ? `${checkoutOrigin}/?preview=true&token=${encodeURIComponent(token)}`
      : `${checkoutOrigin}/?preview=true`;

  const inner = (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Input label="Virksomhedsnavn" value={draft.businessName} onChange={(e) => pushDraft({ ...draft, businessName: e.target.value })} />
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Logo (URL eller base64 data-URL)</span>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"
            value={draft.logoUrl}
            onChange={(e) => pushDraft({ ...draft, logoUrl: e.target.value })}
            placeholder="https://… eller data:image/png;base64,…"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">Primær farve</span>
            <div className="flex flex-wrap gap-2">
              <input
                type="color"
                value={draft.primaryColor}
                onChange={(e) => pushDraft({ ...draft, primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
              />
              <input
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 font-mono text-xs"
                value={draft.primaryColor}
                onChange={(e) => pushDraft({ ...draft, primaryColor: e.target.value })}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {presets.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  className="h-6 w-6 rounded-full border border-slate-200"
                  style={{ backgroundColor: c }}
                  onClick={() => pushDraft({ ...draft, primaryColor: c })}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-600">Sekundær farve</span>
            <div className="flex flex-wrap gap-2">
              <input
                type="color"
                value={draft.secondaryColor}
                onChange={(e) => pushDraft({ ...draft, secondaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
              />
              <input
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 font-mono text-xs"
                value={draft.secondaryColor}
                onChange={(e) => pushDraft({ ...draft, secondaryColor: e.target.value })}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {presets.map((c) => (
                <button
                  key={`s-${c}`}
                  type="button"
                  aria-label={c}
                  className="h-6 w-6 rounded-full border border-slate-200"
                  style={{ backgroundColor: c }}
                  onClick={() => pushDraft({ ...draft, secondaryColor: c })}
                />
              ))}
            </div>
          </div>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-slate-700">Skrifttype</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={draft.font}
            onChange={(e) => pushDraft({ ...draft, font: e.target.value })}
          >
            <option value="system">System</option>
            <option value="inter">Inter</option>
            <option value="dm-sans">DM Sans</option>
            <option value="space-grotesk">Space Grotesk</option>
          </select>
        </label>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Skabelon</p>
          <TemplateSelector
            value={draft.template}
            onChange={(id: TemplateId) => pushDraft({ ...draft, template: id })}
          />
        </div>
        {mode === "dashboard" ? (
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Gemmer…" : "Gem"}
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={device === "desktop" ? "primary" : "secondary"} className="text-xs" onClick={() => setDevice("desktop")}>
            Desktop
          </Button>
          <Button type="button" variant={device === "mobile" ? "primary" : "secondary"} className="text-xs" onClick={() => setDevice("mobile")}>
            Mobil
          </Button>
        </div>
        <div
          className={`mx-auto overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-3 transition-all ${
            device === "mobile" ? "max-w-[360px]" : "max-w-full"
          }`}
        >
          <iframe
            ref={iframeRef}
            title="Forhåndsvisning checkout"
            src={iframeSrc}
            onLoad={onIframeLoad}
            className="h-[520px] w-full rounded-lg bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        {!token ? (
          <p className="text-xs text-amber-700">Mangler preview-token. Genindlæs siden efter login.</p>
        ) : null}
      </div>
    </div>
  );

  if (mode === "onboarding") {
    return <div className="max-w-6xl">{inner}</div>;
  }

  return (
    <Card title="Branding" description="Logo, farver og forhåndsvisning">
      {inner}
    </Card>
  );
}
