const ghanaCediFormatter = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format every displayed monetary amount consistently in Ghana cedis. */
export function formatGhc(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `GH₵${ghanaCediFormatter.format(safeAmount)}`;
}
