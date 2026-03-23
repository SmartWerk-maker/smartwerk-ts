"use client";

import React from "react";
import Link from "next/link";

import { useTranslation } from "@/app/i18n";
import type { LanguageCode } from "@/app/providers/LanguageProvider";
import type { ActivityLog } from "@/app/dashboard/hooks/useActivity";
import type { Timestamp } from "firebase/firestore";

/* ================= TYPES ================= */

interface RecentActivityProps {
  activity: ActivityLog[];
  isDark: boolean;
  language: LanguageCode;
}

type ActivityDict = {
  title: string;
  empty: string;
  goToProfile: string;
};

/* ================= HELPERS ================= */

function toDate(
  value: Timestamp | Date | string
): Date | null {
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Firestore Timestamp
  return value.toDate();
}

/* ================= COMPONENT ================= */

export default function RecentActivity({
  activity,
  isDark,
  language,
}: RecentActivityProps) {
  const t = useTranslation(language) as {
    recentActivity?: Partial<ActivityDict>;
    activity?: Partial<ActivityDict>;
  } | null;

  if (!t) return null;

  /* ================= DICT ================= */

  const dict: ActivityDict = {
    title:
      t.recentActivity?.title ??
      t.activity?.title ??
      "Recent activity",

    empty:
      t.recentActivity?.empty ??
      t.activity?.empty ??
      "No recent activity.",

    goToProfile:
      t.recentActivity?.goToProfile ??
      t.activity?.goToProfile ??
      "Go to Profile →",
  };

  /* ================= FORMAT ================= */

  function formatDate(value: ActivityLog["createdAt"]) {
    const date = toDate(value);
    if (!date) return "—";

    if (language === "en") return date.toLocaleDateString("en-GB");
    if (language === "nl") return date.toLocaleDateString("nl-NL");

    return date.toLocaleDateString();
  }

  /* ================= STYLES ================= */

  const cardStyle: React.CSSProperties = {
    background: isDark ? "rgba(15,23,42,0.96)" : "#ffffff",
    boxShadow: isDark
      ? "0 18px 40px rgba(15,23,42,0.7)"
      : "0 16px 40px rgba(148,163,184,0.25)",
    borderRadius: 16,
    padding: "14px 16px",
  };

  /* ================= RENDER ================= */

  return (
    <div className="dash-card activity-card" style={cardStyle}>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>
        {dict.title}
      </h3>

      {activity.length === 0 ? (
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          {dict.empty}
        </p>
      ) : (
        <ul className="activity-list" style={{ paddingLeft: 18 }}>
          {activity.slice(0, 5).map((item) => (
            <li key={item.id} style={{ fontSize: 13, marginBottom: 4 }}>
              <strong>{formatDate(item.createdAt)}</strong>{" "}
              — {item.message}
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard/profile" className="activity-link">
        {dict.goToProfile}
      </Link>
    </div>
  );
}