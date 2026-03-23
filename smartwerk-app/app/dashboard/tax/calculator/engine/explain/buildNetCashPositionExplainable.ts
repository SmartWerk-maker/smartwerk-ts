// engine/explain/buildNetCashPositionExplainable.ts
import { ExplainableAmount } from "../../types/explanationTypes";
import { TaxRules } from "../../types/TaxRules";
import { round } from "../rounding";

interface Args {
  netIncome: number;      // excl. VAT
  payableVat: number;     // >0 payable, <0 receivable
  rules: TaxRules;
}

/**
 * Net cash position (after VAT settlement)
 *
 * netCashPosition = netIncome − payableVat
 *
 * Notes:
 * - If payableVat > 0 → cash decreases (you pay VAT)
 * - If payableVat < 0 → cash increases (VAT refund)
 */
export function buildNetCashPositionExplainable({
  netIncome,
  payableVat,
  rules,
}: Args): ExplainableAmount {
  const safe = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const ni = safe(netIncome);
  const vat = safe(payableVat);

  const netCashPosition = ni - vat;

  const dNetIncome = round(ni, rules);
  const dVat = round(vat, rules);
  const dNetCash = round(netCashPosition, rules);

  return {
    value: netCashPosition,
    formula: "Net cash position = net income − VAT payable",
    inputs: {
      netIncome: ni,
      payableVat: vat,
      netCashPosition,
    },
    explanation: [
      `Net income (excl. VAT): €${dNetIncome.toFixed(2)}`,
      vat >= 0
        ? `VAT payable: −€${dVat.toFixed(2)}`
        : `VAT receivable: +€${Math.abs(dVat).toFixed(2)}`,
      `Net cash position: €${dNetCash.toFixed(2)}`,
      "Net cash position shows cash impact after settling VAT (BTW).",
    ],
  };
}

export default buildNetCashPositionExplainable;