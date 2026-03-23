"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/app/i18n";

/* ================= TYPES ================= */

interface RevenueChartProps {
  data: { month: string; value: number }[];
}

type RevenueLabels = {
  title: string;
  tooltip: string;
};

type ChartItem = {
  month: string;
  value: number;
  [key: string]: string | number;
};

/* ================= COMPONENT ================= */

export default function RevenueChart({ data }: RevenueChartProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const t = useTranslation(language) as {
    charts?: {
      revenue?: Partial<RevenueLabels>;
    };
  } | null;

  if (!t) return null;

  /* ================= LABELS ================= */

  const dict = t.charts?.revenue ?? {};

  const labels: RevenueLabels = {
    title: dict.title ?? "Revenue trend",
    tooltip: dict.tooltip ?? "Revenue",
  };

  /* ================= DATA ================= */

  const chartData: ChartItem[] =
    data.length > 0
      ? data
      : [
          { month: "Jan", value: 0 },
          { month: "Feb", value: 0 },
          { month: "Mar", value: 0 },
          { month: "Apr", value: 0 },
        ];

  const gridColor = isDark
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.1)";

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
        <LineChart data={chartData}>
          <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />

          <XAxis dataKey="month" stroke={textColor} />
          <YAxis stroke={textColor} />

          <Tooltip
            contentStyle={{
              background: isDark ? "#1e293b" : "#ffffff",
              borderRadius: 8,
              border: "none",
              color: textColor,
            }}
            formatter={(value: number) => [
              `€${value.toLocaleString("en-GB")}`,
              labels.tooltip,
            ]}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}