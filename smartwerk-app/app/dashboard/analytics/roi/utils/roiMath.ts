import type { ROIInput, ROIResult } from "../types";

export function calculateROI(input: ROIInput): ROIResult {
  const totalIncome = input.monthlyProfit * input.months;
  const totalCost = input.investment + input.extraCosts;
  const totalProfit = totalIncome - totalCost;

  const roiPercent =
    totalCost > 0 ? Math.round((totalProfit / totalCost) * 100) : 0;

  const paybackMonths =
    input.monthlyProfit > 0
      ? Math.ceil(totalCost / input.monthlyProfit)
      : null;

  return { totalProfit, roiPercent, paybackMonths };
}