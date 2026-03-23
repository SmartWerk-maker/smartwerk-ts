// cv/ai/cvAITypes.ts

import type { CVBlockType } from "../types";

/* =====================================
   LEVEL
===================================== */

export type CVAILevel = "success" | "info" | "warning";

/* =====================================
   ACTION (optional)
===================================== */

export type CVAIAction = {
  labelKey: string; // i18n key
  apply: (content: string) => string;
};

/* =====================================
   I18N KEYS (STRICT)
===================================== */

export type CVAIKey =
  | "summary.tooShort"
  | "summary.noExperience"
  | "skills.few"
  | "experience.noResults"
  | "universal.tooThin";

/* =====================================
   SUGGESTION
===================================== */

export type CVAISuggestion = {
  id: string;
  level: CVAILevel;

  /** i18n key, NOT text */
  i18nKey: CVAIKey;

  action?: CVAIAction;
};

/* =====================================
   CONTEXT
===================================== */

export type CVAIContext = {
  title: string;
  content: string;
  blockType: CVBlockType | "custom";
};