"use client";

import { Explanation } from "../../../types/explanationTypes";

export type ExplanationSectionKey =
  | "income"
  | "deductions"
  | "tax"
  | "vat"
  | "net";

export interface ExplanationSectionLabels {
  income?: string;
  deductions?: string;
  tax?: string;
  vat?: string;
  net?: string;
}

interface Props {
  section: ExplanationSectionKey;
  explanations: Explanation[];
  labels?: ExplanationSectionLabels;
  defaultOpen?: boolean;
}

export function ExplanationSection({
  section,
  explanations,
  labels,
  defaultOpen = false,
}: Props) {

  if (explanations.length === 0) {
    return null;
  }

  const fallbackTitles: Record<ExplanationSectionKey, string> = {
  income: "Income",
  deductions: "Deductions",
  tax: "Tax",
  vat: "VAT",
  net: "Net result",
};

const title =
  labels?.[section] ?? fallbackTitles[section];

  return (
    <details
      className="explanation-section"
      open={defaultOpen}
    >
      <summary
        id={`explanation-section-${section}`}
        className="explanation-section__summary"
      >
        <strong>{title}</strong>
      </summary>

      <div
        className="explanation-section__content"
        role="region"
        aria-labelledby={`explanation-section-${section}`}
      >
        {explanations.map((e, idx) => (
          <div
            key={e.title ?? idx}
            className={`explanation explanation--${e.severity ?? "info"}`}
          >
            <h4 className="explanation__title">
              {e.title}
            </h4>

            <ul className="explanation__list">
              {e.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}