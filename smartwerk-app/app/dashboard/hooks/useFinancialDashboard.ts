"use client";

import { useMemo } from "react";
import { Timestamp } from "firebase/firestore";

import { useInvoices } from "./useInvoices";
import { useQuotes } from "./useQuotes";
import { useExpenses } from "./useExpenses";
import { useClients } from "./useClients";
import { useReminders } from "./useReminders";

/* ================= TYPES ================= */

export interface FinancialDashboard {
  totals: {
    revenue: number;
    unpaid: number;
    overdueCount: number;
    expenses: number;
    topClient: string | null;
    remindersNeeded: number;
    remindersSent: number;

  };

  ratios: {
    quoteWinRate: number;
    overdueRatio: number;
  };

  trends: {
    revenueByMonth: { month: string; value: number }[];
    expensesByMonth: { month: string; value: number }[];
  };

  performanceScore: number;
}

/* ================= HELPERS ================= */

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

type DateLike = Timestamp | Date | string;

function isDateLike(v: unknown): v is DateLike {
  return v instanceof Timestamp || v instanceof Date || typeof v === "string";
}

function toDate(value: DateLike | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDueDateFromUnknown(obj: unknown): Date | null {
  if (!obj || typeof obj !== "object") return null;
  if (!("dueDate" in obj)) return null;

  const raw = (obj as { dueDate?: unknown }).dueDate;
  if (!isDateLike(raw)) return null;

  return toDate(raw);
}

/* ================= HOOK ================= */

export function useFinancialDashboard(
  uid: string | undefined
): FinancialDashboard {
  const invoices = useInvoices(uid);
  const quotes = useQuotes(uid);
  const expenses = useExpenses(uid);
  const clients = useClients(uid);
  const reminders = useReminders(uid);

  return useMemo<FinancialDashboard>(() => {
    if (!uid) {
      return {
        totals: { revenue: 0, unpaid: 0, overdueCount: 0, expenses: 0, topClient: null, remindersNeeded: 0, remindersSent: 0, }, 
        ratios: { quoteWinRate: 0, overdueRatio: 0 },
        trends: { revenueByMonth: [], expensesByMonth: [] },
        performanceScore: 0, 
      };
    }

    const now = new Date();

    /* ================= INVOICES ================= */

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const sentInvoices = invoices.filter((i) => i.status === "sent");

    const revenue = paidInvoices.reduce((sum, i) => sum + num(i.total), 0);
    const unpaid = sentInvoices.reduce((sum, i) => sum + num(i.total), 0);

    const overdueInvoices = sentInvoices.filter((i) => {
      const due = getDueDateFromUnknown(i);
      return due ? due < now : false;
    });

    const overdueCount = overdueInvoices.length;

    /* ================= QUOTES ================= */

    const sentOrAccepted = quotes.filter(
    (q) => q.status === "sent" || q.status === "accepted"
    ).length;

    const acceptedQuotes = quotes.filter(
   (q) => q.status === "accepted"
    ).length;

const quoteWinRate =
  sentOrAccepted > 0
    ? Math.round((acceptedQuotes / sentOrAccepted) * 100)
    : 0;

    /* ================= EXPENSES ================= */

    const paidExpenses = expenses.filter(
  (e) => e.status === "paid"
);

const expensesTotal = paidExpenses.reduce(
  (sum, e) => sum + num(e.total),
  0
);

/* ================= TOP CLIENT ================= */

const revenueByClient = new Map<string, number>();

paidInvoices.forEach((i) => {
  if (!i.clientId) return;

  revenueByClient.set(
    i.clientId,
    (revenueByClient.get(i.clientId) ?? 0) + num(i.total)
  );
});

const topClientEntry = Array.from(revenueByClient.entries())
  .sort((a, b) => b[1] - a[1])[0];

const topClient =
  topClientEntry
    ? clients.find((c) => c.clientId === topClientEntry[0])?.clientName ?? null
    : null;

    /* ================= REMINDERS ================= */

 const remindersNeeded = overdueInvoices.filter((inv) => {
  const hasReminder = reminders.some(
    (r) =>
      r.linkedInvoiceId === inv.id &&
      (r.status === "sent" || r.status === "paid")
  );
  return !hasReminder;
}).length;

    const remindersSent = reminders.filter(
  (r) => r.status === "sent" && r.linkedInvoiceId
).length;
    /* ================= TRENDS ================= */

    const revenueByMonthMap = new Map<string, number>();
    paidInvoices.forEach((i) => {
      const d = toDate(i.createdAt);
      if (!d) return;
      const key = monthKey(d);
      revenueByMonthMap.set(key, (revenueByMonthMap.get(key) ?? 0) + num(i.total));
    });

    const expensesByMonthMap = new Map<string, number>();
    expenses.forEach((e) => {
      const d = toDate(e.createdAt);
      if (!d) return;
      const key = monthKey(d);
      expensesByMonthMap.set(key, (expensesByMonthMap.get(key) ?? 0) + num(e.total));
    });

    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value }));

    const expensesByMonth = Array.from(expensesByMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value }));

    /* ================= RATIOS ================= */

    const overdueRatio =
  sentInvoices.length > 0
    ? Math.round((overdueCount / sentInvoices.length) * 100)
    : 0;

    /* ================= PERFORMANCE SCORE ================= */

    let score = 100;

    if (overdueRatio > 40) score -= 25;
    else if (overdueRatio > 20) score -= 10;

    if (quoteWinRate < 20) score -= 25;
    else if (quoteWinRate < 40) score -= 10;

    if (revenue > 0) {
      const expenseRate = Math.round((expensesTotal / revenue) * 100);
      if (expenseRate > 60) score -= 20;
      else if (expenseRate > 40) score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      totals: { revenue, unpaid, overdueCount, expenses: expensesTotal, topClient, remindersNeeded, remindersSent },
      ratios: { quoteWinRate, overdueRatio },
      trends: { revenueByMonth, expensesByMonth },
      performanceScore: score,
    };
  }, [uid, invoices, quotes, expenses, clients, reminders]);
}