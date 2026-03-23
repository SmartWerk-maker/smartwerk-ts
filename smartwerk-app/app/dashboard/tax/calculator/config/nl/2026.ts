// config/nl/2026.ts
import { TaxRules } from "../../types/TaxRules";

/**
 * NL TAX RULES — 2026
 *
 * Model:
 * - Box 1 progressive (non-AOW assumed)
 * - Bracket-based arbeidskorting (engine-compatible)
 * - ZVW ondernemers rate
 * - VAT fully separated
 *
 * ⚠️ This config matches engine architecture (bracket-based arbeidskorting).
 */

export const NL_2026_RULES: TaxRules = {
  meta: {
    country: "NL",
    year: 2026,
    currency: "EUR",
    version: "nl-2026-v2",
    disclaimer:
      "Indicative calculation based on Dutch 2026 published parameters. Not an official tax ruling.",
  },

  /* =========================
     INCOME TAX (BOX 1)
     ========================= */
  incomeTax: {
    box: 1,
    brackets: [
      { upTo: 38883, rate: 0.3575 },
      { upTo: 78426, rate: 0.3756 },
      { upTo: Infinity, rate: 0.495 },
    ],
  },

  /* =========================
     ZZP DEDUCTIONS
     ========================= */
  zzp: {
    zelfstandigenaftrek: {
      amount: 1200,
      requiresHours: 1225,
    },
    startersaftrek: {
      amount: 2123,
      requiresZzpEligibility: true,
    },
  },

  /* =========================
     MKB VRIJSTELLING
     ========================= */
  mkb: {
    percentage: 0.127,
    requiresZzpEligibility: true,
  },

  /* =========================
     DEDUCTION CAPS
     ========================= */
  caps: {
    maxDeductiblePercentageOfProfit: 1.0, // no artificial cap
  },

  /* =========================
     ZVW (2026 ondernemers)
     ========================= */
  zvw: {
    rate: 0.0485,
    maxBase: 79409,
  },

  /* =========================
     VAT / BTW
     ========================= */
  btw: {
    rates: {
      standard: 0.21,
      reduced: 0.09,
      zero: 0,
    },
    kor: {
      enabled: true,
      turnoverThreshold: 20000,
      vatAmount: 0,
    },
  },

  /* =========================
     HEFFINGSKORTINGEN
     ========================= */
  heffingskortingen: {
    enabled: true,

    /* Algemene heffingskorting 2026 */
    algemene: {
      max: 3115,
      base: "taxableIncome",
      afbouwVanaf: 29736,
      afbouwPercentage: 0.06398,
    },

    /* Arbeidskorting 2026 – bracket model */
    arbeids: {
      base: "taxableIncome",

      brackets: [
        // Phase 1
        { upTo: 11965, rate: 0.08324 },

        // Phase 2
        { upTo: 25845, rate: 0.31009 },

        // Phase 3
        { upTo: 45592, rate: 0.0195 },

        // Reduction phase
        { upTo: 132920, afbouwRate: 0.06510 },

        // Above threshold → zero
        { upTo: Infinity, fixedAmount: 0 },
      ],
    },
  },

  /* =========================
     ROUNDING
     ========================= */
  rounding: {
    decimals: 2,
    method: "HALF_UP",
  },
};

export default NL_2026_RULES;