"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/app/i18n";

/* ================= TYPES ================= */

interface InvoiceStatusChartProps {
  paid: number;
  unpaid: number;
  overdue: number;
}

type InvoiceStatusLabels = {
  title: string;
  paid: string;
  unpaid: string;
  overdue: string;
};

type ChartItem = {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
};

/* ================= COMPONENT ================= */

export default function InvoiceStatusChart({
  paid,
  unpaid,
  overdue,
}: InvoiceStatusChartProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const t = useTranslation(language) as {
    charts?: {
      invoiceStatus?: Partial<InvoiceStatusLabels>;
    };
  } | null;

  if (!t) return null;

  /* ================= LABELS ================= */

  const dict = t.charts?.invoiceStatus ?? {};

  const labels: InvoiceStatusLabels = {
    title: dict.title ?? "Invoice status",
    paid: dict.paid ?? "Paid",
    unpaid: dict.unpaid ?? "Unpaid",
    overdue: dict.overdue ?? "Overdue",
  };

  /* ================= DATA ================= */

  const baseData: ChartItem[] = [
    { name: labels.paid, value: paid, color: "#22c55e" },
    { name: labels.unpaid, value: unpaid, color: "#3b82f6" },
    { name: labels.overdue, value: overdue, color: "#ef4444" },
  ];

  const data: ChartItem[] =
    baseData.some((i) => i.value > 0)
      ? baseData.filter((i) => i.value > 0)
      : [
          {
            name: "—",
            value: 1,
            color: isDark ? "#334155" : "#e5e7eb",
          },
        ];

  const textColor = isDark ? "#e5e7eb" : "#111827";

  /* ================= RENDER ================= */

  return (
    <div
      className="dash-card chart-card"
      style={{
        background: isDark ? "rgba(15,23,42,0.96)" : "#ffffff",
        boxShadow: isDark
          ? "0 18px 40px rgba(15,23,42,0.7)"
          : "0 16px 40px rgba(148,163,184,0.25)",
      }}
    >
      <h3 className="chart-header">{labels.title}</h3>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell
                key={`${entry.name}-${i}`}
                fill={entry.color}
                stroke={isDark ? "#0f172a" : "#ffffff"}
                strokeWidth={2}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              background: isDark ? "#1e293b" : "#ffffff",
              borderRadius: 8,
              border: "none",
              color: textColor,
            }}
            formatter={(value, name) => [
              `€${Number(value).toLocaleString("en-GB")}`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}