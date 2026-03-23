"use client";

import type {
  AnalyticsFilters as AnalyticsFiltersType,
  AnalyticsClient,
  AnalyticsPeriod,
} from "../types";

type Props = {
  filters: AnalyticsFiltersType;
  clients: AnalyticsClient[];
  onChange: (f: AnalyticsFiltersType) => void;
  t?: {
    client?: string;
    allClients?: string;
    period?: string;
    from?: string;
    to?: string;
    customHint?: string;
    periods?: Partial<Record<AnalyticsPeriod, string>>;
  };
};

export default function AnalyticsFilters({
  filters,
  clients,
  onChange,
  t,
}: Props) {
  const isCustom = filters.period === "custom";
  const isCustomIncomplete =
    isCustom && (!filters.from || !filters.to);

  return (
    <section className="dash-card analytics-filters">
      {/* ===== CLIENT ===== */}
      <div className="filter-group">
        <label className="filter-label">
          {t?.client ?? "Client"}
        </label>

        <select
          value={filters.client}
          onChange={(e) =>
            onChange({
              ...filters,
              client: e.target.value,
            })
          }
        >
          <option value="">
            {t?.allClients ?? "All clients"}
          </option>

          {clients.map((c) => (
            <option key={c.id} value={c.clientName}>
              {c.clientName}
            </option>
          ))}
        </select>
      </div>

      {/* ===== PERIOD ===== */}
      <div className="filter-group">
        <label className="filter-label">
          {t?.period ?? "Period"}
        </label>

        <select
          value={filters.period}
          onChange={(e) => {
            const nextPeriod =
              e.target.value as AnalyticsPeriod;

            onChange({
              ...filters,
              period: nextPeriod,
              from:
                nextPeriod === "custom"
                  ? filters.from
                  : undefined,
              to:
                nextPeriod === "custom"
                  ? filters.to
                  : undefined,
            });
          }}
        >
          <option value="all">
            {t?.periods?.all ?? "All time"}
          </option>
          <option value="thisMonth">
            {t?.periods?.thisMonth ?? "This month"}
          </option>
          <option value="lastMonth">
            {t?.periods?.lastMonth ?? "Last month"}
          </option>
          <option value="thisYear">
            {t?.periods?.thisYear ?? "This year"}
          </option>
          <option value="custom">
            {t?.periods?.custom ?? "Custom range"}
          </option>
        </select>
      </div>

      {/* ===== CUSTOM RANGE ===== */}
      {isCustom && (
        <div className="filter-group filter-range">
          <div>
            <label className="filter-label">
              {t?.from ?? "From"}
            </label>
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  from: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="filter-label">
              {t?.to ?? "To"}
            </label>
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  to: e.target.value,
                })
              }
            />
          </div>

          {isCustomIncomplete && (
            <small className="filter-hint">
              {t?.customHint ??
                "Please select both start and end dates"}
            </small>
          )}
        </div>
      )}
    </section>
  );
}