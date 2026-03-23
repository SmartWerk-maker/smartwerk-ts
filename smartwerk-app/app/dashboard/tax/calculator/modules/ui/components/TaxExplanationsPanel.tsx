"use client";

import {
  Explanation,
  ExplanationSection as SectionKey,
} from "../../../types/explanationTypes";

import { ExplanationSection } from "./ExplanationSection";
import type { ExplanationSectionLabels } from "./ExplanationSection";

export interface TaxExplanationsPanelLabels {
  title?: string;
  sections?: ExplanationSectionLabels;
}

interface Props {
  explanations: Explanation[];
  labels?: TaxExplanationsPanelLabels;
}

export function TaxExplanationsPanel({
  explanations,
  labels,
}: Props) {

  if (explanations.length === 0) {
    return null;
  }

  const bySection = explanations.reduce<
    Partial<Record<SectionKey, Explanation[]>>
  >((acc, e) => {

    if (!acc[e.section]) {
      acc[e.section] = [];
    }

    acc[e.section]!.push(e);
    return acc;

  }, {});

  const ORDER: SectionKey[] = [
    "income",
    "deductions",
    "tax",
    "vat",
    "net",
  ];

  return (
    <section
      className="tax-explanations"
      aria-labelledby="tax-explanations-title"
    >

      <h2 id="tax-explanations-title">
        {labels?.title ?? "Calculation explanation"}
      </h2>

      {ORDER.map((section) => {

        const items = bySection[section];
        if (!items?.length) return null;

        return (
          <ExplanationSection
            key={section}
            section={section}
            explanations={items}
            labels={labels?.sections}
          />
        );

      })}

    </section>
  );
}