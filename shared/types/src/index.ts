/** Normalized app types (optional consumer-facing layer). */
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  priceInOre: number;
  displayPrice: string;
  locationId: string;
  type: "membership" | "punchcard" | "trial" | "dropin" | "event" | "other";
}

export interface MemberLookupResult {
  found: boolean;
  email: string;
}

export interface PaymentLink {
  paymentUrl: string;
  expiresAt: string;
}

/**
 * BRP API wire shapes (lowercase fields, öre/cents, JSON).
 * Aligned with BRP Systems API docs: businessunits, products, orders, items, receipts flow.
 */

export interface BrpBusinessUnit {
  id: number;
  name: string;
  companyid: number;
  companyname: string;
  regionid: number | null;
  regionname: string | null;
  mailaddress: string;
  invoiceaddress: string;
}

export interface BrpBusinessUnitsResponse {
  businessunits: BrpBusinessUnit[];
}

/** Web category for grouping products on web checkout (storefront navigation). */
export interface BrpWebCategory {
  id: number;
  name: string;
  sortorder: number;
}

export interface BrpWebCategoriesResponse {
  webcategories: BrpWebCategory[];
}

export interface BrpProductBusinessUnitRef {
  id: number;
  name: string;
}

export interface BrpProduct {
  id: number;
  number: string;
  name: string;
  description: string;
  lastupdate: string;
  bookablefrominternet: boolean;
  producttype: BrpProductType;
  priceincvat: number;
  priceexvat: number;
  group: string;
  groupid: number;
  webcategoryid: number;
  webcategory: string;
  businessunits: BrpProductBusinessUnitRef[];
}

export type BrpProductType =
  | "groupActivity"
  | "subscription"
  | "package"
  | "article"
  | "service"
  | "event"
  | "stockProduct"
  | "valueCard"
  | "entry";

export interface BrpProductsResponse {
  products: BrpProduct[];
}

export interface BrpOrderedBy {
  id: number | null;
  number: string | null;
  name: string | null;
  streetaddress: string | null;
  postaladdress: string | null;
  country: string | null;
}

export interface BrpOrderItem {
  id: number;
  producttype: string;
  productname: string;
  productid: number;
  numberofproducts: number;
  priceexvat: number;
  priceincvat: number;
}

export interface BrpVatSum {
  rate: number;
  amount: number;
}

export interface BrpOrder {
  id: number;
  number: number;
  created: string;
  orderedby: BrpOrderedBy;
  businessunitid: number;
  items: BrpOrderItem[];
  vatsums: BrpVatSum[];
  sum: number;
  lefttopay: number;
  preliminary: boolean;
  preliminaryuntil: string;
  mark: string | null;
  externalnote: string | null;
  internalnote: string | null;
  bringnotetoinvoice: boolean;
}

export interface BrpOrderResponse {
  order: BrpOrder;
}

export interface BrpCreateOrderRequest {
  currentbusinessunitid?: number;
  preliminary?: boolean;
  externalnote?: string;
  internalnote?: string;
  bringnotetoinvoice?: boolean;
  coupons?: string;
}

export interface BrpAddOrderItemRequest {
  productid: number;
  quantity: number;
}

export interface BrpPaymentLinkRequest {
  email: string;
  paymentmethodid?: number;
}

/** Simulates PSP redirect after order is ready to pay (external payment step). */
export interface BrpPaymentLinkResponse {
  orderid: number;
  lefttopay: number;
  paymentUrl: string;
  paymentmethodid: number;
  preliminaryuntil: string;
}

export interface BrpPerson {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
}

export interface BrpPersonVerifyResponse {
  found: boolean;
  person: BrpPerson | null;
}

/** Payload for creating a new member in BRP. */
export interface BrpCreateMemberRequest {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  streetaddress: string;
  postalcode: string;
  city: string;
  birthdate: string;
}

export interface BrpCreateMemberResponse {
  person: BrpPerson;
}

/** Tenant config returned by /api/config. */
export interface TenantConfig {
  tenantId: string;
  businessName: string;
  template: "minimal" | "bold";
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  language?: "da" | "sv" | "no";
  skipLocationStep: boolean;
  defaultLocationId: string | null;
  productDisplay: "cards" | "list";
  showProductDescriptions: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  successRedirectUrl: string | null;
}

/**
 * Normalized BRP API client interface.
 * Abstracts BRP quirks so the rest of the codebase works with clean types.
 */
export interface BRPClient {
  getLocations(): Promise<Location[]>;
  getProducts(locationId: string): Promise<Product[]>;
  lookupMember(email: string): Promise<MemberLookupResult>;
  createMember(data: BrpCreateMemberRequest): Promise<BrpPerson>;
  createPaymentLink(data: { orderId: number; email: string }): Promise<PaymentLink>;
  validateCredentials(): Promise<boolean>;
}
