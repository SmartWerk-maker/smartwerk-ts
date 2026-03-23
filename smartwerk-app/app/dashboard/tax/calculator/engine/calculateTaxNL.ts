// engine/calculateTaxNL.ts
import { TaxInput } from "../types/TaxInput";
import { TaxResult } from "../types/TaxResult";
import { TaxRules } from "../types/TaxRules";

import { calcIncome } from "./calcIncome";
import { calcExpenses } from "./calcExpenses";
import { calcDeductions } from "./calcDeductions";
import { calcMKB } from "./calcMKB";
import { calcIncomeTax } from "./calcIncomeTax";
import { calcZvw } from "./calcZvw";
import { calcVatSettlement } from "./calcVatSettlement";
import { round } from "./rounding";
import { validateTaxInput } from "./validate";
import { calcTotalKortingen } from "./calcTotalKortingen";

import { TaxWarning } from "../modules/domain/warnings";
import { isZzpEligible } from "../modules/domain/eligibility";
import { applyDeductionCap } from "../modules/domain/caps";

import { buildIncomeTaxExplainable } from "./explain/buildIncomeTaxExplainable";
import { buildNetIncomeExplainable } from "./explain/buildNetIncomeExplainable";
import { buildVatPayableExplainable } from "./explain/buildVatPayableExplainable";
import { buildTaxableIncomeExplainable } from "./explain/buildTaxableIncomeExplainable";
import { buildZvwExplainable } from "./explain/buildZvwExplainable";
import { buildTotalTaxExplainable } from "./explain/buildTotalTaxExplainable";
import { buildTaxCreditsExplainable } from "./explain/buildTaxCreditsExplainable";
import { buildNetCashPositionExplainable } from "./explain/buildNetCashPositionExplainable";

