// engine/explain/buildNetIncomeExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  grossIncome: number;
  expenses: number;
  incomeTax: number;
  zvw: number;
  rules: TaxRules;
}

/**
 * Accountant-grade explanation for net income (excl. VAT).
 *
 * Fully aligned with engine rounding policy.
 * VAT excluded intentionally (settled separately).
 */
export function buildNetIncomeExplainable({
  grossIncome,
  expenses,
  incomeTax,
  zvw,
  rules,
}: Args): ExplainableAmount {
  const profitRaw = grossIncome - expenses;
  const totalTaxRaw = incomeTax + zvw;
  const netIncomeRaw = profitRaw - totalTaxRaw;

  const profit = round(profitRaw, rules);
  const totalTax = round(totalTaxRaw, rules);
  const netIncome = round(netIncomeRaw, rules);

  return {
    value: netIncomeRaw, // IMPORTANT: raw value for consistency
    formula:
      "Net income = (gross income − business expenses) − (income tax + ZVW)",

    inputs: {
      grossIncome,
      expenses,
      profit: profitRaw,
      incomeTax,
      zvw,
      totalTax: totalTaxRaw,
    },

    explanation: [
      `Gross income: €${round(grossIncome, rules).toFixed(2)}`,
      `Business expenses: −€${round(expenses, rules).toFixed(2)}`,
      `Profit (winst): €${profit.toFixed(2)}`,
      `Income tax: −€${round(incomeTax, rules).toFixed(2)}`,
      `ZVW contribution: −€${round(zvw, rules).toFixed(2)}`,
      `Total tax burden: −€${totalTax.toFixed(2)}`,
      `Net income after tax (excl. VAT): €${netIncome.toFixed(2)}`,
      `VAT is excluded because it is settled separately via the VAT return.`,
    ],
  };
}