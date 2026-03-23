"use client";

import { TaxWarning, WarningLevel, WarningCode } from "../../domain/warnings";
import { TaxResult } from "../../../types/TaxResult";
import { warningLabels } from "../../domain/labels";
import { useAiContext } from "../../../hooks/useAiContext";

/* ======================
   i18n Types
====================== */

export interface TaxWarningsLabels {
  title?: string;
  explain?: string;
  explainWithAi?: string;

  warnings?: Partial<
    Record<
      WarningCode,
      {
        title?: string;
        description?: string;
      }
    >
  >;
}

/* ======================
   Props
====================== */

interface Props {
  warnings: TaxWarning[];
  result: TaxResult;
  labels?: TaxWarningsLabels;
}

/* ======================
   Component
====================== */

export function TaxWarnings({
  warnings,
  result,
  labels,
}: Props) {
  const { buildWarningPrompt } = useAiContext(result);

  if (!result.success || !warnings?.length) {
    return null;
  }

  const handleExplain = (warning: TaxWarning) => {
    const prompt = buildWarningPrompt(warning);
    if (!prompt) return;

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("smartwerk_ai_prompt", prompt);
      }

      const win = window.open("/ai-assistant", "_blank");
      if (win) win.opener = null;
    } catch (err) {
      console.error("Failed to open AI assistant:", err);
    }
  };

  return (
    <section
      className="tax-warnings"
      aria-labelledby="tax-warnings-title"
    >
      <h3
        id="tax-warnings-title"
        className="tax-warnings__title"
      >
        {labels?.title ?? "Warnings"}
      </h3>

      <ul className="tax-warnings__list">
        {warnings.map((warning, index) => {
          const fallback = warningLabels[warning.code];
          if (!fallback) return null;

          const custom = labels?.warnings?.[warning.code];

          const title = custom?.title ?? fallback.title;
          const description =
            custom?.description ?? fallback.description;

          return (
            <li
              key={`${warning.code}-${index}`}
              className="tax-warnings__item"
            >
              <WarningCard
                title={title}
                description={description}
                level={warning.level}
                onExplain={
                  warning.level !== "info"
                    ? () => handleExplain(warning)
                    : undefined
                }
                explainLabel={labels?.explain ?? "Explain"}
                explainWithAiLabel={
                  labels?.explainWithAi ?? "Explain with AI"
                }
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ======================
   WarningCard
====================== */

interface WarningCardProps {
  title: string;
  description: string;
  level: WarningLevel;
  onExplain?: () => void;

  explainLabel: string;
  explainWithAiLabel: string;
}

function WarningCard({
  title,
  description,
  level,
  onExplain,
  explainLabel,
  explainWithAiLabel,
}: WarningCardProps) {
  const role =
    level === "error"
      ? "alert"
      : level === "warning"
      ? "status"
      : "note";

  return (
    <div
      className={`warning-card warning-card--${level}`}
      role={role}
      aria-live={level === "error" ? "assertive" : "polite"}
    >
      <strong className="warning-card__title">
        {title}
      </strong>

      <p className="warning-card__description">
        {description}
      </p>

      {onExplain && (
        <button
          type="button"
          className="warning-card__ai-btn"
          onClick={onExplain}
          aria-label={explainWithAiLabel}
        >
          💬 {explainLabel}
        </button>
      )}
    </div>
  );
}