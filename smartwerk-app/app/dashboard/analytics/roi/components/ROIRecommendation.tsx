"use client";

import type { ROII18n, ROIRecommendation as Rec } from "../types";

type Props = {
  t: ROII18n;
  recommendation: Rec | null;
};

export default function ROIRecommendation({ t, recommendation }: Props) {
  if (!recommendation) return null;

  return (
    <section className={`roi-recommendation ${recommendation.level}`}>
      <h3>🤖 {t.ai.title}</h3>
      <h4>{t.ai[recommendation.titleKey]}</h4>
      <p>{t.ai[recommendation.textKey]}</p>
    </section>
  );
}