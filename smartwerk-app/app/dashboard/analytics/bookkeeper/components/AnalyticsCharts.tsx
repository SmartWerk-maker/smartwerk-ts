"use client";

import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";

import type { AnalyticsChartsData } from "../types";
import {
  groupInvoicesByMonth,
  groupExpensesByMonth,
  incomeByClient,
} from "../utils/charts";

type Props = {
  charts: AnalyticsChartsData;
  t?: {
    summaryTitle?: string;
    byClientTitle?: string;
    income?: string;
    expenses?: string;
    noData?: string;
  };
};

/* ================= THEME FROM BODY ================= */

function getChartTheme() {
  const isDark =
    document.body.classList.contains("theme-dark");

  return isDark
    ? {
        text: "#9ca3af",
        grid: "rgba(255,255,255,0.08)",
        income: "#22c55e",
        expense: "#ef4444",
      }
    : {
        text: "#64748b",
        grid: "rgba(15,23,42,0.08)",
        income: "#16a34a",
        expense: "#dc2626",
      };
}

export default function AnalyticsCharts({ charts, t }: Props) {
  const summaryRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<HTMLCanvasElement>(null);

  const summaryChart = useRef<Chart | null>(null);
  const clientChart = useRef<Chart | null>(null);

  const labels = useMemo(
    () => ({
      income: t?.income ?? "Income",
      expenses: t?.expenses ?? "Expenses",
      summaryTitle:
        t?.summaryTitle ?? "Income vs Expenses",
      byClientTitle:
        t?.byClientTitle ?? "Income by Client",
      noData:
        t?.noData ??
        "No data for selected period",
    }),
    [t]
  );

  const hasSummaryData =
    charts.summary.invoices.length > 0 ||
    charts.summary.expenses.length > 0;

  const hasClientData = charts.byClient.length > 1;

  /* ================= SUMMARY ================= */

  const renderSummary = () => {
    if (!summaryRef.current || !hasSummaryData) return;

    summaryChart.current?.destroy();

    const theme = getChartTheme();

    const income = groupInvoicesByMonth(
      charts.summary.invoices
    );
    const expenses = groupExpensesByMonth(
      charts.summary.expenses
    );

    const months = Array.from(
      new Set([
        ...Object.keys(income),
        ...Object.keys(expenses),
      ])
    ).sort();

    summaryChart.current = new Chart(
      summaryRef.current,
      {
        type: "bar",
        data: {
          labels: months,
          datasets: [
            {
              label: labels.income,
              data: months.map(
                (m) => income[m] || 0
              ),
              backgroundColor: theme.income,
              borderRadius: 8,
            },
            {
              label: labels.expenses,
              data: months.map(
                (m) => expenses[m] || 0
              ),
              backgroundColor: theme.expense,
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: theme.text,
                font: { size: 12 },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: theme.text },
              grid: { color: theme.grid },
            },
            y: {
              ticks: { color: theme.text },
              grid: { color: theme.grid },
            },
          },
        },
      }
    );
  };

  /* ================= CLIENT ================= */

  const renderClient = () => {
    if (!clientRef.current || !hasClientData) return;

    clientChart.current?.destroy();

    const theme = getChartTheme();
    const data = incomeByClient(charts.byClient);
    const names = Object.keys(data);

    clientChart.current = new Chart(
      clientRef.current,
      {
        type: "pie",
        data: {
          labels: names,
          datasets: [
            {
              data: Object.values(data),
              backgroundColor: names.map(
                (_, i) =>
                  `hsl(${
                    (i * 360) / names.length
                  }, 70%, 60%)`
              ),
              borderColor: theme.grid,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "right",
              labels: {
                color: theme.text,
                font: { size: 12 },
              },
            },
          },
        },
      }
    );
  };

  /* ================= EFFECTS ================= */

  useEffect(() => {
    renderSummary();
    renderClient();

    return () => {
      summaryChart.current?.destroy();
      clientChart.current?.destroy();
    };
    // eslint-disable-next-line
  }, [charts]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      renderSummary();
      renderClient();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
    // eslint-disable-next-line
  }, []);

  /* ================= UI ================= */

  return (
    <section className="analytics-charts">
      <div className="chart-card">
        <h3>📊 {labels.summaryTitle}</h3>
        <div className="chart-canvas">
          {hasSummaryData ? (
            <canvas ref={summaryRef} />
          ) : (
            <p className="muted">
              {labels.noData}
            </p>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h3>📊 {labels.byClientTitle}</h3>
        <div className="chart-canvas">
          {hasClientData ? (
            <canvas ref={clientRef} />
          ) : (
            <p className="muted">
              {labels.noData}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}