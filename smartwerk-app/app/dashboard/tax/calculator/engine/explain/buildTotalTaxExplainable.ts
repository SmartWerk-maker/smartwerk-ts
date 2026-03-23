// engine/explain/buildTotalTaxExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  incomeTax: number;
  zvw: number;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for total income-related tax burden.
 *
 * Formula:
 *   Total tax = income tax (Box 1) + ZVW contribution
 *
 * VAT is excluded (settled separately).
 */
export function buildTotalTaxExplainable({
  incomeTax,
  zvw,
  rules,
}: Args): ExplainableAmount {
  const safe = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const incomeTaxRaw = safe(incomeTax);
  const zvwRaw = safe(zvw);
  const totalTaxRaw = incomeTaxRaw + zvwRaw;

  return {
    value: totalTaxRaw, // raw value
    formula:
      "Total income-related tax = income tax (Box 1) + ZVW contribution",

    inputs: {
      incomeTax: incomeTaxRaw,
      zvw: zvwRaw,
      totalTax: totalTaxRaw,
    },

    explanation: [
      `Income tax (Box 1): €${round(
        incomeTaxRaw,
        rules
      ).toFixed(2)}`,

      `ZVW contribution: €${round(
        zvwRaw,
        rules
      ).toFixed(2)}`,

      `Total income-related tax: €${round(
        totalTaxRaw,
        rules
      ).toFixed(2)}`,

      "VAT (BTW) is excluded because it is settled separately via the VAT return.",
    ],
  };
}

export default buildTotalTaxExplainable;