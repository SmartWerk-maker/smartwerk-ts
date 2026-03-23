// tests/golden/calcTotalKortingen.spec.ts
import { describe, it, expect } from "vitest";
import { calcTotalKortingen } from "../../engine/calcTotalKortingen";
import NL_2026_RULES from "../../config/nl/2026";

describe("Golden — Total heffingskortingen (NL 2026)", () => {

  it("aggregates algemene + arbeidskorting correctly", () => {
    const result = calcTotalKortingen({
      taxableIncome: 40_000,
      grossIncome: 50_000,
      incomeTaxRaw: 15_000,
      rules: NL_2026_RULES,
    });

    expect(result.algemene).toBeGreaterThan(0);
    expect(result.arbeids).toBeGreaterThan(0);

    expect(result.total).toBeCloseTo(
      result.algemene + result.arbeids,
      2
    );

    expect(result.total).toBeLessThanOrEqual(15_000);
  });


  it("returns zero when heffingskortingen are disabled", () => {
    const rules = {
      ...NL_2026_RULES,
      heffingskortingen: {
        ...NL_2026_RULES.heffingskortingen,
        enabled: false,
      },
    };

    const result = calcTotalKortingen({
      taxableIncome: 30_000,
      grossIncome: 30_000,
      incomeTaxRaw: 10_000,
      rules,
    });

    expect(result.algemene).toBe(0);
    expect(result.arbeids).toBe(0);
    expect(result.total).toBe(0);
  });


  it("caps total korting exactly at incomeTaxRaw", () => {
    const result = calcTotalKortingen({
      taxableIncome: 20_000,
      grossIncome: 20_000,
      incomeTaxRaw: 500,
      rules: NL_2026_RULES,
    });

    expect(result.total).toBe(500);
  });

});