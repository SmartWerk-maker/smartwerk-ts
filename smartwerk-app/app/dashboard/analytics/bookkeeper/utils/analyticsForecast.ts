// app/dashboard/analytics/bookkeeper/utils/analyticsForecast.ts

import type { AnalyticsInvoice } from "../types";

/* ================= TYPES ================= */

export type MonthlyPoint = {
  month: string; // YYYY-MM
  income: number;
};

export type TopClient = {
  name: string;
  total: number;
};

/* ================= HELPERS ================= */

const monthKey = (d: string) => d.slice(0, 7);

/* ================= HISTORY ================= */

export function groupIncomeByMonth(
  invoices: AnalyticsInvoice[]
): MonthlyPoint[] {
  const map: Record<string, number> = {};

  invoices.forEach((i) => {
    if (!i.invoiceDate) return;
    const m = monthKey(i.invoiceDate);
    map[m] = (map[m] || 0) + i.grandTotal;
  });

  return Object.keys(map)
    .sort()
    .map((m) => ({
      month: m,
      income: map[m],
    }));
}

/* ================= FORECAST ================= */
/**
 * Простий трендовий forecast:
 * - рахує середню зміну між місяцями
 * - обмежує падіння / зростання (anti-noise)
 */
export function forecastIncome(
  history: MonthlyPoint[],
  monthsAhead = 6
): MonthlyPoint[] {
  if (history.length < 2) return [];

  const diffs: number[] = [];

  for (let i = 1; i < history.length; i++) {
    diffs.push(
      history[i].income - history[i - 1].income
    );
  }

  const avgDelta =
    diffs.reduce((s, d) => s + d, 0) / diffs.length;

  // 🔹 обмеження шуму
  const cappedDelta = Math.max(
    -history.at(-1)!.income * 0.3,
    Math.min(avgDelta, history.at(-1)!.income * 0.3)
  );

  const last = history.at(-1)!;
  const [y, m] = last.month.split("-").map(Number);

  let current = last.income;

  return Array.from({ length: monthsAhead }, (_, i) => {
    current = Math.max(0, Math.round(current + cappedDelta));
    const d = new Date(y, m - 1 + i + 1);

    return {
      month: d.toISOString().slice(0, 7),
      income: current,
    };
  });
}

/* ================= TARGET ETA ================= */

export function estimateTargetMonth(
  history: MonthlyPoint[],
  target: number
): string | "already" | null {
  if (history.length === 0) return null;

  const total = history.reduce(
    (s, m) => s + m.income,
    0
  );

  if (total >= target) return "already";

  const avg =
    total / history.length;

  if (avg <= 0) return null;

  const monthsNeeded = Math.ceil(
    (target - total) / avg
  );

  const last = history.at(-1)!;
  const [y, m] = last.month.split("-").map(Number);
  const d = new Date(y, m - 1 + monthsNeeded);

  return d.toISOString().slice(0, 7);
}

/* ================= TOP CLIENTS ================= */

export function topClients(
  invoices: AnalyticsInvoice[],
  limit = 5
): TopClient[] {
  const map: Record<string, number> = {};

  invoices.forEach((i) => {
    if (!i.clientName) return;
    map[i.clientName] =
      (map[i.clientName] || 0) + i.grandTotal;
  });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, total]) => ({
      name,
      total,
    }));
}