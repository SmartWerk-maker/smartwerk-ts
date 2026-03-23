import type { ROIRecommendation } from "../types";

type Params = {
  investment: number;
  totalProfit: number;
  roi: number;
  payback: number | null;
  months: number;
};

export function generateROIRecommendation(p: Params): ROIRecommendation {
  if (p.totalProfit < 0) {
    return {
      level: "negative",
      titleKey: "negativeTitle",
      textKey: "negativeText",
    };
  }

  if (p.payback && p.payback > p.months) {
    return {
      level: "neutral",
      titleKey: "neutralLongTitle",
      textKey: "neutralLongText",
    };
  }

  if (p.roi >= 70) {
    return {
      level: "strong",
      titleKey: "strongTitle",
      textKey: "strongText",
    };
  }

  if (p.roi >= 20) {
    return {
      level: "positive",
      titleKey: "positiveTitle",
      textKey: "positiveText",
    };
  }

  return {
    level: "neutral",
    titleKey: "neutralLowTitle",
    textKey: "neutralLowText",
  };
}