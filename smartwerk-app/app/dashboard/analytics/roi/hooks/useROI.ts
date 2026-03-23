import { useState, useMemo } from "react";
import { calculateROI } from "../utils/roiMath";
import { generateROITips } from "../utils/roiTips";
import { generateROIRecommendation } from "../utils/roiRecommendation";

export function useROI() {
  const [investment, setInvestment] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [months, setMonths] = useState(0);
  const [extraCosts, setExtraCosts] = useState(0);

  const result = useMemo(() => {
  if (months <= 0) {
    return {
      totalProfit: 0,
      roiPercent: 0,
      paybackMonths: null,
    };
  }

  return calculateROI({
    investment,
    monthlyProfit,
    months,
    extraCosts,
  });
}, [investment, monthlyProfit, months, extraCosts]);

  const { totalProfit, roiPercent, paybackMonths } = result;

  const tips = useMemo(
    () =>
      generateROITips({
        investment,
        monthlyProfit,
        months,
        extraCosts,
        totalProfit,
        roi: roiPercent,
        payback: paybackMonths,
      }),
    [
      investment,
      monthlyProfit,
      months,
      extraCosts,
      totalProfit,
      roiPercent,
      paybackMonths,
    ]
  );

  const recommendation = useMemo(
    () =>
      generateROIRecommendation({
        investment,
        totalProfit,
        roi: roiPercent,
        payback: paybackMonths,
        months,
      }),
    [investment, totalProfit, roiPercent, paybackMonths, months]
  );

  return {
    investment,
    setInvestment,
    monthlyProfit,
    setMonthlyProfit,
    months,
    setMonths,
    extraCosts,
    setExtraCosts,

    totalProfit,
    roi: roiPercent,
    payback: paybackMonths,
    tips,
    recommendation,
  };
}