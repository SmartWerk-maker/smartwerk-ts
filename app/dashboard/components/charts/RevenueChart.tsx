"use client";

import React from "react";
import {
  AreaChart,
  Area,
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

/* ================= COMPONENT ================= */

export default function RevenueChart({ data }: RevenueChartProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const t = useTranslation(language) as any;
  if (!t) return null;

  const labels = {
    title: t?.charts?.revenue?.title ?? "Revenue trend",
    tooltip: t?.charts?.revenue?.tooltip ?? "Revenue",
  };

  const chartData =
    data.length > 0
      ? data
      : [
          { month: "Jan", value: 0 },
          { month: "Feb", value: 0 },
          { month: "Mar", value: 0 },
          { month: "Apr", value: 0 },
        ];

  /* ================= COLORS ================= */

  const gridColor = isDark
    ? "rgba(148,163,184,0.12)"
    : "rgba(0,0,0,0.08)";

  const textColor = isDark
    ? "rgba(226,232,240,0.8)"
    : "#374151";

  const tooltipBg = isDark ? "#020617" : "#ffffff";
  const tooltipText = isDark ? "#ffffff" : "#111827";

  /* ================= RENDER ================= */

  return (
    <div className="dash-card chart-card">
      <div className="chart-header-row">
        <h3 className="chart-header">{labels.title}</h3>
        <span className="chart-badge">+12%</span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          {/* 🔥 PREMIUM GRADIENT + GLOW */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
            </linearGradient>

            {/* glow */}
            <filter id="revenueGlow" height="200%">
              <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="8"
                floodColor="#6366f1"
                floodOpacity="0.35"
              />
            </filter>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />

          <XAxis
            dataKey="month"
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          {/* 🔥 FIX TOOLTIP */}
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              color: tooltipText,
            }}
            labelStyle={{
              color: tooltipText,
              fontWeight: 600,
            }}
            formatter={(value: number) => [
              `€${value.toLocaleString("en-GB")}`,
              labels.tooltip,
            ]}
          />

          {/* 🔥 PREMIUM AREA */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={3}
            fill="url(#revenueGradient)"
            filter="url(#revenueGlow)"
            dot={false}
            activeDot={{
              r: 7,
              stroke: "#ffffff",
              strokeWidth: 2,
              fill: "#6366f1",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}