// tests/golden/zzp-low-income.spec.ts
import { describe, it, expect } from "vitest";

import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe("Golden — ZZP low income (NL 2026)", () => {
  it("applies ZZP + MKB correctly at low income without cap", () => {

    const hoursWorked = 1400;
    const grossIncome = 14_000;
    const hourlyRate = grossIncome / hoursWorked;

    const input: TaxInput = {
      hoursWorked,
      hourlyRate,

      expenses: {
        vehicle: 1_000,
        office: 0,
        internet: 0,
        marketing: 0,
        other: 0,
        extraBenefits: 0,
      },

      kvkRegistered: true,
      isStarter: true,
      korApplied: true,
      btwRate: 0,
    };

    const result = calculateTaxNL(input, NL_2026_RULES);

    expect(result.success).toBe(true);
    if (!result.success) return;

    /* Income */

    expect(result.income.gross).toBeCloseTo(14_000, 2);
    expect(result.income.profit).toBeCloseTo(13_000, 2);

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

    /* Income tax must not be negative */

    expect(result.taxes.incomeTax)
      .toBeGreaterThanOrEqual(0);

    /* VAT (KOR) */

    expect(result.vat.korApplied).toBe(true);
    expect(result.vat.payableVat).toBe(0);

    /* Net income positive */

    expect(result.netIncome).toBeGreaterThan(0);
  });
});