export function calculateTaxNL(input: TaxInput, rules: TaxRules): TaxResult {
  /* =========================
     1. Validation
  ========================= */
  const { errors, warnings: baseWarnings } = validateTaxInput(input);

  if (errors.length > 0) {
    return {
      success: false,
      meta: rules.meta,
      errors,
      warnings: baseWarnings ?? [],
      inputSnapshot: buildInputSnapshot(input),
    };
  }

  const warnings: TaxWarning[] = [...(baseWarnings ?? [])];

  /* =========================
     2. Income & expenses
  ========================= */
  const grossIncome = calcIncome(input);
  const totalExpenses = calcExpenses(input.expenses);
  const profit = grossIncome - totalExpenses;

  /* =========================
     3. ZZP eligibility (domain)
  ========================= */
  const zzpEligibility = isZzpEligible({
    kvkRegistered: input.kvkRegistered,
    hoursWorked: input.hoursWorked,
    requiredHours: rules.zzp.zelfstandigenaftrek.requiresHours,
  });

  const zzpEligible = zzpEligibility.eligible;

  if (!zzpEligible) {
    if (!zzpEligibility.checks.hoursRequirementMet) {
      warnings.push({
        code: "LOW_HOURS_NO_ZZP",
        level: "info",
      });
    }

    if (!zzpEligibility.checks.kvkRegistered) {
      warnings.push({
        code: "NO_KVK_NO_DEDUCTIONS",
        level: "warning",
      });
    }
  }

  /* =========================
     4. ZZP deductions (requested)
  ========================= */
  const zzp = calcDeductions({
    profit,
    rules,
    zzpEligibility,
    isStarter: input.isStarter,
  });

  /* =========================
     5. MKB vrijstelling (requested)
  ========================= */
  const mkb = calcMKB({
    taxableAfterZzp: zzp.taxableAfterZzp,
    rules,
    isZzpEligible: zzpEligible,
  });

  /* =========================
     6. Deduction cap
  ========================= */
  const requestedTotal = zzp.zzpDeductionRequested + mkb.mkbRequested;

  const capResult = applyDeductionCap(
    Math.max(0, profit),
    requestedTotal,
    rules.caps.maxDeductiblePercentageOfProfit
  );

  const capApplied = capResult.applied;

  if (capApplied) {
    warnings.push({
      code: "DEDUCTION_CAP_APPLIED",
      level: "info",
      meta: { maxAllowed: capResult.maxAllowed, requestedTotal },
    });
  }

  const appliedZzp = capApplied
    ? Math.min(zzp.zzpDeductionRequested, capResult.maxAllowed)
    : zzp.zzpDeductionRequested;

  const remainingCap = capApplied
    ? Math.max(0, capResult.maxAllowed - appliedZzp)
    : Infinity;

  const appliedMkb = capApplied
    ? Math.min(mkb.mkbRequested, remainingCap)
    : mkb.mkbRequested;

  const appliedTotal = appliedZzp + appliedMkb;

  /* =========================
     7. Taxable income
  ========================= */
  const taxableIncome = Math.max(0, profit - appliedTotal);

  /* =========================
     8. Income tax & credits
  ========================= */
  const incomeTaxRaw = calcIncomeTax({ taxableIncome, rules });

  const kortingen = calcTotalKortingen({
    taxableIncome,
    grossIncome,
    incomeTaxRaw,
    rules,
  });

  const incomeTax = Math.max(0, incomeTaxRaw - kortingen.total);

  const incomeTaxExplainable = buildIncomeTaxExplainable({ taxableIncome, rules });
  incomeTaxExplainable.explanation.push(
  `Tax credits applied: −€${round(kortingen.total, rules).toFixed(2)}`,
  `Final income tax payable: €${round(incomeTax, rules).toFixed(2)}`
);

  const taxableIncomeExplainable = buildTaxableIncomeExplainable({
    profit,
    zzpDeduction: appliedZzp,
    mkbExemption: appliedMkb,
    totalDeductions: appliedTotal,
    capApplied,
    rules,
  });

  /* =========================
     9. ZVW
  ========================= */
  const zvw = calcZvw({ taxableIncome, rules });

  const zvwExplainable = buildZvwExplainable({
    taxableIncome,
    rules,
  });

  /* =========================
     10. VAT settlement
  ========================= */
  const vat = calcVatSettlement({
    input,
    rules,
    fallbackTurnoverExVat: grossIncome,
  });

  const vatPayableExplainable = buildVatPayableExplainable({ 
  vat,
  rules });

  // KOR requested but not applied due to threshold
  if (input.korApplied && rules.btw.kor.enabled) {
    const threshold = rules.btw.kor.turnoverThreshold ?? Infinity;
    const turnover = vat.salesExVat.total;

    if (!vat.korApplied && turnover > threshold) {
      warnings.push({
        code: "KOR_THRESHOLD_EXCEEDED",
        level: "warning",
        meta: { threshold, turnover },
      });
    }
  }

  /* =========================
     11. Totals
  ========================= */
  const totalTax = incomeTax + zvw;
  const netIncome = grossIncome - totalExpenses - totalTax;
  const netCashPosition = netIncome - vat.payableVat;

  const netCashPositionExplainable = buildNetCashPositionExplainable({
  netIncome,
  payableVat: vat.payableVat,
  rules,
});

  const netIncomeExplainable = buildNetIncomeExplainable({
    grossIncome,
    expenses: totalExpenses,
    incomeTax,
    zvw,
    rules,
  });

  const totalTaxExplainable = buildTotalTaxExplainable({
    incomeTax,
    zvw,
    rules,
  });

  const taxCreditsExplainable = buildTaxCreditsExplainable({
    algemene: kortingen.algemene,
    arbeids: kortingen.arbeids,
    total: kortingen.total,
     rules,
  });

  /* =========================
     12. Result
  ========================= */
  return {
    success: true,
    meta: rules.meta,
    warnings,

    inputSnapshot: buildInputSnapshot(input),

    income: {
      gross: round(grossIncome, rules),
      expenses: round(totalExpenses, rules),
      profit: round(profit, rules),
    },

    netCashPosition: round(netCashPosition, rules),

    eligibility: {
      zzp: zzpEligible,
      capApplied,
    },

    deductions: {
      zzp: round(appliedZzp, rules),
      mkb: round(appliedMkb, rules),
      appliedTotal: round(appliedTotal, rules),
    },

    taxableIncome: round(taxableIncome, rules),

    taxes: {
      incomeTax: round(incomeTax, rules),
      zvw: round(zvw, rules),
      total: round(totalTax, rules),

      explainables: {
        taxableIncome: taxableIncomeExplainable,
        incomeTax: incomeTaxExplainable,
        taxCredits: taxCreditsExplainable,
        zvw: zvwExplainable,
        totalTax: totalTaxExplainable,
        vatPayable: vatPayableExplainable,
        netIncome: netIncomeExplainable,
        netCashPosition: netCashPositionExplainable,
      },

      kortingen: {
        algemene: round(kortingen.algemene, rules),
        arbeids: round(kortingen.arbeids, rules),
        total: round(kortingen.total, rules),
      },
    },

    vat: {
      period: vat.period,
      korApplied: vat.korApplied,
      outputVat: round(vat.outputVat, rules),
      inputVat: round(vat.inputVat, rules),
      payableVat: round(vat.payableVat, rules),
      salesExVat: {
        standard: round(vat.salesExVat.standard, rules),
        reduced: round(vat.salesExVat.reduced, rules),
        zero: round(vat.salesExVat.zero, rules),
        total: round(vat.salesExVat.total, rules),
      },
    },

    netIncome: round(netIncome, rules),
  };
}

function buildInputSnapshot(input: TaxInput) {
  return {
    hoursWorked: input.hoursWorked,
    hourlyRate: input.hourlyRate,
    kvkRegistered: input.kvkRegistered,
    isStarter: input.isStarter,
    korApplied: input.korApplied,
    btwRate: input.btwRate,
    meta: input.meta ?? {},
    vat: input.vat,
  };
}