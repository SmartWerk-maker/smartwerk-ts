import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type {
  GenerateClientAnalyticsPdfParams,
  RiskLevel,
  ClientAnalyticsMonth,
} from "./types2";

/* ================= I18N (EN) ================= */

const T = {
  title: "Client Analytics",
  subtitle: "History & Risk Report",
  meta: {
    period: "Period",
    generated: "Generated",
  },
  sections: {
    business: "Business",
    client: "Client",
    summary: "Summary",
    history: "Monthly History",
    risk: "Risk & Health",
    insights: "Smart Insights",
  },
  fields: {
    name: "Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    totalIncome: "Total Income",
    totalVat: "Total VAT",
    invoicesCount: "Invoices",
    paidTotal: "Paid Total",
    unpaidTotal: "Unpaid Total",
    avgPaymentDays: "Avg Payment (days)",
    lateInvoices: "Late Invoices",
    riskScore: "Risk Score",
    riskLevel: "Risk Level",
    healthScore: "Health Score",
  },
  historyCols: {
    month: "Month",
    income: "Income",
    invoices: "Invoices",
    paid: "Paid",
    unpaid: "Unpaid",
    avgPay: "Avg Pay (days)",
    late: "Late",
    health: "Health",
  },
} as const;

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

type InsightItem = NonNullable<
  GenerateClientAnalyticsPdfParams["data"]["insights"]
>[number];

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY?: number;
  };
};

/* ================= HELPERS ================= */

const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));

function eur(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `€${v.toFixed(2)}`;
}

function safeText(v: unknown, fallback = "—"): string {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function riskColor(level: RiskLevel): { r: number; g: number; b: number } {
  if (level === "high") return { r: 239, g: 68, b: 68 };
  if (level === "medium") return { r: 245, g: 158, b: 11 };
  return { r: 34, g: 197, b: 94 };
}

function fmtGenerated(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleString("en-GB");
  }
  return d.toLocaleString("en-GB");
}

