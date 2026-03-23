// engine/rounding.ts
import { TaxRules } from "../types/TaxRules";

/**
 * Centralized financial rounding helper.
 *
 * - No rounding during calculations
 * - Rounding applied only at final aggregation
 * - HALF_UP is Dutch fiscal default
 */
export function round(value: number, rules: TaxRules): number {
  if (!Number.isFinite(value)) return 0;

  const decimals =
    typeof rules.rounding.decimals === "number"
      ? rules.rounding.decimals
      : 2;

  const method = rules.rounding.method ?? "HALF_UP";

  const factor = 10 ** decimals;

  // Stabilize floating multiplication
  const scaled = Number((value * factor).toFixed(12));

  let rounded: number;

  switch (method) {
    case "FLOOR":
      rounded = Math.floor(scaled);
      break;

    case "CEIL":
      rounded = Math.ceil(scaled);
      break;

    case "HALF_UP":
    default:
      rounded =
        scaled >= 0
          ? Math.floor(scaled + 0.5)
          : Math.ceil(scaled - 0.5);
      break;
  }

  return rounded / factor;
}

export function roundCurrency(
  value: number,
  rules: TaxRules
): number {
  return round(value, rules);
}

export default round;