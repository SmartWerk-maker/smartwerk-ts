// modules/domain/labels.ts
import { WarningCode } from "./warnings";

/**
 * Human-readable labels for tax warnings.
 *
 * IMPORTANT:
 * - UI only (not legal advice)
 * - Neutral, non-accusatory language
 * - Describe what the calculation detected,
 *   not what the tax authority will do
 */
export const warningLabels: Record<
  WarningCode,
  {
    title: string;
    description: string;
  }
> = 
     {
  EXPENSES_GT_INCOME: {
    title: "Expenses exceed income",
    description:
      "Your declared business expenses are higher than your income for this period. This can be normal in some situations, but it may require extra attention when reviewing your tax data.",
  },

  KOR_BTW_RATE_MISMATCH: {
    title: "KOR and VAT rate do not match",
    description:
      "You selected the Small Business Scheme (KOR), but a non-zero VAT rate is set. Under KOR, VAT is usually not charged on sales.",
  },

  KOR_WITH_VAT_DETAILS: {
    title: "KOR selected with VAT details entered",
    description:
      "You selected the Small Business Scheme (KOR), but detailed VAT inputs were provided. Under KOR, VAT is typically not charged or deducted.",
  },

  KOR_THRESHOLD_EXCEEDED: {
    title: "KOR turnover threshold exceeded",
    description:
      "The declared turnover exceeds the maximum threshold for applying the Small Business Scheme (KOR). In this situation, KOR may no longer be applicable for the selected period.",
  },

  LOW_HOURS_NO_ZZP: {
    title: "Hours requirement not met",
    description:
      "Based on the entered number of working hours, the minimum hours requirement for entrepreneur deductions is not met in this calculation.",
  },

  NO_KVK_NO_DEDUCTIONS: {
    title: "KvK registration missing",
    description:
      "Because no KvK registration is indicated, entrepreneur deductions are not applied in this calculation.",
  },

  DEDUCTION_CAP_APPLIED: {
    title: "Deduction limit applied",
    description:
      "The total amount of entrepreneur deductions was limited according to the applicable legal rules in this calculation.",
  },
};
  
