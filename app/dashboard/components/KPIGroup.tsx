"use client";

import React, { useMemo } from "react";
import { useLanguage } from "@/app/providers/LanguageProvider";
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
  const t = useTranslation(language) as {
    kpi?: Partial<KpiLabels>;
  };

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

  const formatMoney = (v: number) =>
    v.toLocaleString("en-GB", { maximumFractionDigits: 0 });

  const Card = (
    label: string,
    value: React.ReactNode,
    highlight?: boolean
  ) => (
    <div className="dash-card kpi-card">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </div>
  );

  return (
    <>
      {Card(labels.revenue, `€${formatMoney(revenue)}`, true)}
      {Card(labels.unpaid, `€${formatMoney(unpaid)}`)}
      {Card(labels.quoteWinRate, `${quoteWinRate}%`)}
      {Card(labels.remindersSent, remindersSent)}
      {Card(labels.expenses, `€${formatMoney(expenses)}`)}
      {Card(labels.overdue, overdueCount)}
      {Card(labels.topClient, topClient ?? labels.noClient)}
    </>
  );
}