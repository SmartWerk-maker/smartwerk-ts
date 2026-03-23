// engine/explain/buildIncomeTaxExplainable.ts
import { TaxRules } from "../../types/TaxRules";
import { ExplainableAmount } from "../../types/explanationTypes";
import { round } from "../rounding";

interface Args {
  taxableIncome: number;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for Dutch Box 1 income tax.
 *
 * Fully aligned with calcIncomeTax logic.
 * Respects rounding policy.
 */
export function buildIncomeTaxExplainable({
  taxableIncome,
  rules,
}: Args): ExplainableAmount {
  const explanation: string[] = [];
  const inputs: Record<string, number> = {
    taxableIncome,
  };

  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) {
    explanation.push(
      "No taxable income → no income tax due."
    );

    return {
      value: 0,
      formula: "Progressive income tax brackets (Box 1)",
      inputs,
      explanation,
    };
  }

  const brackets = [...rules.incomeTax.brackets].sort((a, b) => {
    if (a.upTo === Infinity) return 1;
    if (b.upTo === Infinity) return -1;
    return a.upTo - b.upTo;
  });

  let tax = 0;
  let previousUpper = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];

    if (previousUpper >= taxableIncome) break;

    const upper = bracket.upTo;
    const sliceUpper =
      upper === Infinity
        ? taxableIncome
        : Math.min(taxableIncome, upper);

    const slice = sliceUpper - previousUpper;

    if (slice > 0) {
      const taxForBracket = slice * bracket.rate;
      tax += taxForBracket;

      explanation.push(
        `Schijf ${i + 1}: €${round(slice, rules).toFixed(
          2
        )} × ${(bracket.rate * 100).toFixed(
          2
        )}% = €${round(taxForBracket, rules).toFixed(2)}`
      );

      inputs[`bracket_${i + 1}_base`] = slice;
      inputs[`bracket_${i + 1}_rate`] = bracket.rate;
    }

    previousUpper = upper;
  }

  explanation.push(
    `Total income tax before tax credits: €${round(
      tax,
      rules
    ).toFixed(2)}`
  );

  return {
    value: tax,
    formula: "Progressive income tax brackets (Box 1)",
    inputs,
    explanation,
  };
}