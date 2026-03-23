"use client";

import { eur } from "../utils/currency";
import type { AnalyticsStats } from "../types";

type Props = {
  stats: AnalyticsStats;
  target?: number;
  t?: {
    income?: string;
    expense?: string;
    profit?: string;
    vat?: string;
    target?: string;
    noData?: string;
  };
};

export default function AnalyticsStats({
  stats,
  target = 50000,
  t,
}: Props) {
  const hasData =
    stats.income !== 0 ||
    stats.expense !== 0 ||
    stats.vat !== 0;

  const percent =
    target > 0 && stats.income > 0
      ? Math.min(
          100,
          Math.round((stats.income / target) * 100)
        )
      : 0;

  const format = (value: number) =>
    hasData ? eur(value) : "—";

  return (
    <section className="analytics-stats">
      <div className="stat-card">
        <h3>{t?.income ?? "Total Income"}</h3>
        <p className="positive">
          {format(stats.income)}
        </p>
      </div>

      <div className="stat-card">
        <h3>{t?.expense ?? "Total Expenses"}</h3>
        <p className="negative">
          {format(stats.expense)}
        </p>
      </div>

      <div className="stat-card">
        <h3>{t?.profit ?? "Net Profit"}</h3>
        <p
          className={
            hasData && stats.profit >= 0
              ? "positive"
              : "negative"
          }
        >
          {format(stats.profit)}
        </p>
      </div>

      <div className="stat-card">
        <h3>{t?.vat ?? "Total VAT"}</h3>
        <p>{format(stats.vat)}</p>
      </div>

      <div className="stat-card wide">
        <h3>{t?.target ?? "Annual Target"}</h3>
        <p>{eur(target)}</p>

        {target > 0 && (
          <div
            className="progress"
            aria-label={t?.target ?? "Annual Target"}
          >
            <div
              className="progress-bar"
              style={{ width: `${percent}%` }}
            >
              {percent}%
            </div>
          </div>
        )}

        {!hasData && (
          <small className="muted">
            {t?.noData ??
              "No financial data available for the selected scope."}
          </small>
        )}
      </div>
    </section>
  );
}