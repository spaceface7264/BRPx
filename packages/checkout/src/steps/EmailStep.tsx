import type { BrpProduct } from "../api/types.ts";
import { formatPriceIncVat } from "../api/brp.ts";

type EmailStepProps = {
  product: BrpProduct;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (email: string) => void;
  onBack: () => void;
  title: string;
  subtitle: string;
  backLabel: string;
  emailLabel: string;
  ctaLabel: string;
};

export function EmailStep({
  product,
  isSubmitting,
  error,
  onSubmit,
  onBack,
  title,
  subtitle,
  backLabel,
  emailLabel,
  ctaLabel
}: EmailStepProps) {
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
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {backLabel}
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
        <span className="font-medium text-slate-900">{product.name}</span>
        <span className="ml-2 text-slate-600">{formatPriceIncVat(product.priceincvat)}</span>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const email = String(fd.get("email") ?? "").trim();
          if (email) onSubmit(email);
        }}
      >
        <div>
          <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium text-slate-700">
            {emailLabel}
          </label>
          <input
            id="checkout-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 shadow-sm outline-none ring-[color:var(--brand-primary)] transition placeholder:text-slate-400 focus:border-transparent focus:ring-2 disabled:opacity-60"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white shadow-sm transition enabled:active:scale-[0.99] disabled:opacity-60"
          style={{ backgroundColor: "var(--brand-primary, #111827)" }}
        >
          {isSubmitting ? "..." : ctaLabel}
        </button>
      </form>
      <p className="text-xs text-slate-400">Try test@test.com for an existing person in the mock API.</p>
    </div>
  );
}
