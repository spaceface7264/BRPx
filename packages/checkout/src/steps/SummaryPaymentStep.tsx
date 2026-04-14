import { useState } from "react";
import {
  addOrderItem,
  createOrder,
  createPaymentLink,
  formatPriceIncVat
} from "../api/brp.ts";
import type { BrpBusinessUnit, BrpPersonVerifyResponse, BrpProduct } from "../api/types.ts";
import { useBranding } from "../context/BrandingContext.tsx";

type SummaryPaymentStepProps = {
  businessUnit: BrpBusinessUnit;
  product: BrpProduct;
  email: string;
  verify: BrpPersonVerifyResponse;
  onBack: () => void;
  title: string;
  subtitle: string;
  backLabel: string;
  payLabel: string;
  locationLabel: string;
  productLabel: string;
  emailLabel: string;
  totalLabel: string;
};

export function SummaryPaymentStep({
  businessUnit,
  product,
  email,
  verify,
  onBack,
  title,
  subtitle,
  backLabel,
  payLabel,
  locationLabel,
  productLabel,
  emailLabel,
  totalLabel
}: SummaryPaymentStepProps) {
  const { isPreviewMode } = useBranding();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (): Promise<void> => {
    if (isPreviewMode) return;
    setError(null);
    setIsPaying(true);
    try {
      const order = await createOrder(businessUnit.id);
      await addOrderItem(order.id, product.id, 1);
      const payment = await createPaymentLink(order.id, email);
      window.location.assign(payment.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not start");
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={isPaying}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {backLabel}
        </button>
      </div>

      <div
        className="space-y-3 rounded-xl border border-slate-200 bg-[var(--checkout-surface,#fff)] p-4 shadow-sm"
        role="region"
        aria-label="Order details"
      >
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-slate-500">{locationLabel}</span>
          <span className="text-right font-medium text-slate-900">{businessUnit.name}</span>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-slate-500">{productLabel}</span>
          <span className="text-right font-medium text-slate-900">{product.name}</span>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-slate-500">{emailLabel}</span>
          <span className="break-all text-right font-medium text-slate-900">{email}</span>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="flex justify-between gap-4 text-base">
          <span className="font-medium text-slate-900">{totalLabel}</span>
          <span className="font-semibold text-slate-900">{formatPriceIncVat(product.priceincvat)}</span>
        </div>
      </div>

      <div
        className={`rounded-xl border px-3 py-2 text-sm ${
          verify.found
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-slate-200 bg-slate-50 text-slate-700"
        }`}
        role="status"
      >
        {verify.found && verify.person ? (
          <>
            Welcome back, {verify.person.firstname} {verify.person.lastname}.
          </>
        ) : (
          <>We will set up a new profile for this email after payment.</>
        )}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void pay()}
        disabled={isPaying || isPreviewMode}
        className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:opacity-60"
        style={{ backgroundColor: "var(--brand-primary, #111827)" }}
      >
        {isPreviewMode ? "Forhåndsvisning" : isPaying ? "Redirecting…" : payLabel}
      </button>
      <p className="text-center text-xs text-slate-400">
        {isPreviewMode ? "Betaling er slået fra i forhåndsvisning." : "You will leave this site to complete payment."}
      </p>
    </div>
  );
}
