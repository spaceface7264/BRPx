import type {
  BrpBusinessUnit,
  BrpWebCategory,
  BrpProduct,
  BrpBusinessUnitsResponse,
  BrpWebCategoriesResponse,
  BrpProductsResponse,
  BrpOrderResponse,
  BrpPaymentLinkResponse
} from "@brp/types";
import { formatPrice } from "@brp/utils";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

const state = {
  step: 1,
  loading: false,
  businessUnits: [] as BrpBusinessUnit[],
  webCategories: [] as BrpWebCategory[],
  products: [] as BrpProduct[],
  selectedBusinessUnit: null as BrpBusinessUnit | null,
  selectedProduct: null as BrpProduct | null,
  email: "",
  statusMessage: ""
};

/* ── Render helpers ── */

const skeletonCards = (count: number): string =>
  `<div class="grid">${Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join("")}</div>`;

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
          <span class="muted">${product.description || ""}</span>
          <span>${formatPrice(product.priceincvat)}</span>
          <span class="muted small">${product.producttype}</span>
        </button>`
        )
        .join("")}</div>`
    );
  }

  const used = new Set(sortedCats.map((c) => c.id));
  const uncategorized = state.products.filter((p) => !used.has(p.webcategoryid));
  if (uncategorized.length > 0) {
    blocks.push(`<h3 class="webcategory">Andet</h3>`);
    blocks.push(
      `<div class="grid">${uncategorized
        .map(
          (product) => `
        <button class="card" type="button" data-product-id="${product.id}">
          <strong>${product.name}</strong>
          <span class="muted">${product.description || ""}</span>
          <span>${formatPrice(product.priceincvat)}</span>
        </button>`
        )
        .join("")}</div>`
    );
  }

  return blocks.join("");
};

/* ── Main render ── */

const render = (): void => {
  app.innerHTML = `
    <main class="checkout">
      <header class="header">
        <h1>Checkout</h1>
      </header>
      ${state.statusMessage ? `<p class="status" role="status">${state.statusMessage}</p>` : ""}
      <ol class="steps">
        <li class="${state.step >= 1 ? "active" : ""}">Lokation</li>
        <li class="${state.step >= 2 ? "active" : ""}">Produkt</li>
        <li class="${state.step >= 3 ? "active" : ""}">Tilmelding</li>
        <li class="${state.step >= 4 ? "active" : ""}">Betaling</li>
      </ol>
      <section id="view"></section>
    </main>
  `;

  const view = document.querySelector<HTMLElement>("#view");
  if (!view) return;

  if (state.step === 1) {
    if (state.loading) {
      view.innerHTML = `<h2>Vaelg lokation</h2>${skeletonCards(3)}`;
      return;
    }
    view.innerHTML = `
      <h2>Vaelg lokation</h2>
      <div class="grid">
        ${state.businessUnits
          .map(
            (bu) => `
            <button class="card" type="button" data-businessunit-id="${bu.id}">
              <strong>${bu.name}</strong>
              <span class="muted">${bu.mailaddress}</span>
            </button>`
          )
          .join("")}
      </div>
    `;
  }

  if (state.step === 2 && state.selectedBusinessUnit) {
    if (state.loading) {
      view.innerHTML = `<h2>Produkter - ${state.selectedBusinessUnit.name}</h2>${skeletonCards(4)}`;
      return;
    }
    view.innerHTML = `
      <h2>Produkter - ${state.selectedBusinessUnit.name}</h2>
      ${renderProductStep()}
    `;
  }

  if (state.step === 3) {
    view.innerHTML = `
      <h2>Tilmelding</h2>
      <form id="email-form" class="form">
        <label for="email">Email</label>
        <input id="email" type="email" required placeholder="navn@email.dk" />
        <button type="submit">Fortsaet</button>
      </form>
    `;
  }

  if (state.step === 4 && state.selectedProduct && state.selectedBusinessUnit) {
    view.innerHTML = `
      <h2>Betaling</h2>
      <div class="summary">
        <strong>${state.selectedProduct.name}</strong><br />
        ${formatPrice(state.selectedProduct.priceincvat)} - ${state.selectedBusinessUnit.name}
      </div>
      <button id="order-checkout" type="button" style="margin-top:12px">Betal nu</button>
      <p id="payment-result"></p>
    `;
  }
};

/* ── Event handlers ── */

const bindEvents = (): void => {
  app.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const buButton = target.closest<HTMLElement>("[data-businessunit-id]");
    const productButton = target.closest<HTMLElement>("[data-product-id]");
    const checkoutButton = target.closest("#order-checkout");

    if (buButton) {
      const id = Number.parseInt(buButton.dataset.businessunitId ?? "", 10);
      const bu = state.businessUnits.find((b) => b.id === id);
      if (!bu) return;
      state.selectedBusinessUnit = bu;
      state.statusMessage = "";
      state.step = 2;
      state.loading = true;
      render();

      const res = await fetch(`/api/products?locationId=${encodeURIComponent(String(bu.id))}`);
      const data = (await res.json()) as BrpWebCategoriesResponse & BrpProductsResponse;
      state.webCategories = data.webcategories;
      state.products = data.products;
      state.loading = false;
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
        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentbusinessunitid: state.selectedBusinessUnit.id,
            preliminary: true
          })
        });
        const orderJson = (await orderRes.json()) as BrpOrderResponse & { error?: string };
        if (!orderRes.ok) {
          state.statusMessage = orderJson.error ?? "Kunne ikke oprette ordre";
          render();
          return;
        }
        const orderId = orderJson.order.id;

        const itemRes = await fetch(`/api/orders/${orderId}/items`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productid: state.selectedProduct.id, quantity: 1 })
        });
        const itemJson = (await itemRes.json()) as BrpOrderResponse & { error?: string };
        if (!itemRes.ok) {
          state.statusMessage = itemJson.error ?? "Kunne ikke tilfoeje produkt";
          render();
          return;
        }

        const payRes = await fetch(`/api/orders/${orderId}/payment-link`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: state.email, paymentmethodid: 1 })
        });
        const payJson = (await payRes.json()) as BrpPaymentLinkResponse & { error?: string };
        if (!payRes.ok) {
          state.statusMessage = payJson.error ?? "Kunne ikke oprette betalingslink";
          render();
          return;
        }
        if (resultEl) {
          resultEl.innerHTML = `<a href="${payJson.paymentUrl}" target="_blank" rel="noreferrer">Abn betalingslink</a> (${formatPrice(payJson.lefttopay)})`;
        }
      } catch {
        state.statusMessage = "Netvaerksfejl under checkout";
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
    await fetch("/api/member/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: state.email })
    });
    state.step = 4;
    render();
  });
};

/* ── Init ── */

const init = async (): Promise<void> => {
  state.loading = true;
  render();
  bindEvents();

  const response = await fetch("/api/locations");
  const data = (await response.json()) as BrpBusinessUnitsResponse;
  state.businessUnits = data.businessunits;
  state.loading = false;
  render();
};

void init();
