import { TaxRules } from "../../types/TaxRules";

export const DEFAULT_TAX_RULES: TaxRules = {
  meta: {
    country: "NL",
    year: 2026,
    currency: "EUR",
    version: "2026.1.0",
    disclaimer:
      "Provisional rules for 2026, based on official Dutch tax tables.",
  },

  /* =========================
     INCOME TAX (BOX 1) – 2026
     Data from Belastingdienst.nl
  ========================= */
  incomeTax: {
    box: 1,
    brackets: [
      // First bracket: up to ~€38,883 at ~35.75%
      { upTo: 38883, rate: 0.3575 },
      // Second bracket: €38,883–€78,426 at ~37.56%
      { upTo: 78426, rate: 0.3756 },
      // Third bracket: over €78,426 at 49.50%
      { upTo: Infinity, rate: 0.495 },
    ],
  },

  /* =========================
     ZZP CONTRIBUTIONS / DEDUCTIONS
     (Zelfstandigenaftrek + Startersaftrek)
     Updated estimates for 2026
  ========================= */
  zzp: {
    zelfstandigenaftrek: {
      amount: 3850,        // updated estimate
      requiresHours: 1225,
    },
    startersaftrek: {
      amount: 2200,        // updated estimate
      requiresZzpEligibility: true,
    },
  },

  /* =========================
     MKB VRIJSTELLING
  ========================= */
  mkb: {
    percentage: 0.14,
    requiresZzpEligibility: true,
  },

  /* =========================
     DEDUCTION CAPS
     Max total deductions as % of profit
     (legal cap ≈ 37.48% in NL)
  ========================= */
  caps: {
    maxDeductiblePercentageOfProfit: 0.3748,
  },

  /* =========================
     ZVW (Health Insurance Tax)
  ========================= */
  zvw: {
  rate: 0.0485,      // 4.85% officiële lage percentage 2026
  maxBase: 79409,    // officiële max bijdrage-inkomen 2026
    },

  /* =========================
     VAT / BTW
  ========================= */
  btw: {
    rates: {
      standard: 0.21,
      reduced: 0.09,
      zero: 0.0,
    },
    kor: {
      enabled: true,
      turnoverThreshold: 20000,
      vatAmount: 0,
    },
  },

  /* =========================
     HEFFINGSKORTINGEN (General & Labour)
  ========================= */
  heffingskortingen: {
  enabled: true,

  // Algemene heffingskorting (niet-AOW)
  algemene: {
    max: 3115,
    base: "taxableIncome",          // або "grossIncome" — як ти вирішиш
    afbouwVanaf: 29736,
    afbouwPercentage: 0.06398,
  },

  // Arbeidskorting (niet-AOW) — marginal brackets
  arbeids: {
    base: "taxableIncome",          // або "grossIncome" — але Belastingdienst формулює через arbeidsinkomen
    brackets: [
      // tot € 11.965: 8,324% * arbeidsinkomen
      { upTo: 11965, rate: 0.08324 },

      // € 11.965–€ 25.845: + 31,009% over (income - 11.965)
      // (marginally it is just 31,009% on this slice)
      { upTo: 25845, rate: 0.31009 },

      // € 25.845–€ 45.592: + 1,950% over (income - 25.845)
      { upTo: 45592, rate: 0.01950 },

      // € 45.592–€ 132.920: 5.685 - 6,510% * (income - 45.592)
      // marginally: subtract 6,510% on this slice
      { upTo: 132920, afbouwRate: 0.06510 },

      // vanaf € 132.920: € 0
      { upTo: Infinity, fixedAmount: 0 },
    ],
  },
},

  /* =========================
     ROUNDING (standard practice)
  ========================= */
  rounding: {
    decimals: 2,
    method: "HALF_UP",
  },
};

export default DEFAULT_TAX_RULES;