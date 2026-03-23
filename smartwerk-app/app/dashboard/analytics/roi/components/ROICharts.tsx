"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import Chart from "chart.js/auto";
import type { ChartOptions } from "chart.js";
import type { ROII18n } from "../types";

type Props = {
  t: ROII18n;
  investment: number;
  monthlyProfit: number;
  months: number;
  extraCosts: number;
};

function cssVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function getChartTheme() {
  return {
    text: cssVar("--text") || "#111827",
    textMuted: cssVar("--text-muted") || "rgba(17,24,39,.65)",
    grid: cssVar("--line") || "rgba(148,163,184,.25)",
    primary: cssVar("--primary") || "#3b82f6",
    success: cssVar("--success") || "#22c55e",
    danger: cssVar("--danger") || "#ef4444",
    card: cssVar("--card") || "#ffffff",
    border: cssVar("--border") || "rgba(148,163,184,.25)",
  };
}

export default function ROICharts({
  t,
  investment,
  monthlyProfit,
  months,
  extraCosts,
}: Props) {
  const growthRef = useRef<HTMLCanvasElement>(null);
  const cumulativeRef = useRef<HTMLCanvasElement>(null);

  const growthChart = useRef<Chart | null>(null);
  const cumulativeChart = useRef<Chart | null>(null);

  const points = useMemo(() => {
    if (months <= 0) return null;

    let cumulative = -investment - extraCosts;

    return Array.from({ length: months }, (_, i) => {
      cumulative += monthlyProfit;
      return { month: i + 1, profit: cumulative };
    });
  }, [investment, monthlyProfit, months, extraCosts]);

  const destroyCharts = useCallback(() => {
    growthChart.current?.destroy();
    cumulativeChart.current?.destroy();
    growthChart.current = null;
    cumulativeChart.current = null;
  }, []);

  const renderCharts = useCallback(() => {
    if (!points || !growthRef.current || !cumulativeRef.current) return;

    const theme = getChartTheme();
    destroyCharts();

    const commonOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: {
          labels: {
            color: theme.textMuted,
            usePointStyle: true,
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: theme.card,
          titleColor: theme.text,
          bodyColor: theme.textMuted,
          borderColor: theme.border,
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: theme.textMuted },
          grid: { color: theme.grid },
        },
        y: {
          ticks: { color: theme.textMuted },
          grid: { color: theme.grid },
        },
      },
    };

    growthChart.current = new Chart(growthRef.current, {
      type: "line",
      data: {
        labels: points.map((d) => `${t.charts.month} ${d.month}`),
        datasets: [
          {
            label: t.charts.monthlyProfit,
            data: points.map(() => monthlyProfit),
            borderColor: theme.primary,
            borderWidth: 3,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: theme.primary,
          },
        ],
      },
      options: commonOptions,
    });

    cumulativeChart.current = new Chart(cumulativeRef.current, {
      type: "line",
      data: {
        labels: points.map((d) => `${t.charts.month} ${d.month}`),
        datasets: [
          {
            label: t.charts.cumulativeProfit,
            data: points.map((d) => d.profit),
            borderColor: theme.success,
            borderWidth: 3,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: theme.success,
          },
        ],
      },
      options: commonOptions,
    });
  }, [points, monthlyProfit, t, destroyCharts]);

  useEffect(() => {
    renderCharts();
    return () => destroyCharts();
  }, [renderCharts, destroyCharts]);

  useEffect(() => {
    const observer = new MutationObserver(renderCharts);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [renderCharts]);

  if (!points) return null;

  return (
    <section className="roi-charts">
      <div className="chart-card">
        <h3>📈 {t.charts.growthTitle}</h3>
        <canvas ref={growthRef} />
      </div>

      <div className="chart-card">
        <h3>📉 {t.charts.cumulativeTitle}</h3>
        <canvas ref={cumulativeRef} />
      </div>
    </section>
  );
}