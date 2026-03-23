export type ROII18n = {
  title: string;

  description: {
    who: string;
    whoText: string;
    what: string;
    whatText: string;
    how: string;
    howText: string;
  };

  form: {
    investment: string;
    monthlyProfit: string;
    months: string;
    extraCosts: string;
    placeholders: {
      investment: string;
      monthlyProfit: string;
      months: string;
      extraCosts: string;
    };
  };

  results: {
    title: string;
    totalProfit: string;
    roi: string;
    payback: string;
    months: string;
    noPayback: string;
  };

  charts: {
    month: string;
    monthlyProfit: string;
    cumulativeProfit: string;
    growthTitle: string;
    cumulativeTitle: string;
  };

  tips: {
    title: string;
    dangerLoss: string;
    warningPayback: string;
    successHighRoi: string;
    infoLowRoi: string;
    warningExtraCosts: string;
    infoOk: string;
  };

  ai: {
    title: string;
    negativeTitle: string;
    negativeText: string;
    neutralLongTitle: string;
    neutralLongText: string;
    strongTitle: string;
    strongText: string;
    positiveTitle: string;
    positiveText: string;
    neutralLowTitle: string;
    neutralLowText: string;
  };
  actions: {
  dashboard: string;
};
};

export type ROIInput = {
  investment: number;
  monthlyProfit: number;
  months: number;
  extraCosts: number;
};

export type ROITipKey =
  | "dangerLoss"
  | "warningPayback"
  | "successHighRoi"
  | "infoLowRoi"
  | "warningExtraCosts"
  | "infoOk";

export type ROITip = {
  type: "success" | "warning" | "danger" | "info";
  key: ROITipKey;
};

export type ROIResult = {
  totalProfit: number;
  roiPercent: number;
  paybackMonths: number | null;
};

export type ROIRecommendation = {
  level: "strong" | "positive" | "neutral" | "negative";
  titleKey:
    | "negativeTitle"
    | "neutralLongTitle"
    | "strongTitle"
    | "positiveTitle"
    | "neutralLowTitle";
  textKey:
    | "negativeText"
    | "neutralLongText"
    | "strongText"
    | "positiveText"
    | "neutralLowText";
};