function getLastAutoTableY(doc: jsPDF, fallback: number): number {
  return (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? fallback;
}

/* ================= MAIN ================= */

export async function generateClientAnalyticsPdf({
  data,
  withBranding = true,
}: GenerateClientAnalyticsPdfParams): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const L = 14;
  const R = 196;
  const PAGE_BOTTOM = 287;

  let y = 16;

  /* ===== HEADER ===== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(T.title, L, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(T.subtitle, L, y + 6);

  doc.setTextColor(60);
  doc.text(
    `${T.meta.generated}: ${fmtGenerated(data.generatedAtISO)}`,
    R,
    y,
    { align: "right" }
  );

  if (data.periodLabel) {
    doc.setTextColor(120);
    doc.text(`${T.meta.period}: ${data.periodLabel}`, R, y + 6, {
      align: "right",
    });
  }

  doc.setDrawColor(220);
  doc.line(L, y + 10, R, y + 10);
  y += 18;

  /* ===== BUSINESS + CLIENT (2 columns) ===== */
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(T.sections.business, L, y);
  doc.text(T.sections.client, 110, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const business = data.business;
  const client = data.client;

  const businessLines: string[] = [
    safeText(business?.name, "—"),
    business?.email ? `${T.fields.email}: ${business.email}` : "",
    business?.address ? `${T.fields.address}: ${business.address}` : "",
  ].filter(Boolean);

  const clientLines: string[] = [
    safeText(client.name, "—"),
    client.email ? `${T.fields.email}: ${client.email}` : "",
    client.phone ? `${T.fields.phone}: ${client.phone}` : "",
    client.address ? `${T.fields.address}: ${client.address}` : "",
  ].filter(Boolean);

  doc.setTextColor(60);
  doc.text(businessLines, L, y + 6);
  doc.text(clientLines, 110, y + 6);

  y += 28;

  /* ===== SUMMARY TABLE ===== */
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(T.sections.summary, L, y);
  y += 4;

  const s = data.summary;

  autoTable(doc, {
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    head: [[T.fields.totalIncome, T.fields.totalVat, T.fields.invoicesCount]],
    body: [[eur(s.totalIncome), eur(s.totalVat ?? 0), String(s.invoicesCount)]],
    margin: { left: L, right: L },
  });

  y = getLastAutoTableY(doc, y + 2) + 8;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    head: [
      [
        T.fields.paidTotal,
        T.fields.unpaidTotal,
        T.fields.avgPaymentDays,
        T.fields.lateInvoices,
      ],
    ],
    body: [
      [
        eur(s.paidTotal ?? 0),
        eur(s.unpaidTotal ?? 0),
        String(Math.round(s.avgPaymentDays ?? 0)),
        String(s.lateInvoicesCount ?? 0),
      ],
    ],
    margin: { left: L, right: L },
  });

  y = getLastAutoTableY(doc, y) + 10;

  /* ===== RISK + HEALTH BADGES ===== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text(T.sections.risk, L, y);
  y += 6;

  const rc = riskColor(s.riskLevel);
  doc.setFillColor(rc.r, rc.g, rc.b);
  doc.roundedRect(L, y, 70, 10, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.text(
    `${T.fields.riskLevel}: ${RISK_LABELS[s.riskLevel]}   •   ${
      T.fields.riskScore
    }: ${clamp(Math.round(s.riskScore), 0, 100)}/100`,
    L + 3,
    y + 7
  );

  const hs = clamp(Math.round(s.healthScore), 0, 100);
  doc.setFillColor(2, 132, 199);
  doc.roundedRect(L + 76, y, 70, 10, 2, 2, "F");
  doc.setTextColor(255);
  doc.text(`${T.fields.healthScore}: ${hs}/100`, L + 79, y + 7);

  y += 16;

  /* ===== OPTIONAL CHART IMAGE ===== */
  if (data.chartImageDataUrl) {
    try {
      doc.setTextColor(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Chart", L, y);
      y += 4;

      doc.addImage(data.chartImageDataUrl, "PNG", L, y + 2, 180, 70);
      y += 78;
    } catch {
      // ignore chart rendering errors
    }
  }

  /* ===== HISTORY TABLE ===== */
  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(T.sections.history, L, y);
  y += 4;

  autoTable(doc, {
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    head: [
      [
        T.historyCols.month,
        T.historyCols.income,
        T.historyCols.invoices,
        T.historyCols.paid,
        T.historyCols.unpaid,
        T.historyCols.avgPay,
        T.historyCols.late,
        T.historyCols.health,
      ],
    ],
    body: (data.history ?? []).map((m: ClientAnalyticsMonth) => [
      safeText(m.month),
      eur(m.income),
      String(m.invoicesCount ?? 0),
      String(m.paidInvoicesCount ?? 0),
      String(m.unpaidInvoicesCount ?? 0),
      String(Math.round(m.avgPaymentDays ?? 0)),
      String(m.lateInvoicesCount ?? 0),
      String(clamp(Math.round(m.healthScore ?? 0), 0, 100)),
    ]),
    margin: { left: L, right: L },
  });

  y = getLastAutoTableY(doc, y + 2) + 10;

  /* ===== INSIGHTS ===== */
  const insights = data.insights ?? [];

  if (insights.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }

    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(T.sections.insights, L, y);
    y += 6;

    insights.slice(0, 12).forEach((it: InsightItem) => {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }

      const level =
        it.level === "critical"
          ? "CRITICAL"
          : it.level === "warning"
          ? "WARNING"
          : "INFO";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.text(`• [${level}] ${safeText(it.title)}`, L, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      const lines = doc.splitTextToSize(safeText(it.description), 180) as string[];
      doc.text(lines, L, y);
      y += lines.length * 4.2 + 3;
    });
  }

  /* ===== FOOTER ===== */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150);

  if (withBranding) {
    doc.text("Generated with SmartWerk", 105, PAGE_BOTTOM, {
      align: "center",
    });
  }

  return doc.output("blob");
}