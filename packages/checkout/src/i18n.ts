export type CheckoutLanguage = "da" | "sv" | "no";

const strings: Record<CheckoutLanguage, Record<string, string>> = {
  da: {
    "step.location": "Vaelg lokation",
    "step.products": "Produkter",
    "step.email": "Din e-mail",
    "step.summary": "Ordreoversigt",
    "button.back": "Tilbage",
    "button.continue": "Fortsat",
    "button.pay": "Betal sikkert",
    "label.email": "E-mail",
    "label.location": "Lokation",
    "label.product": "Produkt",
    "label.total": "Total (inkl. moms)",
    "status.preview": "Forhaandsvisning: betaling er deaktiveret",
    "status.comingSoonTitle": "Kommer snart",
    "status.comingSoonBody": "Checkout er ved at blive klargjort. Prov igen senere."
  },
  sv: {
    "step.location": "Valj plats",
    "step.products": "Produkter",
    "step.email": "Din e-post",
    "step.summary": "Ordersammanfattning",
    "button.back": "Tillbaka",
    "button.continue": "Fortsatt",
    "button.pay": "Betala sakert",
    "label.email": "E-post",
    "label.location": "Plats",
    "label.product": "Produkt",
    "label.total": "Totalt (inkl. moms)",
    "status.preview": "Forhandsvisning: betalning ar avstangd",
    "status.comingSoonTitle": "Kommer snart",
    "status.comingSoonBody": "Checkout forbereds just nu. Forsok igen senare."
  },
  no: {
    "step.location": "Velg sted",
    "step.products": "Produkter",
    "step.email": "Din e-post",
    "step.summary": "Ordresammendrag",
    "button.back": "Tilbake",
    "button.continue": "Fortsett",
    "button.pay": "Betal trygt",
    "label.email": "E-post",
    "label.location": "Sted",
    "label.product": "Produkt",
    "label.total": "Totalt (inkl. mva)",
    "status.preview": "Forhandsvisning: betaling er deaktivert",
    "status.comingSoonTitle": "Kommer snart",
    "status.comingSoonBody": "Checkout klargjores. Prov igjen senere."
  }
};

export function createTranslator(language: string | undefined): (key: string) => string {
  const lang: CheckoutLanguage = language === "sv" || language === "no" ? language : "da";
  return (key: string): string => strings[lang][key] ?? strings.da[key] ?? key;
}
