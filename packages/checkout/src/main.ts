import "./style.css";

type BrpBusinessUnit = {
  id: number;
  name: string;
  mailaddress: string;
};

type BrpWebCategory = {
  id: number;
  name: string;
  sortorder: number;
};

type BrpProduct = {
  id: number;
  name: string;
  description: string;
  priceincvat: number;
  priceexvat: number;
  producttype: string;
  webcategoryid: number;
  webcategory: string;
  bookablefrominternet: boolean;
};

type BrpOrder = {
  id: number;
  number: number;
  lefttopay: number;
  items: { productid: number; productname: string; numberofproducts: number; priceincvat: number }[];
};

const formatPriceIncVat = (priceincvat: number): string =>
  new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(priceincvat / 100);

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing app root");
}

const state = {
  step: 1,
  businessUnits: [] as BrpBusinessUnit[],
  webCategories: [] as BrpWebCategory[],
  products: [] as BrpProduct[],
  selectedBusinessUnit: null as BrpBusinessUnit | null,
  selectedProduct: null as BrpProduct | null,
  email: "",
  statusMessage: "" as string
};

const renderProductStep = (): string => {
  const sortedCats = [...state.webCategories].sort((a, b) => a.sortorder - b.sortorder);
  const blocks: string[] = [];
  for (const cat of sortedCats) {
    const inCat = state.products.filter((p) => p.webcategoryid === cat.id);
    if (inCat.length === 0) continue;
    blocks.push(`<h3 class="webcategory">${cat.name}</h3>`);
    blocks.push(
      `<div class="grid">${inCat
        .map(
          (product) => `
        <button class="card" type="button" data-product-id="${product.id}">
          <strong>${product.name}</strong>
          <span class="muted">${product.description || "No description"}</span>
          <span>${formatPriceIncVat(product.priceincvat)}</span>
          <span class="muted small">${product.producttype}</span>
        </button>
      `
        )
        .join("")}</div>`
    );
  }
  const used = new Set(sortedCats.map((c) => c.id));
  const uncategorized = state.products.filter((p) => !used.has(p.webcategoryid));
  if (uncategorized.length > 0) {
    blocks.push(`<h3 class="webcategory">Other</h3>`);
    blocks.push(
      `<div class="grid">${uncategorized
        .map(
          (product) => `
        <button class="card" type="button" data-product-id="${product.id}">
          <strong>${product.name}</strong>
          <span class="muted">${product.description || "No description"}</span>
          <span>${formatPriceIncVat(product.priceincvat)}</span>
        </button>
      `
        )
        .join("")}</div>`
    );
  }
  return blocks.join("");
};

