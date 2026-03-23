// engine/explain/buildTaxableIncomeExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  profit: number;
  zzpDeduction: number;
  mkbExemption: number;
  totalDeductions: number;
  capApplied: boolean;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for taxable income (Box 1).
 *
 * Taxable income here = profit − applied deductions (ZZP + MKB),
 * floored at 0.
 *
 * Fully aligned with engine rounding policy (rounding applied only for display).
 * No legal assertions about the cap mechanism (cap may be configurational).
 */
export function buildTaxableIncomeExplainable({
  profit,
  zzpDeduction,
  mkbExemption,
  totalDeductions,
  capApplied,
  rules,
}: Args): ExplainableAmount {
  const safe = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const profitRaw = safe(profit);
  const zzpRaw = Math.max(0, safe(zzpDeduction));
  const mkbRaw = Math.max(0, safe(mkbExemption));
  const totalDedRaw = Math.max(0, safe(totalDeductions));

  // Engine model: taxableIncome = max(0, profit - appliedTotal)
  const taxableIncomeRaw = Math.max(0, profitRaw - totalDedRaw);

  const explanation: string[] = [
    `Profit before deductions: €${round(profitRaw, rules).toFixed(2)}`,
  ];

  if (zzpRaw > 0) {
    explanation.push(
      `Entrepreneur deductions (zelfstandigenaftrek / startersaftrek): −€${round(
        zzpRaw,
        rules
      ).toFixed(2)}`
    );
  }

  if (mkbRaw > 0) {
    explanation.push(
      `MKB profit exemption (MKB-winstvrijstelling): −€${round(
        mkbRaw,
        rules
      ).toFixed(2)}`
    );
  }

  if (capApplied) {
    explanation.push(
      "Applied deductions were limited by the configured deduction cap in this calculation."
    );
  }

  explanation.push(
    `Total applied deductions: −€${round(totalDedRaw, rules).toFixed(2)}`,
    `Taxable income (Box 1): €${round(taxableIncomeRaw, rules).toFixed(2)}`
  );

  return {
    value: taxableIncomeRaw, // keep RAW; engine rounds later
    formula:
      "Taxable income (Box 1) = max(0, profit − applied deductions (ZZP + MKB))",
    inputs: {
      profit: profitRaw,
      zzpDeduction: zzpRaw,
      mkbExemption: mkbRaw,
      totalDeductions: totalDedRaw,
      taxableIncome: taxableIncomeRaw,
      capApplied: capApplied ? 1 : 0,
    },
    explanation,
  };
}

export default buildTaxableIncomeExplainable;