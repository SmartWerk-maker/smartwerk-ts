// config/nl/index.ts

import NL_2026_RULES from "./2026";

export const NL_TAX_RULES = {
  2026: NL_2026_RULES,
};

export type NlSupportedYear = keyof typeof NL_TAX_RULES;

export function getNlTaxRules(year: number) {
  const rules = NL_TAX_RULES[year as NlSupportedYear];

  if (!rules) {
    throw new Error(`NL tax rules not available for year ${year}`);
  }

  return rules;
}