// tests/golden/zzp-high-income.spec.ts
import { describe, it, expect } from "vitest";

import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe(
  "Golden — ZZP very high income without deduction cap (NL 2026)",
  () => {
    it("applies ZZP and MKB correctly when cap is not reached", () => {

      const hoursWorked = 1225;
      const grossIncome = 200_000;
      const hourlyRate = grossIncome / hoursWorked;

      const input: TaxInput = {
        hoursWorked,
        hourlyRate,

        expenses: {
          vehicle: 10_000,
          office: 0,
          internet: 0,
          marketing: 0,
          other: 0,
          extraBenefits: 0,
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

      expect(result.income.gross).toBe(200_000);
      expect(result.income.profit).toBe(190_000);

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

      expect(result.taxableIncome)
        .toBeGreaterThan(0);

      /* VAT */

      expect(result.vat.korApplied).toBe(false);
      expect(result.vat.outputVat).toBeGreaterThan(0);

      /* Net income */

      expect(result.netIncome).toBeGreaterThan(0);
    });
  }
);