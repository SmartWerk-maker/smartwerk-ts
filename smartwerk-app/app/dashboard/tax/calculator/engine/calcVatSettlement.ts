// engine/calcVatSettlement.ts
import { TaxInput } from "../types/TaxInput";
import { TaxRules } from "../types/TaxRules";

export type VatRateKey = "standard" | "reduced" | "zero";

export interface VatSettlementArgs {
  input: TaxInput;
  rules: TaxRules;
  fallbackTurnoverExVat?: number;
}

export interface VatSettlementResult {
  period?: "Q1" | "Q2" | "Q3" | "Q4";
  korApplied: boolean;
  salesExVat: {
    standard: number;
    reduced: number;
    zero: number;
    total: number;
  };
  outputVat: number;
  inputVat: number;
  payableVat: number;
}

/**
 * VAT / BTW settlement (Netherlands – accountant-grade)
 *
 * - All sales are EXCLUDING VAT
 * - Output VAT = Σ(base × rate)
 * - Input VAT = deductible VAT
 * - Payable VAT = output − input (may be negative)
 * - KOR affects ONLY payableVat
 *
 * No rounding here.
 */
export function calcVatSettlement({
  input,
  rules,
  fallbackTurnoverExVat,
}: VatSettlementArgs): VatSettlementResult {

  const vat = input.vat;

  const period: VatSettlementResult["period"] =
    vat?.period ?? input.meta?.period;

  const safeNum = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, v)
      : 0;

  /* =========================
     1️⃣ Determine sales bases
  ========================= */

  let standard = 0;
  let reduced = 0;
  let zero = 0;

  const hasBucketMode =
  typeof vat?.salesExVat === "object" &&
  vat?.salesExVat !== null &&
  (
    safeNum(vat.salesExVat.standard) > 0 ||
    safeNum(vat.salesExVat.reduced) > 0 ||
    safeNum(vat.salesExVat.zero) > 0
  );

  const hasQuickMode =
    !hasBucketMode &&
    typeof vat?.turnoverExVat === "number";

  if (hasBucketMode) {
    standard = safeNum(vat?.salesExVat?.standard);
    reduced = safeNum(vat?.salesExVat?.reduced);
    zero = safeNum(vat?.salesExVat?.zero);
  } else if (hasQuickMode) {
    const base = safeNum(vat?.turnoverExVat);

    if (input.btwRate === rules.btw.rates.reduced) {
      reduced = base;
    } else if (input.btwRate === rules.btw.rates.zero) {
      zero = base;
    } else {
      standard = base;
    }
  }else {
  const fallback = safeNum(fallbackTurnoverExVat);

  if (fallback > 0) {
    if (input.btwRate === rules.btw.rates.reduced) {
      reduced = fallback;
    } else if (input.btwRate === rules.btw.rates.zero) {
      zero = fallback;
    } else {
      standard = fallback;
    }
  }
}

  const totalSales = standard + reduced + zero;

  /* =========================
     2️⃣ Output VAT
  ========================= */

  const outputVat =
    standard * rules.btw.rates.standard +
    reduced * rules.btw.rates.reduced +
    zero * rules.btw.rates.zero;

  /* =========================
     3️⃣ Input VAT
  ========================= */

  const inputVat = safeNum(vat?.inputVatDeductible);

  /* =========================
     4️⃣ KOR applicability
  ========================= */

  const korRequested =
    Boolean(input.korApplied) &&
    Boolean(rules.btw.kor.enabled);

  const threshold =
    Number.isFinite(rules.btw.kor.turnoverThreshold)
      ? rules.btw.kor.turnoverThreshold
      : Number.MAX_SAFE_INTEGER;

  const korApplied =
    korRequested && totalSales <= threshold;

  /* =========================
     5️⃣ Payable VAT
  ========================= */

  const calculatedPayable = outputVat - inputVat;

  const payableVat = korApplied
    ? safeNum(rules.btw.kor.vatAmount)
    : calculatedPayable;

  return {
    period,
    korApplied,
    salesExVat: {
      standard,
      reduced,
      zero,
      total: totalSales,
    },
    outputVat,
    inputVat,
    payableVat,
  };
}

export default calcVatSettlement;