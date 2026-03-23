// modules/domain/aiWarningProfiles.ts
import { WarningCode } from "./warnings";

/**
 * AiWarningProfile
 *
 * Defines HOW a warning should be explained by AI,
 * not WHEN or WHY it is triggered.
 *
 * This layer is purely communicative / UX / AI-facing.
 */
export interface AiWarningProfile {
  /** Tone of communication */
  tone: "calm" | "serious" | "attention";

  /** Primary audience */
  explainTo: "zzp" | "starter" | "general";

  /** Perceived severity for the user */
  severity: "low" | "medium" | "high";

  /** Explanation strategy */
  goals: {
    explainMeaning: boolean;
    explainWhy: boolean;
    suggestNextSteps: boolean;
  };

  /**
   * Topics the AI must NOT mention
   * (important for safety & trust)
   */
  forbiddenTopics?: string[];
}

/**
 * AI explanation profiles for each engine warning.
 *
 * ⚠️ IMPORTANT:
 * - Every WarningCode MUST have a profile here
 * - TypeScript enforces completeness via Record<>
 */
export const aiWarningProfiles: Record<
  WarningCode,
  AiWarningProfile
> = {
  EXPENSES_GT_INCOME: {
    tone: "calm",
    explainTo: "zzp",
    severity: "medium",
    goals: {
      explainMeaning: true,
      explainWhy: true,
      suggestNextSteps: true,
    },
    forbiddenTopics: ["fraud", "penalty", "audit"],
  },

  KOR_BTW_RATE_MISMATCH: {
  tone: "attention",
  explainTo: "zzp",
  severity: "high",
  goals: {
    explainMeaning: true,
    explainWhy: true,
    suggestNextSteps: true,
  },
  forbiddenTopics: ["fraud", "penalty"],
},

KOR_WITH_VAT_DETAILS: {
  tone: "calm",
  explainTo: "zzp",
  severity: "low",
  goals: {
    explainMeaning: true,
    explainWhy: true,
    suggestNextSteps: false,
  },
},

  KOR_THRESHOLD_EXCEEDED: {
    tone: "attention",
    explainTo: "zzp",
    severity: "high",
    goals: {
      explainMeaning: true,
      explainWhy: true,
      suggestNextSteps: true,
    },
    forbiddenTopics: ["penalty", "audit"],
  },

  LOW_HOURS_NO_ZZP: {
    tone: "calm",
    explainTo: "starter",
    severity: "low",
    goals: {
      explainMeaning: true,
      explainWhy: true,
      suggestNextSteps: true,
    },
  },

  NO_KVK_NO_DEDUCTIONS: {
    tone: "serious",
    explainTo: "general",
    severity: "high",
    goals: {
      explainMeaning: true,
      explainWhy: true,
      suggestNextSteps: true,
    },
    forbiddenTopics: ["fraud"],
  },

  DEDUCTION_CAP_APPLIED: {
    tone: "calm",
    explainTo: "zzp",
    severity: "medium",
    goals: {
      explainMeaning: true,
      explainWhy: true,
      suggestNextSteps: false,
    },
  },
};