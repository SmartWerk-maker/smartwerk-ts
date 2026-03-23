// app/dashboard/analytics/bookkeeper/utils/normalize.ts

import {
  AnalyticsInvoice,
  AnalyticsExpense,
} from "../types";

/* ================= HELPERS ================= */

function normalizeStatus(value: unknown): AnalyticsInvoice["status"] {
  const v = String(value ?? "").toLowerCase();
  if (v === "paid" || v === "sent" || v === "draft") return v;
  return "draft";
}

/* ================= INVOICE ================= */

export function normalizeInvoice(raw: unknown): AnalyticsInvoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const invoiceDate = r.invoiceDate ?? r.date;
  if (!invoiceDate) return null;

  return {
    clientName: String(r.clientName ?? ""),
    invoiceDate: String(invoiceDate),
    dueDate: r.dueDate ? String(r.dueDate) : undefined,
    paidDate: r.paidDate ? String(r.paidDate) : undefined,
    status: normalizeStatus(r.status),
    grandTotal: Number(r.grandTotal ?? r.total ?? 0),
    totalVat: Number(r.totalVat ?? 0),
  };
}

/* ================= EXPENSE ================= */

export function normalizeExpense(raw: unknown): AnalyticsExpense | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!r.date) return null;

  return {
    date: String(r.date),
    amount: Number(r.amount ?? r.total ?? 0),
    category: r.category ? String(r.category) : undefined,
  };
}