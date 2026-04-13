import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type TenantTemplate = "minimal" | "bold" | "branded";

export type TenantConfig = {
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  template: TenantTemplate;
};

const defaultConfig: TenantConfig = {
  businessName: "Checkout",
  logoUrl: "/logo.svg",
  primaryColor: "#111827",
  secondaryColor: "#f8fafc",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  template: "minimal"
};

function fontIdToStack(font: string): string {
  switch (font) {
    case "inter":
      return "'Inter', ui-sans-serif, system-ui, sans-serif";
    case "dm-sans":
      return "'DM Sans', ui-sans-serif, system-ui, sans-serif";
    case "space-grotesk":
      return "'Space Grotesk', ui-sans-serif, system-ui, sans-serif";
    case "system":
    default:
      return "ui-sans-serif, system-ui, sans-serif";
  }
}

function normalizeTemplate(value: string | undefined): TenantTemplate {
  if (value === "bold" || value === "branded") return value;
  return "minimal";
}

function applyCssVariables(config: TenantConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--tenant-primary", config.primaryColor);
  root.style.setProperty("--tenant-secondary", config.secondaryColor);
  root.style.setProperty("--tenant-font", config.fontFamily);
  root.style.setProperty("--brand-primary", config.primaryColor);
  root.style.setProperty("--brand-secondary", config.secondaryColor);
  root.style.setProperty("--brand-font", config.fontFamily);
}

type BrandingUpdateMessage = {
  type: "branding-update";
  payload: {
    primaryColor?: string;
    secondaryColor?: string;
    font?: string;
    logoUrl?: string;
    businessName?: string;
    template?: string;
    fontFamily?: string;
  };
};

type BrandingContextValue = {
  config: TenantConfig;
  isLoading: boolean;
  error: string | null;
  isPreviewMode: boolean;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function readPreviewParams(): { preview: boolean; token: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    preview: params.get("preview") === "1",
    token: params.get("token")
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setPreviewMode] = useState(false);

  const mergePreviewPayload = useCallback((payload: BrandingUpdateMessage["payload"]) => {
    setConfig((prev) => {
      const next: TenantConfig = { ...prev };
      if (typeof payload.businessName === "string") next.businessName = payload.businessName;
      if (typeof payload.logoUrl === "string") next.logoUrl = payload.logoUrl;
      if (typeof payload.primaryColor === "string") next.primaryColor = payload.primaryColor;
      if (typeof payload.secondaryColor === "string") next.secondaryColor = payload.secondaryColor;
      if (typeof payload.template === "string") next.template = normalizeTemplate(payload.template);
      if (typeof payload.fontFamily === "string") {
        next.fontFamily = payload.fontFamily;
      } else if (typeof payload.font === "string") {
        next.fontFamily = fontIdToStack(payload.font);
      }
      applyCssVariables(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { preview, token } = readPreviewParams();

    if (preview) {
      setPreviewMode(true);
    }

    (async () => {
      try {
        if (preview) {
          if (token) {
            const res = await fetch(`/admin/preview-config?token=${encodeURIComponent(token)}`);
            if (!res.ok) {
              if (!cancelled) {
                applyCssVariables(defaultConfig);
                setError("Forhåndsvisning: ugyldigt eller udløbet token");
              }
              return;
            }
            const raw = (await res.json()) as Record<string, unknown>;
            const fontField = typeof raw.font === "string" ? raw.font : "system";
            const merged: TenantConfig = {
              businessName: typeof raw.businessName === "string" ? raw.businessName : defaultConfig.businessName,
              logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : defaultConfig.logoUrl,
              primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : defaultConfig.primaryColor,
              secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : defaultConfig.secondaryColor,
              fontFamily:
                typeof raw.fontFamily === "string" ? raw.fontFamily : fontIdToStack(fontField),
              template: normalizeTemplate(typeof raw.template === "string" ? raw.template : undefined)
            };
            if (!cancelled) {
              setConfig(merged);
              applyCssVariables(merged);
              setError(null);
            }
            return;
          }
          if (!cancelled) {
            applyCssVariables(defaultConfig);
            setError(null);
          }
          return;
        }

        const res = await fetch("/tenant-config.json");
        if (!res.ok) {
          if (!cancelled) {
            applyCssVariables(defaultConfig);
            setError(null);
          }
          return;
        }
        const raw = (await res.json()) as Partial<TenantConfig> & { font?: string };
        const merged: TenantConfig = {
          businessName: typeof raw.businessName === "string" ? raw.businessName : defaultConfig.businessName,
          logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : defaultConfig.logoUrl,
          primaryColor: typeof raw.primaryColor === "string" ? raw.primaryColor : defaultConfig.primaryColor,
          secondaryColor: typeof raw.secondaryColor === "string" ? raw.secondaryColor : defaultConfig.secondaryColor,
          fontFamily:
            typeof raw.fontFamily === "string"
              ? raw.fontFamily
              : typeof raw.font === "string"
                ? fontIdToStack(raw.font)
                : defaultConfig.fontFamily,
          template: normalizeTemplate(raw.template)
        };
        if (!cancelled) {
          setConfig(merged);
          applyCssVariables(merged);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          applyCssVariables(defaultConfig);
          setError("Kunne ikke indlæse tenant config");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isPreviewMode) return;
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as BrandingUpdateMessage | null;
      if (!data || data.type !== "branding-update" || !data.payload || typeof data.payload !== "object") return;
      mergePreviewPayload(data.payload);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isPreviewMode, mergePreviewPayload]);

  const value = useMemo<BrandingContextValue>(
    () => ({ config, isLoading, error, isPreviewMode }),
    [config, isLoading, error, isPreviewMode]
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
