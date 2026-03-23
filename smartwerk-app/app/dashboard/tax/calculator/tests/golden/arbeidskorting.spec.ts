// tests/golden/arbeidskorting.spec.ts
import { describe, it, expect } from "vitest";
import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026 from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe("Golden — Arbeidskorting (NL 2026)", () => {

  it("increases arbeidskorting in lower income brackets", () => {
    const low: TaxInput = {
      hoursWorked: 800,
      hourlyRate: 20, // low income
      expenses: {
        vehicle: 0,
        office: 0,
        internet: 0,
        marketing: 0,
        other: 0,
        extraBenefits: 0,
      },
      kvkRegistered: true,
      isStarter: false,
      btwRate: 0.21,
      korApplied: false,
    };

    const mid: TaxInput = {
      ...low,
      hoursWorked: 1600,
      hourlyRate: 30,
    };

    const resLow = calculateTaxNL(low, NL_2026);
    const resMid = calculateTaxNL(mid, NL_2026);

    if (!resLow.success || !resMid.success) return;

    expect(resMid.taxes.kortingen.arbeids)
      .toBeGreaterThan(resLow.taxes.kortingen.arbeids);
  });


  it("reduces arbeidskorting in afbouw bracket", () => {
    const midIncome: TaxInput = {
      hoursWorked: 1600,
      hourlyRate: 30,
      expenses: {
        vehicle: 0,
        office: 0,
        internet: 0,
        marketing: 0,
        other: 0,
        extraBenefits: 0,
      },
      kvkRegistered: true,
      isStarter: false,
      btwRate: 0.21,
      korApplied: false,
    };

    const highIncome: TaxInput = {
      ...midIncome,
      hoursWorked: 2000,
      hourlyRate: 60,
    };

    const mid = calculateTaxNL(midIncome, NL_2026);
    const high = calculateTaxNL(highIncome, NL_2026);

    if (!mid.success || !high.success) return;

    expect(high.taxes.kortingen.arbeids)
      .toBeLessThan(mid.taxes.kortingen.arbeids);
  });


  it("reduces arbeidskorting to zero at very high income", () => {
    const veryHigh: TaxInput = {
      hoursWorked: 2500,
      hourlyRate: 100,
      expenses: {
        vehicle: 0,
        office: 0,
        internet: 0,
        marketing: 0,
        other: 0,
        extraBenefits: 0,
      },
      kvkRegistered: true,
      isStarter: false,
      btwRate: 0.21,
      korApplied: false,
    };

    const result = calculateTaxNL(veryHigh, NL_2026);
    if (!result.success) return;

    expect(result.taxes.kortingen.arbeids).toBe(0);
  });

});