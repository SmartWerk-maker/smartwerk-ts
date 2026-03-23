import type { ROITip } from "../types";

type Params = {
  investment: number;
  monthlyProfit: number;
  months: number;
  extraCosts: number;
  totalProfit: number;
  roi: number;
  payback: number | null;
};

export function generateROITips(p: Params): ROITip[] {
  const tips: ROITip[] = [];

  if (p.totalProfit < 0) {
    tips.push({ type: "danger", key: "dangerLoss" });
  }

  if (p.payback && p.payback > p.months) {
    tips.push({ type: "warning", key: "warningPayback" });
  }

  if (p.roi >= 50) {
    tips.push({ type: "success", key: "successHighRoi" });
  }

  if (p.roi > 0 && p.roi < 20) {
    tips.push({ type: "info", key: "infoLowRoi" });
  }

  if (p.extraCosts > p.investment * 0.3) {
    tips.push({ type: "warning", key: "warningExtraCosts" });
  }

  if (tips.length === 0) {
    tips.push({ type: "info", key: "infoOk" });
  }

  return tips;
}