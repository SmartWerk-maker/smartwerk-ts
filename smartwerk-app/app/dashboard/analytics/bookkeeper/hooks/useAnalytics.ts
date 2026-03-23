// app/dashboard/analytics/bookkeeper/hooks/useAnalytics.ts

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/firebase";

import { filterByPeriod } from "../utils/period";
import { normalizeInvoice, normalizeExpense } from "../utils/normalize";

import type {
  AnalyticsFilters,
  AnalyticsInvoice,
  AnalyticsExpense,
  AnalyticsStats,
  AnalyticsChartsData,
  AnalyticsClient,
} from "../types";

/* ================= TYPES ================= */

export type AnalyticsScope =
  | { type: "all"; value: null }
  | { type: "client"; value: string };

export type AnalyticsPeriodView =
  | { type: "all" }
  | { type: "thisMonth" }
  | { type: "lastMonth" }
  | { type: "thisYear" }
  | { type: "custom"; from: string; to: string };

/* ================= HOOK ================= */

export function useAnalytics() {
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<AnalyticsFilters>({
    client: "",
    period: "all",
  });

  const [invoices, setInvoices] = useState<AnalyticsInvoice[]>([]);
  const [expenses, setExpenses] = useState<AnalyticsExpense[]>([]);
  const [clients, setClients] = useState<AnalyticsClient[]>([]);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    let mounted = true;

    async function load() {
      const user = auth.currentUser;

      // якщо користувача нема — просто знімаємо loading
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) setLoading(true);

      const [inv, exp, cli] = await Promise.all([
        getDocs(collection(db, "users", user.uid, "invoices")),
        getDocs(collection(db, "users", user.uid, "expenses")),
        getDocs(collection(db, "users", user.uid, "clients")),
      ]);

      const invList = inv.docs
        .map((d) => normalizeInvoice(d.data()))
        .filter(Boolean) as AnalyticsInvoice[];

      const expList = exp.docs
        .map((d) => normalizeExpense(d.data()))
        .filter(Boolean) as AnalyticsExpense[];

      const cliList: AnalyticsClient[] = cli.docs.map((d) => ({
        id: d.id,
        clientName: String(d.data().clientName ?? ""),
      }));

      if (!mounted) return;

      setInvoices(invList);
      setExpenses(expList);
      setClients(cliList);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  /* ================= FILTERED DATA ================= */
  // ✅ invoices фільтруємо по paidDate (якщо є), інакше invoiceDate
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((i) => filterByPeriod(i.paidDate ?? i.invoiceDate, filters))
      .filter((i) => (filters.client ? i.clientName === filters.client : true));
  }, [invoices, filters]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => filterByPeriod(e.date, filters));
  }, [expenses, filters]);

  /* ================= BUSINESS VIEWS ================= */
  // ✅ тільки paid = реальні гроші для income/vat і summary charts
  const paidInvoices = useMemo(() => {
    return filteredInvoices.filter((i) => i.status === "paid");
  }, [filteredInvoices]);

  /* ================= STATS ================= */

  const stats: AnalyticsStats = useMemo(() => {
    const income = paidInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const vat = paidInvoices.reduce((s, i) => s + i.totalVat, 0);
    const expense = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    return {
      income,
      vat,
      expense,
      profit: income - expense,
    };
  }, [paidInvoices, filteredExpenses]);

  /* ================= CHARTS ================= */

  const charts: AnalyticsChartsData = useMemo(() => {
    return {
      summary: {
        invoices: paidInvoices,
        expenses: filteredExpenses,
      },
      byClient: paidInvoices,
    };
  }, [paidInvoices, filteredExpenses]);

  /* ================= SCOPE ================= */

  const scope: AnalyticsScope = useMemo(() => {
    return filters.client
      ? { type: "client", value: filters.client }
      : { type: "all", value: null };
  }, [filters.client]);

  /* ================= PERIOD VIEW ================= */

  const period: AnalyticsPeriodView = useMemo(() => {
    if (filters.period === "custom" && filters.from && filters.to) {
      return { type: "custom", from: filters.from, to: filters.to };
    }

    switch (filters.period) {
      case "thisMonth":
        return { type: "thisMonth" };
      case "lastMonth":
        return { type: "lastMonth" };
      case "thisYear":
        return { type: "thisYear" };
      default:
        return { type: "all" };
    }
  }, [filters.period, filters.from, filters.to]);

  /* ================= LEGACY LABELS (UI SAFE) ================= */
  // (тут поки EN, i18n робимо в UI рівні — AnalyticsClient.tsx)

  const scopeLabel =
    scope.type === "client" ? `Client: ${scope.value}` : "All clients";

  const periodLabel =
    period.type === "custom"
      ? `${period.from} → ${period.to}`
      : period.type === "thisMonth"
      ? "This month"
      : period.type === "lastMonth"
      ? "Last month"
      : period.type === "thisYear"
      ? "This year"
      : "All time";

  /* ================= RETURN ================= */

  return {
    loading,
    filters,
    setFilters,

    stats,
    charts,
    clients,

    // structured (for i18n / future)
    scope,
    period,

    // UI safe
    scopeLabel,
    periodLabel,
  };
}