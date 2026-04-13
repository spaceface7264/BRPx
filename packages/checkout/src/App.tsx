import { useCallback, useEffect, useState } from "react";
import {
  fetchBusinessUnits,
  fetchProducts,
  fetchWebCategories,
  verifyPerson
} from "./api/brp.ts";
import type {
  BrpBusinessUnit,
  BrpPersonVerifyResponse,
  BrpProduct,
  BrpWebCategory
} from "./api/types.ts";
import { StepProgress } from "./components/StepProgress.tsx";
import { useBranding } from "./context/BrandingContext.tsx";
import { BusinessUnitStep } from "./steps/BusinessUnitStep.tsx";
import { EmailStep } from "./steps/EmailStep.tsx";
import { ProductsStep } from "./steps/ProductsStep.tsx";
import { SummaryPaymentStep } from "./steps/SummaryPaymentStep.tsx";

function headerSurfaceClass(template: string): string {
  if (template === "bold") return "bg-slate-900 text-white border-slate-800";
  if (template === "branded")
    return "border-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white";
  return "bg-[var(--checkout-surface,#fff)] text-slate-900 border-[var(--checkout-border,#e2e8f0)]";
}

export function App() {
  const { config, isLoading: brandingLoading, error: brandingConfigError, isPreviewMode } = useBranding();

  const [step, setStep] = useState(1);
  const [businessUnits, setBusinessUnits] = useState<BrpBusinessUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<BrpBusinessUnit | null>(null);
  const [webCategories, setWebCategories] = useState<BrpWebCategory[]>([]);
  const [products, setProducts] = useState<BrpProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<BrpProduct | null>(null);
  const [email, setEmail] = useState("");
  const [verifyResult, setVerifyResult] = useState<BrpPersonVerifyResponse | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUnitsLoading(true);
      setUnitsError(null);
      try {
        const units = await fetchBusinessUnits();
        if (!cancelled) setBusinessUnits(units);
      } catch (e) {
        if (!cancelled) {
          setUnitsError(e instanceof Error ? e.message : "Could not load locations");
        }
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectUnit = useCallback(async (unit: BrpBusinessUnit) => {
    setSelectedUnit(unit);
    setCatalogLoading(true);
    setCatalogError(null);
    setWebCategories([]);
    setProducts([]);
    setStep(2);
    try {
      const [cats, prods] = await Promise.all([fetchWebCategories(unit.id), fetchProducts(unit.id)]);
      setWebCategories(cats);
      setProducts(prods);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "Could not load products");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const handleSelectProduct = useCallback((product: BrpProduct) => {
    setSelectedProduct(product);
    setEmailError(null);
    setVerifyResult(null);
    setStep(3);
  }, []);

  const handleEmailSubmit = useCallback(async (value: string) => {
    setEmailSubmitting(true);
    setEmailError(null);
    try {
      const result = await verifyPerson(value);
      setEmail(value);
      setVerifyResult(result);
      setStep(4);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setEmailSubmitting(false);
    }
  }, []);

  const goBackFromProducts = useCallback(() => {
    setStep(1);
    setSelectedUnit(null);
    setWebCategories([]);
    setProducts([]);
    setCatalogError(null);
  }, []);

  const goBackFromEmail = useCallback(() => {
    setStep(2);
    setSelectedProduct(null);
    setEmailError(null);
  }, []);

  const goBackFromSummary = useCallback(() => {
    setStep(3);
    setVerifyResult(null);
    setEmail("");
  }, []);

  const tpl = config.template;
  const headerMuted = tpl === "minimal" ? "text-slate-500" : "text-white/70";

  return (
    <div
      className="min-h-dvh bg-[var(--brand-secondary,#f8fafc)] text-slate-900"
      data-template={tpl}
    >
      {isPreviewMode ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950"
          role="status"
        >
          Forhåndsvisning: betaling er deaktiveret
        </div>
      ) : null}
      <header className={`border-b ${headerSurfaceClass(tpl)}`}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {brandingLoading ? (
              <div
                className={`h-9 w-24 animate-pulse rounded-lg ${tpl === "minimal" ? "bg-slate-100" : "bg-white/10"}`}
                aria-hidden
              />
            ) : (
              <img
                src={config.logoUrl}
                alt={`${config.businessName} logo`}
                className="h-9 w-auto max-w-[120px] object-contain text-[color:var(--brand-primary)]"
                width={120}
                height={36}
              />
            )}
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${tpl === "minimal" ? "text-slate-900" : "text-white"}`}>
                {brandingLoading ? "…" : config.businessName}
              </p>
              <p className={`truncate text-xs ${headerMuted}`}>Secure checkout</p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 pb-4 sm:px-5">
          <StepProgress currentStep={step} />
        </div>
      </header>

      {brandingConfigError ? (
        <p className="mx-auto max-w-lg px-4 pt-2 text-center text-xs text-amber-700 sm:px-5" role="status">
          {brandingConfigError}
        </p>
      ) : null}

      <main className="mx-auto max-w-lg px-4 py-6 sm:px-5 sm:py-8">
        {step === 1 ? (
          <BusinessUnitStep
            units={businessUnits}
            isLoading={unitsLoading}
            error={unitsError}
            onSelect={handleSelectUnit}
          />
        ) : null}

        {step === 2 && selectedUnit ? (
          <ProductsStep
            businessUnit={selectedUnit}
            categories={webCategories}
            products={products}
            isLoading={catalogLoading}
            error={catalogError}
            onSelect={handleSelectProduct}
            onBack={goBackFromProducts}
          />
        ) : null}

        {step === 3 && selectedProduct ? (
          <EmailStep
            product={selectedProduct}
            isSubmitting={emailSubmitting}
            error={emailError}
            onSubmit={handleEmailSubmit}
            onBack={goBackFromEmail}
          />
        ) : null}

        {step === 4 && selectedUnit && selectedProduct && verifyResult ? (
          <SummaryPaymentStep
            businessUnit={selectedUnit}
            product={selectedProduct}
            email={email}
            verify={verifyResult}
            onBack={goBackFromSummary}
          />
        ) : null}
      </main>
    </div>
  );
}
