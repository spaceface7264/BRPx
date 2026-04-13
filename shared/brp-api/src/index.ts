import type {
  BrpAddOrderItemRequest,
  BrpBusinessUnitsResponse,
  BrpCreateOrderRequest,
  BrpOrder,
  BrpOrderItem,
  BrpOrderResponse,
  BrpPaymentLinkRequest,
  BrpPaymentLinkResponse,
  BrpPersonVerifyResponse,
  BrpProduct,
  BrpProductsResponse,
  BrpWebCategoriesResponse
} from "@brp/types";

const withDelay = async <T>(value: T): Promise<T> => {
  const delayMs = 200 + Math.floor(Math.random() * 300);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return value;
};

const businessUnits: BrpBusinessUnitsResponse = {
  businessunits: [
    {
      id: 401,
      name: "Aarhus Center",
      companyid: 1,
      companyname: "Demo Gym A/S",
      regionid: 10,
      regionname: "Jylland",
      mailaddress: "Sondergade 1 8000 Aarhus DK",
      invoiceaddress: "Sondergade 1 8000 Aarhus DK"
    },
    {
      id: 402,
      name: "Copenhagen Studio",
      companyid: 1,
      companyname: "Demo Gym A/S",
      regionid: 11,
      regionname: "Sjaelland",
      mailaddress: "Norrebrogade 25 2200 Kobenhavn DK",
      invoiceaddress: "Norrebrogade 25 2200 Kobenhavn DK"
    },
    {
      id: 403,
      name: "Odense Hall",
      companyid: 1,
      companyname: "Demo Gym A/S",
      regionid: 12,
      regionname: "Fyn",
      mailaddress: "Vestergade 18 5000 Odense DK",
      invoiceaddress: "Vestergade 18 5000 Odense DK"
    }
  ]
};

const webCategoriesByBusinessUnit: Record<number, BrpWebCategoriesResponse> = {
  401: {
    webcategories: [
      { id: 701, name: "Memberships", sortorder: 0 },
      { id: 702, name: "Clip cards", sortorder: 1 },
      { id: 703, name: "Trials and drop-in", sortorder: 2 }
    ]
  },
  402: {
    webcategories: [
      { id: 701, name: "Memberships", sortorder: 0 },
      { id: 702, name: "Clip cards", sortorder: 1 },
      { id: 703, name: "Trials and drop-in", sortorder: 2 }
    ]
  },
  403: {
    webcategories: [
      { id: 701, name: "Memberships", sortorder: 0 },
      { id: 702, name: "Clip cards", sortorder: 1 },
      { id: 703, name: "Trials and drop-in", sortorder: 2 }
    ]
  }
};

const productSeeds: BrpProduct[] = [
  {
    id: 9001,
    number: "SUB-AAR",
    name: "Monthly Membership",
    description: "Unlimited training",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "subscription",
    priceincvat: 39900,
    priceexvat: 31920,
    group: "Subscriptions",
    groupid: 51,
    webcategoryid: 701,
    webcategory: "Memberships",
    businessunits: [{ id: 401, name: "Aarhus Center" }]
  },
  {
    id: 9002,
    number: "SUB-CPH",
    name: "Monthly Membership",
    description: "Unlimited training",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "subscription",
    priceincvat: 41900,
    priceexvat: 33520,
    group: "Subscriptions",
    groupid: 51,
    webcategoryid: 701,
    webcategory: "Memberships",
    businessunits: [{ id: 402, name: "Copenhagen Studio" }]
  },
  {
    id: 9003,
    number: "SUB-ODE",
    name: "Monthly Membership",
    description: "Unlimited training",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "subscription",
    priceincvat: 37900,
    priceexvat: 30320,
    group: "Subscriptions",
    groupid: 51,
    webcategoryid: 701,
    webcategory: "Memberships",
    businessunits: [{ id: 403, name: "Odense Hall" }]
  },
  {
    id: 9004,
    number: "VC10-AAR",
    name: "10 Clip Card",
    description: "10 visits",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "valueCard",
    priceincvat: 99900,
    priceexvat: 79920,
    group: "Value cards",
    groupid: 52,
    webcategoryid: 702,
    webcategory: "Clip cards",
    businessunits: [{ id: 401, name: "Aarhus Center" }]
  },
  {
    id: 9005,
    number: "VC20-CPH",
    name: "20 Clip Card",
    description: "20 visits",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "valueCard",
    priceincvat: 179900,
    priceexvat: 143920,
    group: "Value cards",
    groupid: 52,
    webcategoryid: 702,
    webcategory: "Clip cards",
    businessunits: [{ id: 402, name: "Copenhagen Studio" }]
  },
  {
    id: 9006,
    number: "TRIAL-ODE",
    name: "2 Week Trial",
    description: "For new members",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "subscription",
    priceincvat: 9900,
    priceexvat: 7920,
    group: "Trials",
    groupid: 53,
    webcategoryid: 703,
    webcategory: "Trials and drop-in",
    businessunits: [{ id: 403, name: "Odense Hall" }]
  },
  {
    id: 9007,
    number: "ENTRY-AAR",
    name: "Single Drop-In",
    description: "One time entry",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "entry",
    priceincvat: 14900,
    priceexvat: 11920,
    group: "Drop-in",
    groupid: 54,
    webcategoryid: 703,
    webcategory: "Trials and drop-in",
    businessunits: [{ id: 401, name: "Aarhus Center" }]
  },
  {
    id: 9008,
    number: "ENTRY-CPH",
    name: "Single Drop-In",
    description: "One time entry",
    lastupdate: "2026-04-01 10:00",
    bookablefrominternet: true,
    producttype: "entry",
    priceincvat: 15900,
    priceexvat: 12720,
    group: "Drop-in",
    groupid: 54,
    webcategoryid: 703,
    webcategory: "Trials and drop-in",
    businessunits: [{ id: 402, name: "Copenhagen Studio" }]
  }
];

