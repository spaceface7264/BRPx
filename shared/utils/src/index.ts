export const roundToHalfKrone = (priceInOre: number): number => {
  const dkk = priceInOre / 100;
  return Math.round(dkk * 2) / 2;
};
