import type {
  BrpBusinessUnit,
  BrpWebCategory,
  BrpProduct,
  BrpPerson,
  BrpBusinessUnitsResponse,
  BrpWebCategoriesResponse,
  BrpProductsResponse,
  BrpOrderResponse,
  BrpPaymentLinkResponse,
  TenantConfig
} from "@brp/types";
import { formatPrice } from "@brp/utils";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

const state = {
  step: 1 as 1 | 2 | 3 | 4 | 5,
  loading: false,
  config: null as TenantConfig | null,
  businessUnits: [] as BrpBusinessUnit[],
  webCategories: [] as BrpWebCategory[],
  products: [] as BrpProduct[],
  selectedBusinessUnit: null as BrpBusinessUnit | null,
  selectedProduct: null as BrpProduct | null,
  email: "",
  memberExists: false,
  existingPerson: null as BrpPerson | null,
  statusMessage: ""
};

/* ── Helpers ── */

const skeletonCards = (count: number): string =>
  `<div class="grid">${Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join("")}</div>`;

const applyBranding = (config: TenantConfig): void => {
  const root = document.documentElement;
  root.style.setProperty("--tenant-primary", config.primaryColor);
  root.style.setProperty("--tenant-secondary", config.secondaryColor);
  root.style.setProperty("--tenant-font", config.font);
  app.dataset.template = config.template;
};

/* ── Render: product step ── */

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

/* ── Render: signup step ── */

const renderSignupStep = (): string => {
  if (!state.email) {
    return `
      <h2>Tilmelding</h2>
      <form id="email-form" class="form">
        <label for="email">Email</label>
        <input id="email" type="email" required placeholder="navn@email.dk" />
        <button type="submit">Fortsaet</button>
      </form>
    `;
  }

  if (state.memberExists && state.existingPerson) {
    return `
      <h2>Tilmelding</h2>
      <div class="welcome-back">
        <strong>Velkommen tilbage, ${state.existingPerson.firstname}!</strong>
        <p class="muted">Vi fandt din konto med ${state.email}.</p>
      </div>
      <button id="continue-existing" type="button">Fortsaet til betaling</button>
    `;
  }

  return `
    <h2>Opret konto</h2>
    <p class="muted">Vi kunne ikke finde en konto med ${state.email}. Udfyld dine oplysninger herunder.</p>
    <form id="signup-form" class="form">
      <div class="form-row">
        <div>
          <label for="firstname">Fornavn</label>
          <input id="firstname" type="text" required />
        </div>
        <div>
          <label for="lastname">Efternavn</label>
          <input id="lastname" type="text" required />
        </div>
      </div>
      <label for="signup-email">Email</label>
      <input id="signup-email" type="email" value="${state.email}" readonly />
      <label for="phone">Telefon</label>
      <input id="phone" type="tel" required placeholder="+45" />
      <label for="address">Adresse</label>
      <input id="address" type="text" required />
      <div class="form-row">
        <div>
          <label for="postalcode">Postnr.</label>
          <input id="postalcode" type="text" required />
        </div>
        <div>
          <label for="city">By</label>
          <input id="city" type="text" required />
        </div>
      </div>
      <label for="birthdate">Foedselsdato</label>
      <input id="birthdate" type="date" required />
      <div class="terms">
        <label>
          <input type="checkbox" id="terms-accept" required />
          Jeg accepterer handelsbetingelserne${state.config?.termsUrl ? ` (<a href="${state.config.termsUrl}" target="_blank" rel="noreferrer">laes her</a>)` : ""}
        </label>
        <label>
          <input type="checkbox" id="privacy-accept" required />
          Jeg accepterer privatlivspolitikken${state.config?.privacyUrl ? ` (<a href="${state.config.privacyUrl}" target="_blank" rel="noreferrer">laes her</a>)` : ""}
        </label>
      </div>
      <button type="submit">Opret og fortsaet</button>
    </form>
  `;
};

/* ── Main render ── */

