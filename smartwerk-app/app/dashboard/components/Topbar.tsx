"use client";

import React from "react";
import Link from "next/link";
import type { User } from "firebase/auth";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/app/i18n";

import LanguageSwitcher from "./LanguageSwitcher";

/* ================= TYPES ================= */

interface TopbarProps {
  isMobile: boolean;
  onMenu: () => void;
  user: User;
}

type TopbarDict = {
  title?: string;
  subtitle?: string;
  profileLink?: string;
};

type TabsDict = {
  clients?: string;
  invoice?: string;
  quote?: string;
  contract?: string;
  reminder?: string;
};

/* ================= COMPONENT ================= */

export default function Topbar({ user, isMobile, onMenu }: TopbarProps) {
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const t = useTranslation(language);

  if (!t) return null;

  const dictTopbar: TopbarDict =
    t.topbar ?? t.dashboardTopbar ?? {};

  const dictTabs: TabsDict =
    t.tabs ?? t.dashboardTabs ?? {};

  const initial =
    user.displayName?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    "U";

  return (
    <header className="dash-topbar">
      {/* LEFT */}
      <div className="dash-topbar-left">
        <div className="dash-topbar-title-row">
          {isMobile && (
            <button
              className="dash-topbar-menu"
              onClick={onMenu}
              aria-label="Open menu"
            >
              ☰
            </button>
          )}

          <div>
            <h1 className="dash-title">
              {dictTopbar.title ?? "Dashboard"}
            </h1>
            <p className="dash-subtitle">
              {dictTopbar.subtitle ??
                "All your freelance tools in one place."}
            </p>
          </div>
        </div>

        {/* TABS (UI only for now) */}
        <div className="dash-top-tabs">
          <button className="top-tab active">
            {dictTabs.clients ?? "Clients"}
          </button>
          <button className="top-tab">
            {dictTabs.invoice ?? "Invoice"}
          </button>
          <button className="top-tab">
            {dictTabs.quote ?? "Quote"}
          </button>
          <button className="top-tab">
            {dictTabs.contract ?? "Contract"}
          </button>
          <button className="top-tab">
            {dictTabs.reminder ?? "Reminder"}
          </button>
        </div>
      </div>

      {/* RIGHT */}
      <div className="dash-topbar-right">
        <LanguageSwitcher
          language={language}
          setLanguage={setLanguage}
          isDark={isDark}
        />

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <div className="user-pill">
          <div className="user-avatar">{initial}</div>

          <div className="user-meta">
            <span className="user-email">
              {user.displayName || user.email}
            </span>

            <Link href="/dashboard/profile" className="user-link">
              {dictTopbar.profileLink ?? "Profile"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}