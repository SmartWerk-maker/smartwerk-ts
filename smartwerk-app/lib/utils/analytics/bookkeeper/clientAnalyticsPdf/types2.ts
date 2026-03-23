export type RiskLevel = "low" | "medium" | "high";

export type ClientAnalyticsMonth = {
  month: string; // "YYYY-MM" (рекомендовано)
  income: number;
  invoicesCount: number;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  avgPaymentDays: number;
  lateInvoicesCount: number;
  vatTotal?: number;
  healthScore: number; // 0..100
};

export type ClientAnalyticsPdfData = {
  generatedAtISO?: string; // optional
  periodLabel?: string; // e.g. "This Year" або "2025-01-01 → 2025-03-31"

  business?: {
    name: string;
    email?: string;
    address?: string;
  };

  client: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  summary: {
    totalIncome: number;
    totalVat?: number;
    invoicesCount: number;

    paidTotal?: number;
    unpaidTotal?: number;

    avgPaymentDays: number;
    lateInvoicesCount: number;

    riskScore: number; // 0..100
    riskLevel: RiskLevel;

    healthScore: number; // 0..100 (overall)
  };

  history: ClientAnalyticsMonth[];

  // Результат з Smart Actions Engine (можеш передавати готовий масив)
  insights?: Array<{
    level: "info" | "warning" | "critical";
    title: string;
    description: string;
  }>;

  // Опційно: картинка графіка (наприклад chart.toBase64Image())
  chartImageDataUrl?: string;
};

export type GenerateClientAnalyticsPdfParams = {
  data: ClientAnalyticsPdfData;
  locale?: "en"; // залишаємо як у вас (можна розширити)
  withBranding?: boolean;
};