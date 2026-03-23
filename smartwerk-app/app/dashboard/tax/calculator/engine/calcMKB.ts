// engine/calcMKB.ts
import { TaxRules } from "../types/TaxRules";

interface CalcMKBArgs {
  taxableAfterZzp: number;
  rules: TaxRules;
  isZzpEligible: boolean;
}

export interface MKBResult {
  mkbRequested: number;
  details: {
    base: number;
    percentage: number;
    eligible: boolean;
  };
}

export function calcMKB({
  taxableAfterZzp,
  rules,
  isZzpEligible,
}: CalcMKBArgs): MKBResult {
  const base =
    Number.isFinite(taxableAfterZzp) && taxableAfterZzp > 0
      ? taxableAfterZzp
      : 0;

  const requiresZzp =
    Boolean(rules?.mkb?.requiresZzpEligibility);

  const legallyEligible =
    !requiresZzp || Boolean(isZzpEligible);

  const percentage =
    typeof rules?.mkb?.percentage === "number" &&
    Number.isFinite(rules.mkb.percentage) &&
    rules.mkb.percentage > 0
      ? rules.mkb.percentage
      : 0;

  const mkbRequested =
    legallyEligible && base > 0 && percentage > 0
      ? base * percentage
      : 0;

  return {
    mkbRequested,
    details: {
      base,
      percentage,
      eligible: legallyEligible,
    },
  };
}

export default calcMKB;