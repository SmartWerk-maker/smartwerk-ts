import type { CVAISuggestion, CVAIContext } from "./cvAITypes";

export function runCVRules(ctx: CVAIContext): CVAISuggestion[] {
  const suggestions: CVAISuggestion[] = [];
  const text = ctx.content.trim();

  /* ===== SUMMARY ===== */
  if (ctx.blockType === "summary") {
    if (text.length < 120) {
      suggestions.push({
        id: "summary-too-short",
        level: "warning",
        i18nKey: "summary.tooShort",
      });
    }

    if (!/experience|years|expert/i.test(text)) {
      suggestions.push({
        id: "summary-no-experience",
        level: "info",
        i18nKey: "summary.noExperience",
      });
    }
  }

  /* ===== SKILLS ===== */
  if (ctx.blockType === "skills") {
    const items = text.split(",").map((s) => s.trim()).filter(Boolean);

    if (items.length < 5) {
      suggestions.push({
        id: "skills-few",
        level: "warning",
        i18nKey: "skills.few",
      });
    }
  }

  /* ===== EXPERIENCE ===== */
  if (ctx.blockType === "experience") {
    if (!/result|impact|increase|improve|achieve/i.test(text)) {
      suggestions.push({
        id: "experience-no-results",
        level: "warning",
        i18nKey: "experience.noResults",
      });
    }
  }

  /* ===== UNIVERSAL (тільки якщо нічого іншого) ===== */
  if (text.length > 0 && text.length < 60 && suggestions.length === 0) {
    suggestions.push({
      id: "content-too-thin",
      level: "info",
      i18nKey: "universal.tooThin",
    });
  }

  return suggestions;
}