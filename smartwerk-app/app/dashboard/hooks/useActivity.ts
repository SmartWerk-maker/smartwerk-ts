"use client";

import { useMemo } from "react";
import type { Timestamp } from "firebase/firestore";

import { useInvoices } from "./useInvoices";
import { useQuotes } from "./useQuotes";
import { useExpenses } from "./useExpenses";

/* ================= TYPES ================= */

export type ActivityType = "invoice" | "quote" | "expense";

export interface ActivityLog {
  id: string;
  uid: string;
  type: ActivityType;
  message: string;
  createdAt: Timestamp;
}

/* ================= HOOK ================= */

export function useActivity(uid: string | undefined): ActivityLog[] {
  const invoices = useInvoices(uid);
  const quotes = useQuotes(uid);
  const expenses = useExpenses(uid);

  return useMemo(() => {
    if (!uid) return [];

    const invoiceActivity: ActivityLog[] = invoices.map((i) => ({
      id: `invoice-${i.id}`,
      uid,
      type: "invoice",
      message: `Invoice ${i.number} • ${i.status.toUpperCase()}`,
      createdAt: i.createdAt,
    }));

    const quoteActivity: ActivityLog[] = quotes.map((q) => ({
      id: `quote-${q.id}`,
      uid,
      type: "quote",
      message: `Quote ${q.number} • ${q.status}`,
      createdAt: q.createdAt,
    }));

    const expenseActivity: ActivityLog[] = expenses.map((e) => ({
      id: `expense-${e.id}`,
      uid,
      type: "expense",
      message: `Expense • €${e.total}`,
      createdAt: e.createdAt,
    }));

    return [...invoiceActivity, ...quoteActivity, ...expenseActivity]
      .sort(
        (a, b) =>
          b.createdAt.toDate().getTime() -
          a.createdAt.toDate().getTime()
      )
      .slice(0, 20);
  }, [uid, invoices, quotes, expenses]);
}