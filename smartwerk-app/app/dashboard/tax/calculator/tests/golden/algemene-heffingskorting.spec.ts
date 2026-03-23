// tests/golden/algemene-heffingskorting.spec.ts
import { describe, it, expect } from "vitest";
import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe("Golden — Algemene heffingskorting (NL 2026)", () => {
  it("applies full algemene heffingskorting below afbouw threshold", () => {
    const input: TaxInput = {
      hoursWorked: 1000,
      hourlyRate: 20, // gross = 20,000 (clearly below threshold)

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

    const algemene = result.taxes.kortingen.algemene;

    expect(algemene).toBeCloseTo(
      NL_2026_RULES.heffingskortingen.algemene.max,
      2
    );
  });

  it("reduces algemene heffingskorting in afbouw phase", () => {
    const input: TaxInput = {
      hoursWorked: 1800,
      hourlyRate: 30, // income around phase-out zone

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

    const algemene = result.taxes.kortingen.algemene;

    expect(algemene).toBeGreaterThan(0);
    expect(algemene).toBeLessThan(
      NL_2026_RULES.heffingskortingen.algemene.max
    );
  });

  it("reduces algemene heffingskorting to zero above full afbouw", () => {
    const input: TaxInput = {
      hoursWorked: 2000,
      hourlyRate: 80, // very high income

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

    expect(result.taxes.kortingen.algemene).toBe(0);
  });
});