// engine/calcIncomeTax.ts
import { TaxRules } from "../types/TaxRules";

type CalcIncomeTaxArgs = {
  taxableIncome: number;
  rules: TaxRules;
};

/**
 * calcIncomeTax (NL – Box 1 progressive marginal)
 *
 * Fully marginal implementation.
 * No rounding.
 */
export function calcIncomeTax({
  taxableIncome,
  rules,
}: CalcIncomeTaxArgs): number {
  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) {
    return 0;
  }

  const brackets = [...rules.incomeTax.brackets]
    .filter(b => Number.isFinite(b.rate) && b.rate >= 0)
    .sort((a, b) => {
      if (a.upTo === Infinity) return 1;
      if (b.upTo === Infinity) return -1;
      return a.upTo - b.upTo;
    });

  let tax = 0;
  let previousUpper = 0;

  for (const bracket of brackets) {
    if (previousUpper >= taxableIncome) break;

    const upper = bracket.upTo;

    const sliceUpper =
      upper === Infinity
        ? taxableIncome
        : Math.min(taxableIncome, upper);

    const slice = sliceUpper - previousUpper;

    if (slice > 0) {
      tax += slice * bracket.rate;
      previousUpper = sliceUpper; // <-- safer than assigning Infinity
    } else {
      previousUpper = sliceUpper;
    }
  }

  return tax > 0 && Number.isFinite(tax) ? tax : 0;
}

export default calcIncomeTax;