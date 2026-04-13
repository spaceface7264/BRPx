import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type TenantConfig = {
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
};

const defaultConfig: TenantConfig = {
  businessName: "Checkout",
  logoUrl: "/logo.svg",
  primaryColor: "#111827",
  secondaryColor: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif"
};

type BrandingContextValue = {
  config: TenantConfig;
  isLoading: boolean;
  error: string | null;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function applyCssVariables(config: TenantConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--tenant-primary", config.primaryColor);
  root.style.setProperty("--tenant-secondary", config.secondaryColor);
  root.style.setProperty("--tenant-font", config.fontFamily);
  root.style.setProperty("--brand-primary", config.primaryColor);
  root.style.setProperty("--brand-secondary", config.secondaryColor);
  root.style.setProperty("--brand-font", config.fontFamily);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/tenant-config.json");
        if (!res.ok) {
          if (!cancelled) {
            applyCssVariables(defaultConfig);
            setError(null);
          }
          return;
        }
        const raw = (await res.json()) as Partial<TenantConfig>;
        const merged: TenantConfig = {
          businessName: typeof raw.businessName === "string" ? raw.businessName : defaultConfig.businessName,
          logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : defaultConfig.logoUrl,
          primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : defaultConfig.primaryColor,
          secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : defaultConfig.secondaryColor,
          fontFamily: typeof raw.fontFamily === "string" ? raw.fontFamily : defaultConfig.fontFamily
        };
        if (!cancelled) {
          setConfig(merged);
          applyCssVariables(merged);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          applyCssVariables(defaultConfig);
          setError("Could not load tenant config");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({ config, isLoading, error }),
    [config, isLoading, error]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return ctx;
}
