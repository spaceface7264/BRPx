import type {
  BrpBusinessUnit,
  BrpOrder,
  BrpPaymentLinkResponse,
  BrpPersonVerifyResponse,
  BrpProduct,
  BrpWebCategory
} from "./types.ts";

const json = async <T>(res: Response): Promise<T> => {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error("error" in data && typeof data.error === "string" ? data.error : res.statusText);
  }
  return data;
};

export async function fetchBusinessUnits(): Promise<BrpBusinessUnit[]> {
  const res = await fetch("/mock/brp/businessunits");
  const data = await json<{ businessunits: BrpBusinessUnit[] }>(res);
  return data.businessunits;
}

export async function fetchWebCategories(businessUnitId: number): Promise<BrpWebCategory[]> {
  const q = new URLSearchParams({ businessunitids: String(businessUnitId) });
  const res = await fetch(`/mock/brp/webcategories?${q}`);
  const data = await json<{ webcategories: BrpWebCategory[] }>(res);
  return data.webcategories;
}

export async function fetchProducts(businessUnitId: number): Promise<BrpProduct[]> {
  const q = new URLSearchParams({
    businessunitids: String(businessUnitId),
    bookablefrominternet: "true"
  });
  const res = await fetch(`/mock/brp/products?${q}`);
  const data = await json<{ products: BrpProduct[] }>(res);
  return data.products;
}

export async function verifyPerson(email: string): Promise<BrpPersonVerifyResponse> {
  const res = await fetch("/mock/brp/persons/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });
  return json<BrpPersonVerifyResponse>(res);
}

export async function createOrder(businessUnitId: number): Promise<BrpOrder> {
  const res = await fetch("/mock/brp/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ currentbusinessunitid: businessUnitId, preliminary: true })
  });
  const data = await json<{ order: BrpOrder }>(res);
  return data.order;
}

export async function addOrderItem(orderId: number, productId: number, quantity: number): Promise<BrpOrder> {
  const res = await fetch(`/mock/brp/orders/${orderId}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productid: productId, quantity })
  });
  const data = await json<{ order: BrpOrder }>(res);
  return data.order;
}

export async function createPaymentLink(orderId: number, email: string): Promise<BrpPaymentLinkResponse> {
  const res = await fetch(`/mock/brp/orders/${orderId}/payment-link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, paymentmethodid: 1 })
  });
  return json<BrpPaymentLinkResponse>(res);
}

export function formatPriceIncVat(priceincvat: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(priceincvat / 100);
}
