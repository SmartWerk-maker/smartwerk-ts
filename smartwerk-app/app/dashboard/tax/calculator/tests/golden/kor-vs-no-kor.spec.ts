// tests/golden/kor-vs-no-kor.spec.ts
import { describe, it, expect } from "vitest";
import { calculateTaxNL } from "../../engine/calculateTaxNL";
import NL_2026_RULES from "../../config/nl/2026";
import { TaxInput } from "../../types/TaxInput";

describe("Golden — KOR vs no-KOR (NL 2026)", () => {
  it("applies KOR only to VAT, not to income tax or ZVW", () => {

    const baseInput: TaxInput = {
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
      korApplied: false,
    };

    const noKor = calculateTaxNL(baseInput, NL_2026_RULES);
    expect(noKor.success).toBe(true);
    if (!noKor.success) return;

    const kor = calculateTaxNL(
      { ...baseInput, korApplied: true, btwRate: 0 },
      NL_2026_RULES
    );
    expect(kor.success).toBe(true);
    if (!kor.success) return;

    /* VAT behavior */

    expect(noKor.vat.korApplied).toBe(false);
    expect(kor.vat.korApplied).toBe(true);

    // KOR must zero out VAT payable
    expect(kor.vat.payableVat).toBe(0);

    // VAT amounts must differ
    expect(kor.vat.payableVat)
      .not.toBe(noKor.vat.payableVat);

    /* Income tax must remain identical */

    expect(kor.taxableIncome)
      .toBe(noKor.taxableIncome);

    expect(kor.taxes.incomeTax)
      .toBe(noKor.taxes.incomeTax);

    expect(kor.taxes.zvw)
      .toBe(noKor.taxes.zvw);

    /* Net income (excl VAT) must remain identical */

    expect(kor.netIncome)
      .toBe(noKor.netIncome);

    /* Net cash position must differ (VAT included) */

    expect(kor.netCashPosition)
      .not.toBe(noKor.netCashPosition);
  });
});