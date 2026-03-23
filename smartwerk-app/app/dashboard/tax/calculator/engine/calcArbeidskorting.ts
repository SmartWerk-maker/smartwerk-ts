// engine/calcArbeidskorting.ts
import { TaxRules } from "../types/TaxRules";

interface CalcArbeidskortingArgs {
  baseIncome: number;
  rules: TaxRules;
}

/**
 * Arbeidskorting (NL 2026 – Official marginal model)
 *
 * Fully marginal piecewise implementation.
 *
 * For each bracket:
 *  - rate → adds slice × rate
 *  - afbouwRate → subtracts slice × afbouwRate
 *  - fixedAmount → overrides total (used only for final zero bracket)
 *
 * No rounding inside brackets.
 * Final stabilization only.
 */
export function calcArbeidskorting({
  baseIncome,
  rules,
}: CalcArbeidskortingArgs): number {
  if (!rules.heffingskortingen.enabled) return 0;
  if (!Number.isFinite(baseIncome) || baseIncome <= 0) return 0;

  const brackets = rules.heffingskortingen.arbeids.brackets;

  let korting = 0;
  let previousUpper = 0;

  for (const bracket of brackets) {
    if (baseIncome <= previousUpper) break;

    const upper = bracket.upTo;

    const incomeInBracket =
      upper === Infinity
        ? baseIncome - previousUpper
        : Math.min(baseIncome, upper) - previousUpper;

    if (incomeInBracket <= 0) {
      previousUpper = upper;
      continue;
    }

    // Growth phase
    if ("rate" in bracket) {
      korting += incomeInBracket * bracket.rate;
    }

    // Reduction phase
    if ("afbouwRate" in bracket) {
      korting -= incomeInBracket * bracket.afbouwRate;
    }

    // Final override (only true top bracket)
    if ("fixedAmount" in bracket && upper === Infinity) {
      korting = bracket.fixedAmount;
    }

    previousUpper = upper;
  }

  /* =========================
     Floating stabilization
     ========================= */

  // Remove floating precision drift (e.g. 0.0000003)
  const stabilized = Math.round(korting * 100) / 100;

  return stabilized > 0 ? stabilized : 0;
}

export default calcArbeidskorting;