// modules/domain/eligibility.ts

/**
 * ZZP eligibility checks (domain-level)
 *
 * IMPORTANT LEGAL NOTE:
 * ---------------------
 * This function checks ONLY the formal, objectively verifiable criteria:
 * - KvK registration
 * - Minimum hours worked (e.g. 1225 hours/year)
 *
 * Dutch tax law also requires qualitative criteria
 * (entrepreneurial risk, independence, multiple clients),
 * which CANNOT be reliably validated by software.
 *
 * Therefore:
 * - This result is an eligibility ASSUMPTION
 * - NOT a legal determination
 */

export interface ZzpEligibilityInput {
  /** Whether the entrepreneur is registered at KvK */
  kvkRegistered: boolean;

  /** Total hours worked in the business during the tax year */
  hoursWorked: number;

  /** Legal minimum hours threshold (e.g. 1225) */
  requiredHours: number;
}

export interface ZzpEligibilityResult {
  /** Whether the formal criteria are met */
  eligible: boolean;

  /** Individual criteria results (for explainability) */
  checks: {
    kvkRegistered: boolean;
    hoursRequirementMet: boolean;
  };
}

/**
 * isZzpEligible
 *
 * Performs a FORMAL eligibility check for entrepreneur deductions.
 * Does NOT attempt to assess qualitative tax law conditions.
 */
export function isZzpEligible({
  kvkRegistered,
  hoursWorked,
  requiredHours,
}: ZzpEligibilityInput): ZzpEligibilityResult {
  const safeHours =
    Number.isFinite(hoursWorked) && hoursWorked > 0
      ? hoursWorked
      : 0;

  const safeRequired =
    Number.isFinite(requiredHours) && requiredHours > 0
      ? requiredHours
      : Infinity;

  const hoursRequirementMet =
    safeHours >= safeRequired;

  const eligible =
    Boolean(kvkRegistered) && hoursRequirementMet;

  return {
    eligible,
    checks: {
      kvkRegistered: Boolean(kvkRegistered),
      hoursRequirementMet,
    },
  };
}

export default isZzpEligible;