import { createMockBrpService } from "@brp/brp-api";
import type { BrpAddOrderItemRequest, BrpCreateOrderRequest, BrpPaymentLinkRequest } from "@brp/types";

const mockBrp = createMockBrpService();

type JsonValue = Record<string, unknown> | unknown[];

const json = (data: JsonValue, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {})
    }
  });
};

const notFound = (): Response => json({ error: "Not found" }, { status: 404 });

const badRequest = (message: string): Response => json({ error: message }, { status: 400 });

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "worker" });
    }

    if (url.pathname === "/mock/brp/businessunits" && request.method === "GET") {
      const data = await mockBrp.getBusinessUnits();
      return json(data);
    }

    if (url.pathname === "/mock/brp/webcategories" && request.method === "GET") {
      const businessunitids = url.searchParams.get("businessunitids");
      if (!businessunitids) {
        return badRequest("businessunitids is required");
      }
      const data = await mockBrp.getWebCategories(businessunitids);
      return json(data);
    }

    if (url.pathname === "/mock/brp/products" && request.method === "GET") {
      const businessunitids = url.searchParams.get("businessunitids");
      if (!businessunitids) {
        return badRequest("businessunitids is required");
      }
      const bookablefrominternet = url.searchParams.get("bookablefrominternet") ?? undefined;
      const data = await mockBrp.getProducts({ businessunitids, bookablefrominternet });
      return json(data);
    }

    if (url.pathname === "/mock/brp/orders" && request.method === "POST") {
      const body = (await request.json()) as BrpCreateOrderRequest;
      const data = await mockBrp.createOrder(body);
      return json(data);
    }

    const itemsMatch = url.pathname.match(/^\/mock\/brp\/orders\/(\d+)\/items$/);
    if (itemsMatch && request.method === "POST") {
      const orderid = Number.parseInt(itemsMatch[1], 10);
      const body = (await request.json()) as BrpAddOrderItemRequest;
      if (!body.productid) {
        return badRequest("productid is required");
      }
      try {
        const data = await mockBrp.addOrderItem(orderid, body);
        return json(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "UNKNOWN";
        if (msg === "ORDER_NOT_FOUND") return badRequest("order not found");
        if (msg === "PRODUCT_NOT_FOUND") return badRequest("product not found");
        if (msg === "PRODUCT_NOT_ON_BUSINESS_UNIT") return badRequest("product not available on this business unit");
        return json({ error: msg }, { status: 500 });
      }
    }

    const payMatch = url.pathname.match(/^\/mock\/brp\/orders\/(\d+)\/payment-link$/);
    if (payMatch && request.method === "POST") {
      const orderid = Number.parseInt(payMatch[1], 10);
      const body = (await request.json()) as BrpPaymentLinkRequest;
      if (!body.email) {
        return badRequest("email is required");
      }
      try {
        const data = await mockBrp.generatePaymentLink(orderid, body);
        return json(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "UNKNOWN";
        if (msg === "ORDER_NOT_FOUND") return badRequest("order not found");
        if (msg === "ORDER_HAS_NO_ITEMS") return badRequest("order has no items");
        return json({ error: msg }, { status: 500 });
      }
    }

    if (url.pathname === "/mock/brp/persons/verify" && request.method === "POST") {
      const body = (await request.json()) as { email?: string };
      if (!body.email) {
        return badRequest("email is required");
      }
      const data = await mockBrp.verifyPerson(body.email);
      return json(data);
    }

    if (url.pathname === "/mock/brp/member/lookup" && request.method === "POST") {
      const body = (await request.json()) as { email?: string };
      if (!body.email) {
        return badRequest("email is required");
      }
      const data = await mockBrp.verifyPerson(body.email);
      return json({ found: data.found, email: body.email });
    }

    return notFound();
  }
};
