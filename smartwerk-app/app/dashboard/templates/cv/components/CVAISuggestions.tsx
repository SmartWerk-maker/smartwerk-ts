"use client";

import type { CVAISuggestion, CVAIKey } from "../ai/cvAITypes";
import type { CVAII18n, CVAIText } from "../types";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

type Props = {
  suggestions: CVAISuggestion[];
  onApply: (newContent: string) => void;
  currentContent: string;
};

function getAIText(ai: CVAII18n, key: CVAIKey): CVAIText {
  switch (key) {
    case "summary.tooShort":
      return ai.summary.tooShort;
    case "summary.noExperience":
      return ai.summary.noExperience;
    case "skills.few":
      return ai.skills.few;
    case "experience.noResults":
      return ai.experience.noResults;
    case "universal.tooThin":
      return ai.universal.tooThin;
    default:
      return { title: "Tip", message: "" };
  }
}

export default function CVAISuggestions({
  suggestions,
  onApply,
  currentContent,
}: Props) {
  const { language } = useLanguage();

  const dict = useTranslation(language) as unknown as {
    cv?: {
      ai?: CVAII18n;
      ui?: {
        suggestionsTitle?: string;
        apply?: string;
      };
    };
  };

  const ai = dict?.cv?.ai;
  const ui = dict?.cv?.ui;

  if (!suggestions.length || !ai) return null;

  return (
    <div className="cv-ai-panel">
      <h4>🧠 {ui?.suggestionsTitle ?? "AI Suggestions"}</h4>

      {suggestions.map((s) => {
        const text = getAIText(ai, s.i18nKey);

        if (!text?.title && !text?.message) return null;

        return (
          <div key={s.id} className={`ai-tip ${s.level}`}>
            <strong>{text.title}</strong>
            <p>{text.message}</p>

            {s.action && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onApply(s.action!.apply(currentContent))}
              >
                {ui?.apply ?? "Apply"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}