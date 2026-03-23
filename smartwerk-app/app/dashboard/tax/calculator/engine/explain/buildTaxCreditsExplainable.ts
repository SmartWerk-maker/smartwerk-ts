// engine/explain/buildTaxCreditsExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  algemene: number;
  arbeids: number;
  total: number;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for Dutch tax credits (heffingskortingen).
 *
 * - Tax credits reduce income tax directly.
 * - They are NOT income deductions.
 * - They cannot reduce income tax below zero.
 * - Rounding aligned with engine policy.
 */
export function buildTaxCreditsExplainable({
  algemene,
  arbeids,
  total,
  rules,
}: Args): ExplainableAmount {
  const safe = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const algemeneRaw = safe(algemene);
  const arbeidsRaw = safe(arbeids);
  const totalRaw = safe(total);

  return {
    value: totalRaw, // raw value for internal consistency
    formula: "Total tax credits = algemene heffingskorting + arbeidskorting",

    inputs: {
      algemene: algemeneRaw,
      arbeids: arbeidsRaw,
      total: totalRaw,
    },

    explanation: [
      `Algemene heffingskorting: €${round(
        algemeneRaw,
        rules
      ).toFixed(2)}`,

      `Arbeidskorting: €${round(
        arbeidsRaw,
        rules
      ).toFixed(2)}`,

      `Total tax credits applied: €${round(
        totalRaw,
        rules
      ).toFixed(2)}`,

      "Tax credits reduce the calculated income tax directly.",
      "They are applied after computing income tax based on progressive brackets.",
      "Tax credits cannot reduce income tax below €0.",
    ],
  };
}

export default buildTaxCreditsExplainable;