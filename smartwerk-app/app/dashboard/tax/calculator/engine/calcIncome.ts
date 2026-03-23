// engine/calcIncome.ts
import { TaxInput } from "../types/TaxInput";

/**
 * calcIncome (NL engine-safe)
 *
 * Gross business income:
 * = hoursWorked × hourlyRate
 *
 * Guarantees:
 * - Never returns NaN
 * - Never returns negative
 * - No rounding
 * - No tax logic
 * - Fully deterministic
 */
export function calcIncome(input: TaxInput): number {
  const hours =
    Number.isFinite(input.hoursWorked) && input.hoursWorked > 0
      ? input.hoursWorked
      : 0;

  const rate =
    Number.isFinite(input.hourlyRate) && input.hourlyRate > 0
      ? input.hourlyRate
      : 0;

  const income = hours * rate;

  // Final safety clamp
  return Number.isFinite(income) && income > 0 ? income : 0;
}

export default calcIncome;