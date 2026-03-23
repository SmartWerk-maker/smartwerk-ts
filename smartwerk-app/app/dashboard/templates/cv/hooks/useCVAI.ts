// cv/hooks/useCVAI.ts

import { useMemo } from "react";
import type { CVAIContext, CVAISuggestion } from "../ai/cvAITypes";
import { analyzeCVBlock } from "../ai/cvAI";

type UseCVAIResult = {
  suggestions: CVAISuggestion[];
  hasWarnings: boolean;
  hasSuggestions: boolean;
};

export function useCVAI(ctx: CVAIContext | null): UseCVAIResult {
  const suggestions = useMemo<CVAISuggestion[]>(() => {
    if (!ctx) return [];

    // ⛔ не аналізуємо пустий контент
    if (!ctx.content || ctx.content.trim().length === 0) {
      return [];
    }

    return analyzeCVBlock(ctx);
  }, [ctx]);

  const hasWarnings = useMemo(
    () => suggestions.some((s) => s.level === "warning"),
    [suggestions]
  );

  const hasSuggestions = useMemo(
    () => suggestions.length > 0,
    [suggestions]
  );

  return {
    suggestions,
    hasWarnings,
    hasSuggestions,
  };
}