const render = (): void => {
  const businessName = state.config?.businessName ?? "Checkout";
  const logoHtml = state.config?.logoUrl
    ? `<img class="logo" src="${state.config.logoUrl}" alt="${businessName}" />`
    : "";

  app.innerHTML = `
    <main class="checkout">
      <header class="header">
        ${logoHtml}
        <h1>${businessName}</h1>
      </header>
      ${state.statusMessage ? `<p class="status" role="status">${state.statusMessage}</p>` : ""}
      <ol class="steps">
        <li class="${state.step >= 1 ? "active" : ""}">Lokation</li>
        <li class="${state.step >= 2 ? "active" : ""}">Produkt</li>
        <li class="${state.step >= 3 ? "active" : ""}">Tilmelding</li>
        <li class="${state.step >= 4 ? "active" : ""}">Betaling</li>
        <li class="${state.step >= 5 ? "active" : ""}">Bekraeftelse</li>
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
    view.innerHTML = renderSignupStep();
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

  if (state.step === 5) {
    const redirectUrl = state.config?.successRedirectUrl;
    view.innerHTML = `
      <div class="confirmation">
        <div class="checkmark" aria-hidden="true">&#10003;</div>
        <h2>Tak for dit koeb!</h2>
        <p>Din ordre er gennemfoert. Du modtager en bekraeftelse paa ${state.email}.</p>
        ${redirectUrl ? `<p><a href="${redirectUrl}">Gaa til ${businessName}</a></p>` : ""}
      </div>
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
    const continueExisting = target.closest("#continue-existing");

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
      state.email = "";
      state.memberExists = false;
      state.existingPerson = null;
      state.step = 3;
      render();
      return;
    }

    if (continueExisting) {
      state.step = 4;
      render();
      return;
    }

    if (checkoutButton && state.selectedProduct && state.email && state.selectedBusinessUnit) {
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

        // In a real flow this would redirect to the PSP; for mock we show step 5
        state.step = 5;
        render();
      } catch {
        state.statusMessage = "Netvaerksfejl under checkout";
        render();
      }
    }
  });

  app.addEventListener("submit", async (event) => {
    const form = event.target as HTMLFormElement;
    event.preventDefault();

    // Email lookup form
    if (form.id === "email-form") {
      const emailInput = form.querySelector<HTMLInputElement>("#email");
      if (!emailInput?.value) return;
      state.email = emailInput.value.trim();
      state.loading = true;
      render();

      const res = await fetch("/api/member/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: state.email })
      });
      const data = (await res.json()) as { found: boolean; email: string; person: BrpPerson | null };
      state.memberExists = data.found;
      state.existingPerson = data.person;
      state.loading = false;
      render();
      return;
    }

    // Full signup form
    if (form.id === "signup-form") {
      const getValue = (id: string): string =>
        (form.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "").trim();

      const body = {
        firstname: getValue("firstname"),
        lastname: getValue("lastname"),
        email: state.email,
        phone: getValue("phone"),
        streetaddress: getValue("address"),
        postalcode: getValue("postalcode"),
        city: getValue("city"),
        birthdate: getValue("birthdate")
      };

      const res = await fetch("/api/member/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        state.statusMessage = "Kunne ikke oprette konto";
        render();
        return;
      }

      state.step = 4;
      render();
    }
  });
};

/* ── Init ── */

const init = async (): Promise<void> => {
  state.loading = true;
  render();
  bindEvents();

  // Load tenant config and locations in parallel
  const [configRes, locationsRes] = await Promise.all([
    fetch("/api/config"),
    fetch("/api/locations")
  ]);

  if (configRes.ok) {
    state.config = (await configRes.json()) as TenantConfig;
    applyBranding(state.config);

    // Skip location step if configured and only one location
    const locData = (await locationsRes.json()) as BrpBusinessUnitsResponse;
    state.businessUnits = locData.businessunits;

    if (state.config.skipLocationStep && state.businessUnits.length === 1) {
      state.selectedBusinessUnit = state.businessUnits[0];
      state.step = 2;
      state.loading = true;
      render();

      const prodRes = await fetch(
        `/api/products?locationId=${encodeURIComponent(String(state.businessUnits[0].id))}`
      );
      const prodData = (await prodRes.json()) as BrpWebCategoriesResponse & BrpProductsResponse;
      state.webCategories = prodData.webcategories;
      state.products = prodData.products;
    }
  } else {
    const locData = (await locationsRes.json()) as BrpBusinessUnitsResponse;
    state.businessUnits = locData.businessunits;
  }

  state.loading = false;
  render();
};

void init();
