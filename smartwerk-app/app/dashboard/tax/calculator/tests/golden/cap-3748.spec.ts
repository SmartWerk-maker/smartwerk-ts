// tests/golden/cap-3748.spec.ts
import { describe, it, expect } from "vitest";

import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";
import { TaxRules } from "../../types/TaxRules";

describe("Golden — deduction cap mechanism", () => {

  it("caps total entrepreneur deductions at configured percentage", () => {

    const RULES_WITH_CAP: TaxRules = {
      ...NL_2026_RULES,
      caps: {
        maxDeductiblePercentageOfProfit: 0.3748,
      },
    };

    const input: TaxInput = {
      hoursWorked: 1300,
      hourlyRate: 20000 / 1300,

      expenses: {
        vehicle: 0,
        office: 0,
        internet: 0,
        marketing: 0,
        other: 0,
        extraBenefits: 0,
      },

      kvkRegistered: true,
      isStarter: true,
      btwRate: 0.21,
      korApplied: false,
    };

    const result = calculateTaxNL(input, RULES_WITH_CAP);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const profit = result.income.profit;
    expect(profit).toBe(20_000);

    const expectedCap = profit * 0.3748;

    // Cap must be applied
    expect(result.eligibility.capApplied).toBe(true);

    // Applied total must equal cap (within rounding)
    expect(result.deductions.appliedTotal)
      .toBeCloseTo(expectedCap, 2);

    // Deductions must never exceed cap
    expect(result.deductions.appliedTotal)
      .toBeLessThanOrEqual(expectedCap + 0.01);

    // Taxable income must equal profit − cap
    expect(result.taxableIncome)
      .toBeCloseTo(profit - expectedCap, 2);
  });

});