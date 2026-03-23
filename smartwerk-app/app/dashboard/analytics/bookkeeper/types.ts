// app/dashboard/analytics/bookkeeper/types.ts

/* ================= PERIODS ================= */

export type AnalyticsPeriod =
  | "all"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid";

/* ================= FILTERS ================= */

export interface AnalyticsFilters {
  client: string;
  period: AnalyticsPeriod;
  from?: string;
  to?: string;
}

/* ================= CORE ================= */

export interface AnalyticsInvoice {
  clientName: string;
  invoiceDate: string;
  dueDate?: string;
  paidDate?: string;
  status: InvoiceStatus;
  grandTotal: number;
  totalVat: number;
}

export interface AnalyticsExpense {
  date: string;
  amount: number;
  category?: string;
}

export interface AnalyticsClient {
  id: string;
  clientName: string;
}

/* ================= AGGREGATES ================= */

export interface AnalyticsStats {
  income: number;
  expense: number;
  vat: number;
  profit: number;
}

export interface AnalyticsChartsData {
  summary: {
    invoices: AnalyticsInvoice[];
    expenses: AnalyticsExpense[];
  };
  byClient: AnalyticsInvoice[];
}

/* ================= VIEW MODELS ================= */

export type AnalyticsPeriodView =
  | { type: "custom"; from: string; to: string }
  | { type: Exclude<AnalyticsPeriod, "custom"> };

export type AnalyticsScopeView =
  | { type: "client"; value: string }
  | { type: "all" };