// tests/golden/zzp-mid-income.spec.ts
import { describe, it, expect } from "vitest";

import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe("Golden — ZZP mid income (NL 2026)", () => {
  it("applies ZZP + MKB correctly without triggering deduction cap", () => {

    const hoursWorked = 1600;
    const grossIncome = 80_000;
    const hourlyRate = grossIncome / hoursWorked;

    const input: TaxInput = {
      hoursWorked,
      hourlyRate,

      expenses: {
        vehicle: 3000,
        office: 2000,
        internet: 600,
        marketing: 1200,
        other: 400,
        extraBenefits: 800,
      },

      kvkRegistered: true,
      isStarter: true,

      korApplied: false,
      btwRate: 0.21,
    };

    const result = calculateTaxNL(input, NL_2026_RULES);

    expect(result.success).toBe(true);
    if (!result.success) return;

    /* Income */

    expect(result.income.gross).toBe(80_000);
    expect(result.income.profit).toBe(72_000);

    /* Eligibility */

    expect(result.eligibility.zzp).toBe(true);
    expect(result.eligibility.capApplied).toBe(false);

    /* Deductions */

    expect(result.deductions.zzp).toBeGreaterThan(0);
    expect(result.deductions.mkb).toBeGreaterThan(0);

    expect(result.deductions.appliedTotal)
      .toBeCloseTo(
        result.deductions.zzp + result.deductions.mkb,
        2
      );

    expect(result.deductions.appliedTotal)
      .toBeLessThanOrEqual(result.income.profit);

    /* Taxable income */

    expect(result.taxableIncome)
      .toBeLessThan(result.income.profit);

    /* Income tax */

    expect(result.taxes.incomeTax)
      .toBeGreaterThan(0);

    /* VAT */

    expect(result.vat.korApplied).toBe(false);
    expect(result.vat.outputVat).toBeGreaterThan(0);

    /* Net income positive */

    expect(result.netIncome)
      .toBeGreaterThan(0);
  });
});