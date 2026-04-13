import { useEffect, useState } from "react";
import { Button } from "@brp/ui";
import { api } from "../api/client.ts";
import type { Tenant } from "../api/types.ts";

type Status = {
  isLive: boolean;
  brpConnected: boolean;
  brpLastSync: string | null;
  sslStatus: string;
};

const checkoutBase = import.meta.env.VITE_CHECKOUT_URL ?? "http://127.0.0.1:5173";

export function StatusBar({ tenant }: { tenant: Tenant }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const s = await api<Status>("/admin/tenant/status");
        if (!c) setStatus(s);
      } catch {
        if (!c) setStatus(null);
      }
    })();
    return () => {
      c = true;
    };
  }, [tenant.brpLastSync, tenant.isLive]);

  const live = status?.isLive ?? tenant.isLive;
  const syncLabel = status?.brpLastSync ?? tenant.brpLastSync;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-400"}`} aria-hidden />
          <span className="font-medium text-slate-800">{live ? "Live" : "Kladde"}</span>
        </div>
        {syncLabel ? (
          <p className="text-xs text-slate-500">
            Seneste BRP-sync: {new Date(syncLabel).toLocaleString("da-DK")}
          </p>
        ) : (
          <p className="text-xs text-slate-500">Ingen BRP-sync endnu</p>
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="text-sm"
        onClick={() => window.open(checkoutBase, "_blank", "noopener,noreferrer")}
      >
        Se butik
      </Button>
    </div>
  );
}
