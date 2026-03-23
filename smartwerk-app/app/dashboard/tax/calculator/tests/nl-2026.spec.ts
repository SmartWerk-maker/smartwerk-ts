// tests/nl-2026.spec.ts
import { describe, it, expect } from "vitest";

import { calculateTaxNL } from "../engine/calculateTaxNL";
import NL_2026_RULES from "../config/nl/2026";

import { TaxInput } from "../types/TaxInput";

/**
 * Golden smoke test — NL 2026 ZZP scenario
 *
 * Purpose:
 * - Verify full pipeline
 * - Verify architectural contracts
 * - Verify VAT isolation
 */
describe("Golden smoke test — NL 2026 ZZP scenario", () => {
  it("calculates a complete and internally consistent tax result", () => {
    const input: TaxInput = {
      hoursWorked: 1600,
      hourlyRate: 50,

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

      btwRate: 0.21,
      korApplied: false,

      meta: {
        year: 2026,
        period: "Q4",
        country: "NL",
        businessName: "Golden Test ZZP",
      },
    };

    const result = calculateTaxNL(input, NL_2026_RULES);

    expect(result.success).toBe(true);
    if (!result.success) return;

    /* Income */
    expect(result.income.gross).toBe(80_000);
    expect(result.income.expenses).toBe(8_000);
    expect(result.income.profit).toBe(72_000);

    /* Eligibility */
    expect(result.eligibility.zzp).toBe(true);
    expect(result.eligibility.capApplied).toBe(false);

    /* Deductions */
    expect(result.deductions.zzp).toBeGreaterThan(0);
    expect(result.deductions.mkb).toBeGreaterThan(0);

    expect(result.deductions.appliedTotal).toBeCloseTo(
      result.deductions.zzp + result.deductions.mkb,
      2
    );

    /* Taxable income */
    expect(result.taxableIncome).toBeGreaterThan(0);
    expect(result.taxableIncome).toBeLessThan(result.income.profit);

    /* Income tax & ZVW */
    expect(result.taxes.incomeTax).toBeGreaterThan(0);
    expect(result.taxes.zvw).toBeGreaterThan(0);

    expect(result.taxes.total).toBeCloseTo(
      result.taxes.incomeTax + result.taxes.zvw,
      2
    );

    /* VAT isolation */
    expect(result.vat.korApplied).toBe(false);
    expect(result.vat.salesExVat.total).toBe(80_000);

    expect(result.vat.payableVat).toBeCloseTo(
      result.vat.outputVat - result.vat.inputVat,
      2
    );

    /* VAT must NOT influence income tax */
    const taxWithoutVat = result.taxes.incomeTax + result.taxes.zvw;

    expect(result.taxes.total).toBeCloseTo(taxWithoutVat, 2);

    /* Net income */
    expect(result.netIncome).toBeCloseTo(
      result.income.gross -
        result.income.expenses -
        result.taxes.total,
      2
    );

    /* Net cash position (VAT included) */
    expect(result.netCashPosition).toBeCloseTo(
      result.netIncome - result.vat.payableVat,
      2
    );

    /* Explainability contract */
    expect(result.taxes.explainables.taxableIncome).toBeDefined();
    expect(result.taxes.explainables.incomeTax).toBeDefined();
    expect(result.taxes.explainables.taxCredits).toBeDefined();
    expect(result.taxes.explainables.zvw).toBeDefined();
    expect(result.taxes.explainables.vatPayable).toBeDefined();
    expect(result.taxes.explainables.netIncome).toBeDefined();
  });
});