// engine/calcExpenses.ts
import { TaxInput } from "../types/TaxInput";

/**
 * calcExpenses
 *
 * Sums all declared business expenses.
 *
 * Rules:
 * - Defensive against undefined
 * - Ignores invalid values
 * - Never negative
 * - No rounding here
 */
export function calcExpenses(
  expenses: TaxInput["expenses"]
): number {
  if (!expenses || typeof expenses !== "object") {
    return 0;
  }

  let total = 0;

  for (const value of Object.values(expenses)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      if (value > 0) {
        total += value;
      }
    }
  }

  return total;
}

export default calcExpenses;