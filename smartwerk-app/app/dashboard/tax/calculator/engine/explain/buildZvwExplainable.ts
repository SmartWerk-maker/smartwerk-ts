// engine/explain/buildZvwExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  taxableIncome: number;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for ZVW contribution (Netherlands).
 *
 * Formula:
 *   ZVW = rate × min(taxableIncome, maxBase)
 *
 * Fully aligned with calcZvw logic.
 */
export function buildZvwExplainable({
  taxableIncome,
  rules,
}: Args): ExplainableAmount {
  const explanation: string[] = [];
  const inputs: Record<string, number> = {
    taxableIncome,
  };

  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) {
    explanation.push(
      "No contribution income → no ZVW contribution due."
    );

    return {
      value: 0,
      formula: "ZVW = rate × min(taxable income, max base)",
      inputs,
      explanation,
    };
  }

  const rate =
    typeof rules?.zvw?.rate === "number" &&
    Number.isFinite(rules.zvw.rate) &&
    rules.zvw.rate > 0
      ? rules.zvw.rate
      : 0;

  const maxBase =
    typeof rules?.zvw?.maxBase === "number" &&
    Number.isFinite(rules.zvw.maxBase) &&
    rules.zvw.maxBase > 0
      ? rules.zvw.maxBase
      : undefined;

  if (rate === 0) {
    explanation.push(
      "ZVW rate not configured → no contribution calculated."
    );

    return {
      value: 0,
      formula: "ZVW = rate × min(taxable income, max base)",
      inputs,
      explanation,
    };
  }

  const contributionBase =
    maxBase != null
      ? Math.min(taxableIncome, maxBase)
      : taxableIncome;

  const contribution = contributionBase * rate;

  explanation.push(
    `Taxable income (Box 1): €${round(
      taxableIncome,
      rules
    ).toFixed(2)}`
  );

  if (maxBase != null) {
    explanation.push(
      `ZVW maximum contribution base: €${round(
        maxBase,
        rules
      ).toFixed(2)}`,
      contributionBase < taxableIncome
        ? "Taxable income exceeds the ZVW maximum base."
        : "Taxable income is below the ZVW maximum base."
    );

    inputs.maxBase = maxBase;
  } else {
    explanation.push(
      "No maximum contribution base applies for this tax year."
    );
  }

  explanation.push(
    `ZVW base used: €${round(
      contributionBase,
      rules
    ).toFixed(2)}`,
    `ZVW rate: ${(rate * 100).toFixed(2)}%`,
    `ZVW contribution: €${round(
      contribution,
      rules
    ).toFixed(2)}`
  );

  inputs.zvwBase = contributionBase;
  inputs.rate = rate;

  return {
    value: contribution, // raw value
    formula: "ZVW = rate × min(taxable income, max base)",
    inputs,
    explanation,
  };
}

export default buildZvwExplainable;