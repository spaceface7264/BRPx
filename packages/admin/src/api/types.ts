export type ProductSettings = {
  displayMode: "cards" | "list";
  showDescriptions: boolean;
  categoryOrder: number[];
  productOrder: number[];
  hiddenProducts: number[];
  featuredProducts: number[];
  showPrices: boolean;
  hiddenCategories: number[];
};

export type Tenant = {
  id: string;
  email: string;
  businessName: string | null;
  brpApiUrl: string | null;
  brpApiKeySet: boolean;
  brpConnected: boolean;
  brpLastSync: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  template: string;
  productSettings: ProductSettings;
  customDomain: string | null;
  domainVerified: boolean;
  platformSubdomain: string | null;
  isLive: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  gaMeasurementId: string | null;
  postPurchaseRedirectUrl: string | null;
  onboardingStep: number;
  previewToken: string | null;
};

export type BrpBusinessUnit = { id: number; name: string };

export type BrpWebCategory = { id: number; name: string; sortorder: number };

export type BrpProduct = {
  id: number;
  name: string;
  description: string;
  priceincvat: number;
  producttype: string;
  webcategoryid: number;
  webcategory: string;
  bookablefrominternet: boolean;
};

export type CatalogResponse = {
  businessunits: BrpBusinessUnit[];
  categoriesByUnit: Record<number, BrpWebCategory[]>;
  productsByUnit: Record<number, BrpProduct[]>;
};
