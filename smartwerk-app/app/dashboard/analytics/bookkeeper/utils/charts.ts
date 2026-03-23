// app/dashboard/analytics/bookkeeper/utils/charts.ts
import type {
  AnalyticsExpense,
  AnalyticsInvoice,
} from "../types";

type DateLike = string | number | Date;

function monthKey(value: DateLike): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    if (value.length < 7) return null;
    return value.slice(0, 7);
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 7);
}

/* ================= GROUPERS ================= */

export function groupInvoicesByMonth(
  invoices: AnalyticsInvoice[]
): Record<string, number> {
  const map: Record<string, number> = {};

  invoices.forEach((i) => {
    const m = monthKey(i.invoiceDate);
    if (!m) return;

    map[m] =
      (map[m] || 0) + (Number(i.grandTotal) || 0);
  });

  return map;
}

export function groupExpensesByMonth(
  expenses: AnalyticsExpense[]
): Record<string, number> {
  const map: Record<string, number> = {};

  expenses.forEach((e) => {
    const m = monthKey(e.date);
    if (!m) return;

    map[m] =
      (map[m] || 0) + (Number(e.amount) || 0);
  });

  return map;
}

export function incomeByClient(
  invoices: AnalyticsInvoice[]
): Record<string, number> {
  const map: Record<string, number> = {};

  invoices.forEach((i) => {
    const name = (i.clientName || "").trim();
    if (!name) return;

    map[name] =
      (map[name] || 0) + (Number(i.grandTotal) || 0);
  });

  return map;
}