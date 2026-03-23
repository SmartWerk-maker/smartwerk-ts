"use client";

import React from "react";
import { useTranslation } from "@/app/i18n";
import type { LanguageCode } from "@/app/providers/LanguageProvider";

/* ================= TYPES ================= */

interface SuggestionsProps {
  overdueCount: number;
  quoteWinRate: number;
  isDark: boolean;
  language: LanguageCode;
}

type SuggestionsDict = {
  title?: string;

  overdueTitle?: string;
  overdueBody?: string;

  lowWinTitle?: string;
  lowWinBody?: string;

  allGoodTitle?: string;
  allGoodBody?: string;
};

type SuggestionItem = {
  icon: string;
  title: string;
  body: string;
  tone: "warning" | "success";
};

/* ================= COMPONENT ================= */

export default function Suggestions({
  overdueCount,
  quoteWinRate,
  isDark,
  language,
}: SuggestionsProps) {
  const t = useTranslation(language) as {
    suggestions?: SuggestionsDict;
    dashboardSuggestions?: SuggestionsDict;
  } | null;

  if (!t) return null;

  /* ================= DICTIONARY ================= */

  const dict: SuggestionsDict =
    t.suggestions ?? t.dashboardSuggestions ?? {};

  /* ================= LOGIC ================= */

  const THRESHOLD = 30;
  const items: SuggestionItem[] = [];

  if (overdueCount > 0) {
    items.push({
      icon: "📌",
      title: dict.overdueTitle ?? "Overdue invoices",
      body: (dict.overdueBody ??
        "You have {count} overdue invoices — send reminders."
      ).replace("{count}", String(overdueCount)),
      tone: "warning",
    });
  }

  if (quoteWinRate > 0 && quoteWinRate < THRESHOLD) {
    items.push({
      icon: "📉",
      title: dict.lowWinTitle ?? "Low quote win rate",
      body: (dict.lowWinBody ??
        "Your quote win rate is below {threshold}%. Try improving your offers."
      ).replace("{threshold}", String(THRESHOLD)),
      tone: "warning",
    });
  }

  if (items.length === 0) {
    items.push({
      icon: "✨",
      title: dict.allGoodTitle ?? "Everything looks good",
      body:
        dict.allGoodBody ??
        "No urgent issues detected. Keep up the great work!",
      tone: "success",
    });
  }

  /* ================= STYLES ================= */

  const cardStyle: React.CSSProperties = {
    background: isDark ? "rgba(15,23,42,0.96)" : "#ffffff",
    boxShadow: isDark
      ? "0 18px 40px rgba(15,23,42,0.7)"
      : "0 16px 40px rgba(148,163,184,0.25)",
  };

  /* ================= RENDER ================= */

  return (
    <div className="dash-card suggestions-card" style={cardStyle}>
      <h3 style={{ marginBottom: 8, fontWeight: 600 }}>
        {dict.title ?? "Smart suggestions"}
      </h3>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((s, idx) => (
          <li
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 500,
              }}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </div>

            <span style={{ opacity: 0.8, fontSize: 13 }}>
              {s.body}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}