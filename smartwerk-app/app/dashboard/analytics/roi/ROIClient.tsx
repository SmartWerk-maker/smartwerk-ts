"use client";

import { useEffect } from "react";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import ROIForm from "./components/ROIForm";
import ROIResults from "./components/ROIResults";
import ROICharts from "./components/ROICharts";
import ROITips from "./components/ROITips";
import ROIRecommendation from "./components/ROIRecommendation";
import { useROI } from "./hooks/useROI";
import { useRouter } from "next/navigation";
import type { ROII18n } from "./types";

import "./roi.css";

export default function ROIClient() {
  const { language } = useLanguage();
  const dict = useTranslation(language);

  const t = dict?.roi as ROII18n | undefined;
  const roi = useROI();
  const router = useRouter();

  useEffect(() => {
    const theme = localStorage.getItem("theme") || "theme-dark";
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(theme);
  }, []);

  if (!t) return null;

  return (
    <main className="roi-container">
      
      <header className="roi-header">
  <h1>📈 {t.title}</h1>

  <button
    className="btn btn-outline btn-icon"
    onClick={() => router.push("/dashboard")}
  >
    🏠 <span>{t.actions.dashboard}</span>
  </button>
</header>

      <section className="roi-info">
        <p><strong>{t.description.who}:</strong> {t.description.whoText}</p>
        <p><strong>{t.description.what}:</strong> {t.description.whatText}</p>
        <p><strong>{t.description.how}:</strong> {t.description.howText}</p>
      </section>

      <ROIForm t={t} {...roi} />
      <ROIResults t={t} {...roi} />
      <ROICharts t={t} {...roi} />
      <ROITips t={t} tips={roi.tips} />
      <ROIRecommendation t={t} recommendation={roi.recommendation} />
    </main>
  );
}