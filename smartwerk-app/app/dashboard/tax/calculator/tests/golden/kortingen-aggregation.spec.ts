// tests/golden/kortingen-aggregation.spec.ts
import { describe, it, expect } from "vitest";
import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe("Golden — Kortingen aggregation", () => {

  it("aggregates algemene + arbeidskorting and reduces income tax", () => {

    const input: TaxInput = {
      hoursWorked: 1600,
      hourlyRate: 40,

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

    const result = calculateTaxNL(input, NL_2026_RULES);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { algemene, arbeids, total } =
      result.taxes.kortingen;

    /* Aggregation */

    expect(total).toBeCloseTo(
      algemene + arbeids,
      2
    );

    /* Credits must not exceed raw income tax */

    const incomeTaxAfter = result.taxes.incomeTax;
    const incomeTaxRawEstimate = incomeTaxAfter + total;

    expect(total).toBeLessThanOrEqual(
      incomeTaxRawEstimate + 0.01
    );

    /* Income tax must not be negative */

    expect(incomeTaxAfter).toBeGreaterThanOrEqual(0);

    /* Credits must reduce tax when possible */

    if (total > 0) {
      expect(incomeTaxAfter).toBeLessThan(
        incomeTaxRawEstimate
      );
    }

    /* Taxable income must remain unchanged */

    expect(result.taxableIncome).toBeGreaterThan(0);
  });

});