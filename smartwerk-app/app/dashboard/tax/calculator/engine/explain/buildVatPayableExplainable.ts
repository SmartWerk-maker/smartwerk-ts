// engine/explain/buildVatPayableExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { VatResult } from "../../types/TaxResult";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  vat: VatResult;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for VAT payable / receivable.
 *
 * - VAT is settled separately from income tax.
 * - VAT does not affect Box 1 taxable income.
 * - Rounding aligned with engine policy.
 */
export function buildVatPayableExplainable({
  vat,
  rules,
}: Args): ExplainableAmount {
  const safe = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const outputVat = safe(vat.outputVat);
  const inputVat = safe(vat.inputVat);
  const payableVat = safe(vat.payableVat);
  const korApplied = Boolean(vat.korApplied);

  if (korApplied) {
    return {
      value: payableVat,
      formula: "VAT payable = configured KOR amount",
      inputs: {
        outputVat,
        inputVat,
        korApplied: 1,
      },
      explanation: [
        "The Small Business Scheme (KOR) is applied.",
       "Under KOR, no VAT is charged and no input VAT is deductible.",
        "VAT payable is therefore €0.",
        "Output VAT and input VAT are shown for reference only.",
        `Output VAT (reference): €${round(outputVat, rules).toFixed(2)}`,
        `Input VAT (reference): €${round(inputVat, rules).toFixed(2)}`,
        `VAT payable under KOR: €${round(payableVat, rules).toFixed(2)}`,
      ],
    };
  }

  const displayOutput = round(outputVat, rules);
  const displayInput = round(inputVat, rules);
  const displayPayable = round(payableVat, rules);

  return {
    value: payableVat, // raw value
    formula: "VAT payable = output VAT − input VAT",
    inputs: {
      outputVat,
      inputVat,
      payableVat,
    },
    explanation: [
      `Output VAT charged on sales: €${displayOutput.toFixed(2)}`,
      `Input VAT deductible (voorbelasting): −€${displayInput.toFixed(2)}`,
      payableVat >= 0
        ? `VAT payable to Belastingdienst: €${displayPayable.toFixed(2)}`
        : `VAT receivable from Belastingdienst: €${Math.abs(
            displayPayable
          ).toFixed(2)}`,
      "VAT is settled separately via the VAT return.",
      "VAT does not affect income tax or ZVW.",
    ],
  };
}

export default buildVatPayableExplainable;