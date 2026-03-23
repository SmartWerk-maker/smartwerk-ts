"use client";

import React, { useMemo } from "react";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/app/i18n";

/* ================= TYPES ================= */

interface KPIGroupProps {
  revenue: number;
  unpaid: number;
  overdueCount: number;
  remindersSent: number;
  expenses: number;
  quoteWinRate: number;
  topClient: string | null;
}

type KpiLabels = {
  revenue: string;
  unpaid: string;
  overdue: string;
  expenses: string;
  quoteWinRate: string;
  remindersSent: string;
  topClient: string;
  noClient: string;
};

/* ================= COMPONENT ================= */

export default function KPIGroup({
  revenue,
  unpaid,
  overdueCount,
  remindersSent,
  expenses,
  quoteWinRate,
  topClient,
}: KPIGroupProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const t = useTranslation(language) as {
    kpi?: Partial<KpiLabels>;
  };

  /* ================= LABELS ================= */

  const labels: KpiLabels = useMemo(() => {
    const dict = t?.kpi ?? {};

    return {
      revenue: dict.revenue ?? "Revenue",
      unpaid: dict.unpaid ?? "Unpaid",
      overdue: dict.overdue ?? "Overdue",
      expenses: dict.expenses ?? "Expenses",
      quoteWinRate: dict.quoteWinRate ?? "Quote win rate",
      remindersSent: dict.remindersSent ?? "Reminders sent",
      topClient: dict.topClient ?? "Top client",
      noClient: dict.noClient ?? "No client yet",
    };
  }, [t?.kpi]);

  /* ================= HELPERS ================= */

  const formatMoney = (v: number) =>
    v.toLocaleString("en-GB", { maximumFractionDigits: 0 });

  const cardStyle: React.CSSProperties = {
    background: isDark ? "rgba(15,23,42,0.96)" : "#ffffff",
    boxShadow: isDark
      ? "0 18px 40px rgba(15,23,42,0.7)"
      : "0 16px 40px rgba(148,163,184,0.25)",
    borderRadius: 16,
    padding: "14px 16px",
  };

  const Card = (label: string, value: React.ReactNode) => (
    <div className="dash-card kpi-card" style={cardStyle}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </div>
  );

  /* ================= RENDER ================= */

  return (
    <>
      {Card(labels.revenue, `€${formatMoney(revenue)}`)}
      {Card(labels.unpaid, `€${formatMoney(unpaid)}`)}
      {Card(labels.quoteWinRate, `${quoteWinRate}%`)}
      {Card(labels.remindersSent, remindersSent)}
      {Card(labels.expenses, `€${formatMoney(expenses)}`)}
      {Card(labels.overdue, overdueCount)}
      {Card(labels.topClient, topClient ?? labels.noClient)}
    </>
  );
}