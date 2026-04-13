/** Round an ore/cents value to the nearest half krone (0.50 DKK). */
export const roundToHalfKrone = (priceInOre: number): number => {
  const dkk = priceInOre / 100;
  return Math.round(dkk * 2) / 2;
};

/** Format a price-inc-vat (ore) value as a Danish kroner string. */
export const formatPrice = (priceIncVatInOre: number): string =>
  new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(
    priceIncVatInOre / 100
  );
