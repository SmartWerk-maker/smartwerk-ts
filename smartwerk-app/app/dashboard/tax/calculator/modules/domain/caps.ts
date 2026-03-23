// modules/domain/caps.ts

/**
 * Deduction cap logic (domain-level)
 *
 * IMPORTANT ACCOUNTING NOTE:
 * --------------------------
 * Dutch tax law does NOT define a universal "total deductions cap"
 * as a percentage of profit.
 *
 * This helper exists as:
 * - a configurable policy safeguard
 * - a simulation / safety mechanism
 * - or a future-proof extension point
 *
 * If no legal basis exists, set maxPercentage = 1.0
 * to effectively disable the cap.
 */

export interface DeductionCapResult {
  /** Whether the cap actually limited deductions */
  applied: boolean;

  /** Maximum legally/configurationally allowed deduction */
  maxAllowed: number;

  /** Deduction amount after applying the cap */
  appliedAmount: number;

  /** Amount that was requested before capping */
  requestedAmount: number;

  /** Percentage used for the cap */
  percentageUsed: number;
}

/**
 * applyDeductionCap
 *
 * Applies a generic deduction cap expressed as
 * a percentage of profit.
 *
 * This function is:
 * - deterministic
 * - side-effect free
 * - defensive against invalid input
 *
 * @param profit Gross profit before deductions
 * @param requestedDeduction Total requested deductions
 * @param maxPercentage Max allowed deduction as % of profit (0..1)
 */
export function applyDeductionCap(
  profit: number,
  requestedDeduction: number,
  maxPercentage: number
): DeductionCapResult {
  const safeProfit =
    Number.isFinite(profit) && profit > 0 ? profit : 0;

  const safeRequested =
    Number.isFinite(requestedDeduction) && requestedDeduction > 0
      ? requestedDeduction
      : 0;

  // Defensive: disable cap if percentage is invalid or >= 1
  if (
    !Number.isFinite(maxPercentage) ||
    maxPercentage <= 0 ||
    maxPercentage >= 1
  ) {
    return {
      applied: false,
      maxAllowed: Infinity,
      appliedAmount: safeRequested,
      requestedAmount: safeRequested,
      percentageUsed: 1,
    };
  }

  const maxAllowed = safeProfit * maxPercentage;

  if (safeRequested <= maxAllowed) {
    return {
      applied: false,
      maxAllowed,
      appliedAmount: safeRequested,
      requestedAmount: safeRequested,
      percentageUsed: maxPercentage,
    };
  }

  return {
    applied: true,
    maxAllowed,
    appliedAmount: maxAllowed,
    requestedAmount: safeRequested,
    percentageUsed: maxPercentage,
  };
}

export default applyDeductionCap;