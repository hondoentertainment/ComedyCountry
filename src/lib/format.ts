/**
 * Format event price for display.
 * Returns "$X–$Y", "$X+", "Free", or null if no price data.
 */
export function formatEventPrice(
  priceMin: number | string | { toString: () => string } | null,
  priceMax: number | string | { toString: () => string } | null
): string | null {
  const min = priceMin != null ? Number(priceMin) : null;
  const max = priceMax != null ? Number(priceMax) : null;

  if (min == null && max == null) return null;
  if (min === 0 && (max === 0 || max == null)) return "Free";
  if (min != null && (max == null || max === min)) return `$${min}`;
  if (min != null && max != null) return `$${min}–$${max}`;
  if (min != null) return `$${min}+`;
  if (max != null) return `Up to $${max}`;
  return null;
}
