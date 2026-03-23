"use client";

import {
  groupIncomeByMonth,
  forecastIncome,
  estimateTargetMonth,
  topClients,
} from "../utils/analyticsForecast";

import type { AnalyticsInvoice } from "../types";

type Props = {
  invoices: AnalyticsInvoice[];
  annualTarget?: number;
  t?: {
    title?: string;
    avgMonthly?: string;
    target?: string;
    reach?: string;
    already?: string;
    topClients?: string;
    projection?: string;
    note?: string;
  };
};

export default function AnalyticsForecast({
  invoices,
  annualTarget = 50000,
  t,
}: Props) {
  const history = groupIncomeByMonth(invoices);
  const forecast = forecastIncome(history, 6);
  const targetMonth = estimateTargetMonth(
    history,
    annualTarget
  );
  const clients = topClients(invoices);

  const avg =
    history.length > 0
      ? Math.round(
          history.reduce(
            (s, m) => s + m.income,
            0
          ) / history.length
        )
      : 0;

  return (
    <section className="dash-card">
      <h2>
        🔮 {t?.title ?? "Forecast & Projections"}
      </h2>

      <div className="stats-grid">
        <div className="stat">
          <span>
            {t?.avgMonthly ?? "Avg Monthly Income"}
          </span>
          <strong>€{avg.toLocaleString()}</strong>
        </div>

        <div className="stat">
          <span>{t?.target ?? "Target"}</span>
          <strong>
            €{annualTarget.toLocaleString()}
          </strong>
        </div>

        <div className="stat">
          <span>{t?.reach ?? "Target reached"}</span>
          <strong>
            {targetMonth === "already"
              ? t?.already ?? "Already reached"
              : targetMonth ?? "—"}
          </strong>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 12 }}>
        {t?.note ??
          "Forecast is based on historical averages and recent trends. Values are estimates, not guarantees."}
      </p>

      {/* TOP CLIENTS */}
      <h3 style={{ marginTop: 24 }}>
        👤 {t?.topClients ?? "Top Clients"}
      </h3>

      <ul className="simple-list">
        {clients.map((c) => (
          <li key={c.name}>
            {c.name} — €
            {c.total.toLocaleString("nl-NL", {
              minimumFractionDigits: 2,
            })}
          </li>
        ))}
      </ul>

      {/* FORECAST TABLE */}
      <h3 style={{ marginTop: 24 }}>
        📈 {t?.projection ?? "6-Month Projection"}
      </h3>

      <table className="simple-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Expected Income</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f) => (
            <tr key={f.month}>
              <td>{f.month}</td>
              <td>
                €{f.income.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}