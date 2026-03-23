// app/dashboard/analytics/bookkeeper/utils/analyticsExport.ts

import type { AnalyticsStats } from "../types";

function eur(n: number) {
  return `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
  })}`;
}

export function exportAnalyticsCSV(
  stats: AnalyticsStats,
  scopeLabel: string,
  periodLabel: string
) {
  const rows: string[][] = [
    ["Scope", scopeLabel],
    ["Period", periodLabel],
    [""],
    ["Metric", "Value"],
    ["Total Income", eur(stats.income)],
    ["Total Expenses", eur(stats.expense)],
    ["Net Profit", eur(stats.profit)],
    ["Total VAT", eur(stats.vat)],
  ];

  const csv =
    "data:text/csv;charset=utf-8," +
    rows.map((r) => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csv);
  link.download = `analytics-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}