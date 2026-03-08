/**
 * Money helpers — all monetary values stored as integer cents to avoid
 * floating-point precision errors. E.g., $10.50 = 1050 cents.
 */

export const CENTS_PER_DOLLAR = 100;

/** Convert a dollar amount to integer cents */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

/** Convert integer cents to a formatted dollar string (display only) */
export function centsToDisplayDollars(cents: number): string {
  return (cents / CENTS_PER_DOLLAR).toFixed(2);
}

/**
 * Calculate service fee from subtotal using basis points.
 * Basis points avoid floating-point: 1000 bp = 10.00%.
 */
export function calculateServiceFee(
  subtotalCents: number,
  feeBasisPoints: number,
): number {
  return Math.round((subtotalCents * feeBasisPoints) / 10000);
}
