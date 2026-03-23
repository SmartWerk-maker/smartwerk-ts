/**
 * TaxYear
 *
 * Supported tax years for the calculator.
 * Explicit union guarantees compile-time safety
 * and prevents usage of unsupported configurations.
 */

/**
 * IMPORTANT:
 * - Every TaxYear MUST have a matching config file
 *   e.g. config/nl/2026.ts
 */
export type TaxYear =
  | 2025
  | 2026;

/**
 * Single source of truth for supported years
 */
export const SUPPORTED_TAX_YEARS = [
  2025,
  2026,
] as const satisfies readonly TaxYear[];

/**
 * Runtime type guard
 */
export function isSupportedTaxYear(
  year: number
): year is TaxYear {
  return SUPPORTED_TAX_YEARS.includes(year as TaxYear);
}

/**
 * Helper: get latest supported year
 * (useful for defaults)
 */
export function getLatestTaxYear(): TaxYear {
  return SUPPORTED_TAX_YEARS[
    SUPPORTED_TAX_YEARS.length - 1
  ];
}