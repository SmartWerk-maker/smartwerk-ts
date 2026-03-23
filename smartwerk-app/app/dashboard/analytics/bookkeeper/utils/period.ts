// app/dashboard/analytics/bookkeeper/utils/period.ts

import { AnalyticsFilters } from "../types";

export function filterByPeriod(
  date: string,
  filters: AnalyticsFilters
): boolean {
  if (!date) return false;

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();

  if (filters.from && filters.to) {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    return d >= from && d <= to;
  }

  switch (filters.period) {
    case "thisMonth":
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );

    case "lastMonth": {
      const last = new Date(now);
      last.setMonth(now.getMonth() - 1);
      return (
        d.getMonth() === last.getMonth() &&
        d.getFullYear() === last.getFullYear()
      );
    }

    case "thisYear":
      return d.getFullYear() === now.getFullYear();

    default:
      return true;
  }
}