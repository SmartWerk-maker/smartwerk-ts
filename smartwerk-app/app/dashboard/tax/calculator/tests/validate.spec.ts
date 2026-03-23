// tests/validate.spec.ts
import { describe, it, expect } from "vitest";

import { calculateTaxNL } from "../engine/calculateTaxNL";
import NL_2026_RULES from "../config/nl/2026";
import { TaxInput } from "../types/TaxInput";

describe("Input validation & warnings", () => {
  it("fails when hourlyRate is negative", () => {
    const input: TaxInput = {
      hoursWorked: 1000,
      hourlyRate: -10,

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

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors).toContain("tax.input.rate.invalid");
  });

  it("warns when KOR is applied but btwRate is not 0", () => {
    const input: TaxInput = {
      hoursWorked: 1000,
      hourlyRate: 50,

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
      korApplied: true,
    };

    const result = calculateTaxNL(input, NL_2026_RULES);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const warning = result.warnings.find(
      (w) => w.code === "KOR_BTW_RATE_MISMATCH"
    );

    expect(warning).toBeDefined();
    expect(warning?.level).toBe("warning");
  });

  it("warns when expenses exceed income", () => {
    const input: TaxInput = {
      hoursWorked: 100,
      hourlyRate: 10,

      expenses: {
        vehicle: 2000,
        office: 0,
        internet: 0,
        marketing: 0,
        other: 0,
        extraBenefits: 0,
      },

      kvkRegistered: true,
      isStarter: false,
      btwRate: 0,
      korApplied: false,
    };

    const result = calculateTaxNL(input, NL_2026_RULES);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const warning = result.warnings.find(
      (w) => w.code === "EXPENSES_GT_INCOME"
    );

    expect(warning).toBeDefined();
    expect(warning?.level).toBe("warning");
  });
});