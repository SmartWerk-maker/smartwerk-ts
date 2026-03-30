"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/app/i18n";

/* ================= TYPES ================= */

interface InvoiceStatusChartProps {
  paid: number;
  unpaid: number;
  overdue: number;
}

/* ================= COMPONENT ================= */

export default function InvoiceStatusChart({
  paid,
  unpaid,
  overdue,
}: InvoiceStatusChartProps) {
  const { language } = useLanguage();
  const { isDark } = useTheme();

  const t = useTranslation(language) as any;
  if (!t) return null;

  const labels = {
    title: t?.charts?.invoiceStatus?.title ?? "Invoice status",
    paid: t?.charts?.invoiceStatus?.paid ?? "Paid",
    unpaid: t?.charts?.invoiceStatus?.unpaid ?? "Unpaid",
    overdue: t?.charts?.invoiceStatus?.overdue ?? "Overdue",
  };

  /* ================= DATA ================= */

  const data = [
    { name: labels.paid, value: paid, color: "#22c55e" },
    { name: labels.unpaid, value: unpaid, color: "#3b82f6" },
    { name: labels.overdue, value: overdue, color: "#ef4444" },
  ].filter((i) => i.value > 0);

  const total = paid + unpaid + overdue;

  /* ================= RENDER ================= */

  return (
    <div className="dash-card chart-card">
      <div className="chart-header-row">
        <h3 className="chart-header">{labels.title}</h3>
      </div>

      <div className="donut-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            {/* glow filter */}
            <defs>
              <filter id="donutGlow">
                <feDropShadow
                  dx="0"
                  dy="8"
                  stdDeviation="10"
                  floodColor="#000"
                  floodOpacity="0.35"
                />
              </filter>
            </defs>

            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={4}
              dataKey="value"
              stroke={isDark ? "#020617" : "#ffffff"}
              strokeWidth={4}
              filter="url(#donutGlow)"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: isDark
                  ? "rgba(15,23,42,0.96)"
                  : "#ffffff",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 12,
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
              formatter={(value: number, name: string) => [
                `€${value.toLocaleString("en-GB")}`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* 🔥 CENTER */}
        <div className="donut-center">
          <div className="donut-total">
            €{total.toLocaleString("en-GB")}
          </div>
          <div className="donut-sub">Total</div>
        </div>
      </div>

      {/* 🔥 LEGEND */}
      <div className="donut-legend">
        {data.map((item) => (
          <div key={item.name} className="legend-item">
            <span
              className="legend-dot"
              style={{ background: item.color }}
            />
            <span className="legend-label">{item.name}</span>
            <span className="legend-value">
              €{item.value.toLocaleString("en-GB")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}