const render = (): void => {
  app.innerHTML = `
    <main class="checkout">
      <header class="header">
        <h1>BRP Front Checkout</h1>
        <p>Select facility, pick a product by web category, then complete the order-based checkout.</p>
      </header>
      ${state.statusMessage ? `<p class="status" role="status">${state.statusMessage}</p>` : ""}
      <ol class="steps">
        <li class="${state.step >= 1 ? "active" : ""}">Facility</li>
        <li class="${state.step >= 2 ? "active" : ""}">Product</li>
        <li class="${state.step >= 3 ? "active" : ""}">Sign up</li>
        <li class="${state.step >= 4 ? "active" : ""}">Payment</li>
      </ol>
      <section id="view"></section>
    </main>
  `;

  const view = document.querySelector<HTMLElement>("#view");
  if (!view) return;

  if (state.step === 1) {
    view.innerHTML = `
      <h2>Choose business unit</h2>
      <div class="grid">
        ${state.businessUnits
          .map(
            (bu) => `
              <button class="card" type="button" data-businessunit-id="${bu.id}">
                <strong>${bu.name}</strong>
                <span class="muted">${bu.mailaddress}</span>
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  if (state.step === 2 && state.selectedBusinessUnit) {
    view.innerHTML = `
      <h2>Products at ${state.selectedBusinessUnit.name}</h2>
      <p class="muted">Filtered with bookablefrominternet=true, grouped by webcategory.</p>
      ${renderProductStep()}
    `;
  }

  if (state.step === 3) {
    view.innerHTML = `
      <h2>Sign up or log in</h2>
      <form id="email-form" class="form">
        <label for="email">Email</label>
        <input id="email" type="email" required placeholder="name@email.com" />
        <button type="submit">Continue</button>
      </form>
      <p class="muted small">Use test@test.com for an existing person in the mock.</p>
    `;
  }

  if (state.step === 4 && state.selectedProduct && state.selectedBusinessUnit) {
    view.innerHTML = `
      <h2>Payment</h2>
      <p class="summary">
        ${state.selectedProduct.name} (${formatPriceIncVat(state.selectedProduct.priceincvat)})<br />
        Business unit id ${state.selectedBusinessUnit.id}, productid ${state.selectedProduct.id}
      </p>
      <button id="order-checkout" type="button">Create order, add item, open payment link</button>
      <p id="payment-result"></p>
    `;
  }
};

const bindEvents = (): void => {
  app.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const buButton = target.closest("[data-businessunit-id]") as HTMLElement | null;
    const productButton = target.closest("[data-product-id]") as HTMLElement | null;
    const checkoutButton = target.closest("#order-checkout");

    if (buButton) {
      const id = Number.parseInt(buButton.dataset.businessunitId ?? "", 10);
      const bu = state.businessUnits.find((b) => b.id === id);
      if (!bu) return;
      state.selectedBusinessUnit = bu;
      state.statusMessage = "";
      const buParam = String(bu.id);
      const [catRes, prodRes] = await Promise.all([
        fetch(`/mock/brp/webcategories?businessunitids=${encodeURIComponent(buParam)}`),
        fetch(
          `/mock/brp/products?businessunitids=${encodeURIComponent(buParam)}&bookablefrominternet=true`
        )
      ]);
      const catData = (await catRes.json()) as { webcategories: BrpWebCategory[] };
      const prodData = (await prodRes.json()) as { products: BrpProduct[] };
      state.webCategories = catData.webcategories;
      state.products = prodData.products;
      state.step = 2;
      render();
      return;
    }

    if (productButton) {
      const pid = Number.parseInt(productButton.dataset.productId ?? "", 10);
      const product = state.products.find((p) => p.id === pid);
      if (!product) return;
      state.selectedProduct = product;
      state.step = 3;
      render();
      return;
    }

    if (checkoutButton && state.selectedProduct && state.email && state.selectedBusinessUnit) {
      const resultEl = document.querySelector<HTMLElement>("#payment-result");
      state.statusMessage = "";
      try {
        const orderRes = await fetch("/mock/brp/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentbusinessunitid: state.selectedBusinessUnit.id,
            preliminary: true
          })
        });
        const orderJson = (await orderRes.json()) as { order: BrpOrder; error?: string };
        if (!orderRes.ok) {
          state.statusMessage = orderJson.error ?? "Could not create order";
          render();
          return;
        }
        const orderId = orderJson.order.id;

        const itemRes = await fetch(`/mock/brp/orders/${orderId}/items`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productid: state.selectedProduct.id, quantity: 1 })
        });
        const itemJson = (await itemRes.json()) as { order: BrpOrder; error?: string };
        if (!itemRes.ok) {
          state.statusMessage = itemJson.error ?? "Could not add order item";
          render();
          return;
        }

        const payRes = await fetch(`/mock/brp/orders/${orderId}/payment-link`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: state.email, paymentmethodid: 1 })
        });
        const payJson = (await payRes.json()) as {
          paymentUrl: string;
          lefttopay: number;
          orderid: number;
          error?: string;
        };
        if (!payRes.ok) {
          state.statusMessage = payJson.error ?? "Could not create payment link";
          render();
          return;
        }
        if (resultEl) {
          resultEl.innerHTML = `<a href="${payJson.paymentUrl}" target="_blank" rel="noreferrer">Open payment link</a> (lefttopay ${payJson.lefttopay} ore, orderid ${payJson.orderid})`;
        }
      } catch {
        state.statusMessage = "Network error during checkout";
        render();
      }
    }
  });

  app.addEventListener("submit", async (event) => {
    const form = event.target as HTMLFormElement;
    if (form.id !== "email-form") return;
    event.preventDefault();
    const emailInput = form.querySelector<HTMLInputElement>("#email");
    if (!emailInput?.value) return;
    state.email = emailInput.value.trim();
    await fetch("/mock/brp/persons/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: state.email })
    });
    state.step = 4;
    render();
  });
};

const init = async (): Promise<void> => {
  const response = await fetch("/mock/brp/businessunits");
  const data = (await response.json()) as { businessunits: BrpBusinessUnit[] };
  state.businessUnits = data.businessunits;
  render();
  bindEvents();
};

void init();
