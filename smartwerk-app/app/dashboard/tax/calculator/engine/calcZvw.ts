// engine/calcZvw.ts
import { TaxRules } from "../types/TaxRules";

type CalcZvwArgs = {
  taxableIncome: number;
  rules: TaxRules;
};

/**
 * Zvw (NL 2026 – Official)
 *
 * bijdrage = min(bijdrage-inkomen, maxBase) × rate
 *
 * No rounding here.
 */
export function calcZvw({
  taxableIncome,
  rules,
}: CalcZvwArgs): number {
  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) {
    return 0;
  }

  const { rate, maxBase } = rules.zvw;

  if (
    typeof rate !== "number" ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return 0;
  }

  const base =
    typeof maxBase === "number" &&
    Number.isFinite(maxBase) &&
    maxBase > 0
      ? Math.min(taxableIncome, maxBase)
      : taxableIncome;

  const result = base * rate;

  return result > 0 && Number.isFinite(result)
    ? result
    : 0;
}

export default calcZvw;