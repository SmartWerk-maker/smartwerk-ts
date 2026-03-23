// modules/domain/warnings.ts

/**
 * Warning severity level.
 *
 * IMPORTANT:
 * - This does NOT represent calculation failure
 * - All warnings are non-blocking
 * - Severity is used for UI emphasis and AI explanations
 */
export type WarningLevel =
  | "info"
  | "warning"
  | "error";

/**
 * Canonical list of all warning codes
 * produced by the tax engine.
 *
 * Every code MUST have:
 * - a label (labels.ts)
 * - an AI profile (aiWarningProfiles.ts)
 */
export type WarningCode =
  | "EXPENSES_GT_INCOME"
  | "KOR_BTW_RATE_MISMATCH"
  | "KOR_WITH_VAT_DETAILS"
  | "KOR_THRESHOLD_EXCEEDED"
  | "LOW_HOURS_NO_ZZP"
  | "NO_KVK_NO_DEDUCTIONS"
  | "DEDUCTION_CAP_APPLIED";

/**
 * Machine-readable warning produced by the tax engine.
 *
 * Used by:
 * - UI (validation panels, highlights)
 * - AI explanations
 * - Exports (PDF, accountant reports)
 *
 * IMPORTANT:
 * - Warnings never invalidate a calculation
 * - Fatal input problems must be returned as errors instead
 */
export interface TaxWarning {
  code: WarningCode;
  level: WarningLevel;

  /**
   * Optional engine metadata
   * (not for direct UI rendering)
   */
  meta?: Record<string, unknown>;
}

/**
 * Context passed to AI systems to explain warnings
 * in a user-friendly and legally safe way.
 *
 * This is a curated snapshot, NOT the full TaxResult.
 */
export interface AiWarningContext {
  code: WarningCode;

  snapshot: {
    year?: number;

    grossIncome: number;
    expenses: number;
    profit: number;

    taxableIncome: number;
    incomeTax: number;
    zvw: number;

    kvkRegistered: boolean;
    hoursWorked: number;
    isStarter: boolean;

    korRequested: boolean;
    korApplied: boolean;
    vatTurnover?: number;
  };
}
