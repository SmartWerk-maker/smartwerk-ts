// engine/calcDeductions.ts
import { TaxRules } from "../types/TaxRules";
import { ZzpEligibilityResult } from "../modules/domain/eligibility";

interface CalcDeductionsArgs {
  profit: number;
  rules: TaxRules;
  zzpEligibility: ZzpEligibilityResult;
  isStarter: boolean;
}

export interface DeductionsResult {
  zzpDeductionRequested: number;
  taxableAfterZzp: number;
  details: {
    zelfstandigenaftrek: number;
    startersaftrek: number;
    eligibleForZzp: boolean;
    eligibleForStarter: boolean;
    eligibilityChecks: ZzpEligibilityResult["checks"];
  };
}

export function calcDeductions({
  profit,
  rules,
  zzpEligibility,
  isStarter,
}: CalcDeductionsArgs): DeductionsResult {
  const safeProfit =
    Number.isFinite(profit) && profit > 0 ? profit : 0;

  const eligibleForZzp =
    zzpEligibility.eligible && safeProfit > 0;

  if (!eligibleForZzp) {
    return {
      zzpDeductionRequested: 0,
      taxableAfterZzp: safeProfit,
      details: {
        zelfstandigenaftrek: 0,
        startersaftrek: 0,
        eligibleForZzp: false,
        eligibleForStarter: false,
        eligibilityChecks: zzpEligibility.checks,
      },
    };
  }

  const zelfstandigenaftrek =
    Number.isFinite(rules.zzp.zelfstandigenaftrek.amount)
      ? Math.max(0, rules.zzp.zelfstandigenaftrek.amount)
      : 0;

  const eligibleForStarter =
    Boolean(isStarter) &&
    eligibleForZzp &&
    rules.zzp.startersaftrek.requiresZzpEligibility;

  const startersaftrek =
    eligibleForStarter &&
    Number.isFinite(rules.zzp.startersaftrek.amount)
      ? Math.max(0, rules.zzp.startersaftrek.amount)
      : 0;

  const zzpDeductionRequested =
    zelfstandigenaftrek + startersaftrek;

  const taxableAfterZzp = Math.max(
    0,
    safeProfit - zzpDeductionRequested
  );

  return {
    zzpDeductionRequested,
    taxableAfterZzp,
    details: {
      zelfstandigenaftrek,
      startersaftrek,
      eligibleForZzp,
      eligibleForStarter,
      eligibilityChecks: zzpEligibility.checks,
    },
  };
}

export default calcDeductions;