const parseIdList = (value: string | null): number[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => !Number.isNaN(id));
};

const sumItems = (items: BrpOrderItem[]): { sum: number; lefttopay: number; vatsums: { rate: number; amount: number }[] } => {
  const sum = items.reduce((acc, row) => acc + row.priceincvat * row.numberofproducts, 0);
  const vatByRate = new Map<number, number>();
  for (const row of items) {
    const vatAmount = (row.priceincvat - row.priceexvat) * row.numberofproducts;
    const rate =
      row.priceexvat > 0
        ? Math.round(((row.priceincvat - row.priceexvat) / row.priceexvat) * 100)
        : 25;
    vatByRate.set(rate, (vatByRate.get(rate) ?? 0) + vatAmount);
  }
  const vatsums = [...vatByRate.entries()].map(([rate, amount]) => ({ rate, amount }));
  return { sum, lefttopay: sum, vatsums };
};

const formatCreated = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const preliminaryUntil = (): string => {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const createMockBrpService = () => {
  const orders = new Map<number, BrpOrder>();
  let nextOrderId = 12000;
  let nextOrderNumber = 5100;
  let nextItemId = 88000;

  const getProduct = (productid: number): BrpProduct | undefined =>
    productSeeds.find((p) => p.id === productid);

  return {
    async getBusinessUnits(): Promise<BrpBusinessUnitsResponse> {
      return withDelay(structuredClone(businessUnits));
    },

    async getWebCategories(businessunitids: string): Promise<BrpWebCategoriesResponse> {
      const ids = parseIdList(businessunitids);
      const first = ids[0];
      if (!first || !webCategoriesByBusinessUnit[first]) {
        return withDelay({ webcategories: [] });
      }
      return withDelay(structuredClone(webCategoriesByBusinessUnit[first]));
    },

    async getProducts(params: {
      businessunitids: string;
      bookablefrominternet?: string;
    }): Promise<BrpProductsResponse> {
      const buIds = new Set(parseIdList(params.businessunitids));
      const internetOnly = params.bookablefrominternet === "true";
      const filtered = productSeeds.filter((p) => {
        const inBu = p.businessunits.some((b) => buIds.has(b.id));
        if (!inBu) return false;
        if (internetOnly && !p.bookablefrominternet) return false;
        return true;
      });
      return withDelay({ products: structuredClone(filtered) });
    },

    async createOrder(body: BrpCreateOrderRequest): Promise<BrpOrderResponse> {
      const businessunitid = body.currentbusinessunitid ?? businessUnits.businessunits[0].id;
      const preliminary = body.preliminary !== false;
      const order: BrpOrder = {
        id: nextOrderId++,
        number: nextOrderNumber++,
        created: formatCreated(),
        orderedby: {
          id: null,
          number: null,
          name: null,
          streetaddress: null,
          postaladdress: null,
          country: null
        },
        businessunitid,
        items: [],
        vatsums: [],
        sum: 0,
        lefttopay: 0,
        preliminary,
        preliminaryuntil: preliminaryUntil(),
        mark: null,
        externalnote: body.externalnote ?? null,
        internalnote: body.internalnote ?? null,
        bringnotetoinvoice: body.bringnotetoinvoice ?? false
      };
      orders.set(order.id, order);
      return withDelay({ order: structuredClone(order) });
    },

    async addOrderItem(orderid: number, body: BrpAddOrderItemRequest): Promise<BrpOrderResponse> {
      const order = orders.get(orderid);
      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }
      const product = getProduct(body.productid);
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }
      const allowed = product.businessunits.some((b) => b.id === order.businessunitid);
      if (!allowed) {
        throw new Error("PRODUCT_NOT_ON_BUSINESS_UNIT");
      }
      const qty = body.quantity > 0 ? body.quantity : 1;
      const item: BrpOrderItem = {
        id: nextItemId++,
        producttype: product.producttype,
        productname: product.name,
        productid: product.id,
        numberofproducts: qty,
        priceexvat: product.priceexvat,
        priceincvat: product.priceincvat
      };
      order.items.push(item);
      const totals = sumItems(order.items);
      order.sum = totals.sum;
      order.lefttopay = totals.lefttopay;
      order.vatsums = totals.vatsums;
      order.preliminaryuntil = preliminaryUntil();
      return withDelay({ order: structuredClone(order) });
    },

    async generatePaymentLink(orderid: number, body: BrpPaymentLinkRequest): Promise<BrpPaymentLinkResponse> {
      const order = orders.get(orderid);
      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }
      if (order.items.length === 0) {
        throw new Error("ORDER_HAS_NO_ITEMS");
      }
      const paymentmethodid = body.paymentmethodid ?? 1;
      const paymentUrl = `https://payments.example/psp?orderid=${encodeURIComponent(String(orderid))}&email=${encodeURIComponent(body.email)}&amount=${encodeURIComponent(String(order.lefttopay))}`;
      return withDelay({
        orderid,
        lefttopay: order.lefttopay,
        paymentUrl,
        paymentmethodid,
        preliminaryuntil: order.preliminaryuntil
      });
    },

    async verifyPerson(email: string): Promise<BrpPersonVerifyResponse> {
      const found = email.toLowerCase() === "test@test.com";
      return withDelay(
        found
          ? {
              found: true,
              person: {
                id: 5001,
                email: email.toLowerCase(),
                firstname: "Test",
                lastname: "User"
              }
            }
          : { found: false, person: null }
      );
    }
  };
};

export type MockBrpService = ReturnType<typeof createMockBrpService>;
