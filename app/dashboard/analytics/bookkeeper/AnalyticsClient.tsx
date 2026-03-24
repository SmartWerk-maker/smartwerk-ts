"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation, type TranslationDictionary } from "app/i18n";
import { useAnalytics } from "./hooks/useAnalytics";

import AnalyticsFilters from "./components/AnalyticsFilters";
import AnalyticsStats from "./components/AnalyticsStats";
import AnalyticsCharts from "./components/AnalyticsCharts";


import AnalyticsExports from "./components/AnalyticsExports";
import { exportAnalyticsCSV } from "./utils/analyticsExport";
import { exportAnalyticsPDF } from "./utils/exportAnalyticsPDF";

import "./analytics.css";

/** ================= i18n types (no any) ================= */
type AnalyticsI18n = {
  title?: string;

  meta?: {
    basedOnPaid?: string;
  };

  actions?: {
    dashboard?: string;
  };

  filters?: {
    client?: string;
    allClients?: string;
    period?: string;
    from?: string;
    to?: string;
    customHint?: string;
    periods?: Record<string, string>;
  };

  stats?: {
    income?: string;
    expense?: string;
    profit?: string;
    vat?: string;
    target?: string;
    noData?: string;
  };

  charts?: {
    summaryTitle?: string;
    byClientTitle?: string;
    income?: string;
    expenses?: string;
    noData?: string;
  };

  exports?: {
    csv?: string;
    pdf?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAnalyticsI18n(dict: TranslationDictionary | null): AnalyticsI18n | null {
  if (!dict) return null;
  if (!isRecord(dict)) return null;

  const analytics = dict["analytics"];
  if (!isRecord(analytics)) return null;

  // Safe cast to typed view (still no `any`)
  return analytics as unknown as AnalyticsI18n;
}

export default function AnalyticsClient() {
  const router = useRouter();
  const { language } = useLanguage();

  /** ================= i18n ================= */
  const dict = useTranslation(language);
  const t = getAnalyticsI18n(dict);

  /** ================= DATA ================= */
  const {
    loading,
    filters,
    setFilters,
    stats,
    charts,
    clients,
    scopeLabel,
    periodLabel,
  } = useAnalytics();

  /** ================= AUTH GUARD ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, [router]);

  /** ================= THEME ================= */
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "theme-dark";
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(theme);
  }, []);

  /** ================= LOADING ================= */
  if (loading || !t) {
  return <div className="analytics-loading">Loading analytics…</div>;
}

  /** ================= UI ================= */
  return (
    <>
     <header className="analytics-header">
  <div className="header-left">
    <h1>📊 {t?.title ?? "Analytics"}</h1>

    <div className="analytics-meta">
      {t?.meta?.basedOnPaid ?? "Income and VAT are calculated from paid invoices. Expenses include all recorded costs."}
    </div>

    <div className="analytics-scope">
      <span>{scopeLabel}</span>
      <span className="dot">•</span>
      <span>{periodLabel}</span>
    </div>
  </div>

  <div className="header-right">
    <button
  className="btn btn-outline btn-icon"
  onClick={() => router.push("/dashboard")}
>
  🏠 <span>{t?.actions?.dashboard ?? "Dashboard"}</span>
</button>
  </div>
</header>

      <main className="dash-main">
        <AnalyticsFilters
          filters={filters}
          clients={clients}
          onChange={setFilters}
          t={t?.filters}
        />

       <AnalyticsStats stats={stats} t={t?.stats} />


       <AnalyticsCharts charts={charts} t={t?.charts} />


      

        <AnalyticsExports
          onCSV={() => exportAnalyticsCSV(stats, scopeLabel, periodLabel)}
          onPDF={() => exportAnalyticsPDF(stats, scopeLabel, periodLabel)}
           t={t?.exports}
        />
      </main>

      <footer>© {new Date().getFullYear()} SmartWerk</footer>
    </>
  );
}