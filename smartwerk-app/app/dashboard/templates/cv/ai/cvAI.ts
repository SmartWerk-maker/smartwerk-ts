import type { CVAIContext, CVAISuggestion } from "./cvAITypes";
import { runCVRules } from "./cvAIRules";

export function analyzeCVBlock(ctx: CVAIContext): CVAISuggestion[] {
  return runCVRules(ctx);
}