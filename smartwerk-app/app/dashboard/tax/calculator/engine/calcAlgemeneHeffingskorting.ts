// engine/calcAlgemeneHeffingskorting.ts
import { TaxRules } from "../types/TaxRules";

interface CalcAlgemeneHeffingskortingArgs {
  baseIncome: number;
  rules: TaxRules;
}

/**
 * Algemene heffingskorting (NL 2026 – Official)
 *
 * 1) income ≤ afbouwVanaf → max
 * 2) income > afbouwVanaf → max − (income − afbouwVanaf) × afbouwPercentage
 * 3) minimum = 0
 *
 * No rounding here.
 */
export function calcAlgemeneHeffingskorting({
  baseIncome,
  rules,
}: CalcAlgemeneHeffingskortingArgs): number {
  if (!rules.heffingskortingen.enabled) return 0;

  if (!Number.isFinite(baseIncome) || baseIncome <= 0) {
    return 0;
  }

  const config = rules.heffingskortingen.algemene;

  const max =
    typeof config.max === "number" && config.max > 0
      ? config.max
      : 0;

  const start =
    typeof config.afbouwVanaf === "number" &&
    config.afbouwVanaf >= 0
      ? config.afbouwVanaf
      : null;

  const rate =
    typeof config.afbouwPercentage === "number" &&
    config.afbouwPercentage > 0
      ? config.afbouwPercentage
      : 0;

  if (max === 0 || start === null) return 0;

  if (baseIncome <= start) {
    return max;
  }

  const reduction = (baseIncome - start) * rate;
  const korting = max - reduction;

  return korting > 0 ? korting : 0;
}

export default calcAlgemeneHeffingskorting;