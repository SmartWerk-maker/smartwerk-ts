"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useTranslation } from "@/app/i18n";

/* ================= TYPES ================= */

type SidebarSectionKey =
  | "clients"
  | "invoices"
  | "quotes"
  | "contracts"
  | "reminders"
  | "expenses"
  | "analytics"
  | "tax"
  | "templates"
  | "settings"
  | "help";

interface SidebarItem {
  id: string;
  href?: string;
}

interface SidebarSection {
  key: SidebarSectionKey;
  children?: SidebarItem[];
}

type SidebarSectionLabels = {
  label?: string;
  [childId: string]: string | undefined;
};

type SidebarLabels = {
  close?: string;
  home?: string;
  logout?: string;
} & Partial<Record<SidebarSectionKey, SidebarSectionLabels>>;

/* ================= CONFIG ================= */

const SIDEBAR_CONFIG: SidebarSection[] = [
  {
    key: "clients",
    children: [
      { id: "create", href: "/dashboard/clients/create" },
      { id: "list", href: "/dashboard/clients/list" },
    ],
  },
  {
    key: "invoices",
    children: [
      { id: "create", href: "/dashboard/invoices/create" },
      { id: "list", href: "/dashboard/invoices/list" },
    ],
  },
  {
    key: "quotes",
    children: [
      { id: "create", href: "/dashboard/quotes/create" },
      { id: "list", href: "/dashboard/quotes/list" },
    ],
  },
  {
    key: "contracts",
    children: [
      { id: "create", href: "/dashboard/contracts/create" },
      { id: "list", href: "/dashboard/contracts/list" },
    ],
  },
  {
    key: "reminders",
    children: [
      { id: "create", href: "/dashboard/reminders/create" },
      { id: "list", href: "/dashboard/reminders/list" },
    ],
  },
  {
    key: "expenses",
    children: [
      { id: "create", href: "/dashboard/expenses/create" },
      { id: "list", href: "/dashboard/expenses/list" },
    ],
  },
  {
    key: "analytics",
    children: [
      { id: "bookkeeper", href: "/dashboard/analytics/bookkeeper" },
      { id: "roi", href: "/dashboard/analytics/roi" },
    ],
  },
  {
    key: "tax",
    children: [
      { id: "calculator", href: "/dashboard/tax/calculator" },
      { id: "analytics", href: "/dashboard/tax/analytics" },
      { id: "guide", href: "/dashboard/tax/guide" },
    ],
  },
  {
    key: "templates",
    children: [
      { id: "email", href: "/dashboard/templates/email" },
      { id: "cv", href: "/dashboard/templates/cv" },
    
    ],
  },
  {
    key: "settings",
    children: [
      { id: "profile", href: "/dashboard/profile" },
      { id: "theme" },
    ],
  },
  {
    key: "help",
    children: [
      { id: "support", href: "/dashboard/help/support" },
      { id: "faq", href: "/dashboard/help/faq" },
    ],
  },
];

/* ================= PROPS ================= */

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

/* ================= COMPONENT ================= */

export default function Sidebar({
  isMobile,
  isOpen,
  onClose,
  onLogout,
}: SidebarProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const t = useTranslation(language);

  const [openSections, setOpenSections] = useState<SidebarSectionKey[]>([
    "clients",
    "invoices",
    "quotes",
  ]);

  if (!t) return null;

  const labels: SidebarLabels = (t.sidebar ?? {}) as SidebarLabels;

  function toggleSection(key: SidebarSectionKey) {
    setOpenSections((prev) =>
      prev.includes(key)
        ? prev.filter((s) => s !== key)
        : [...prev, key],
    );
  }

  const sidebarClass = [
    "dash-sidebar",
    isMobile ? "mobile" : "",
    isMobile && isOpen ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      className={sidebarClass}
      style={{
        background: isDark ? "rgba(15,23,42,0.96)" : "#ffffff",
        boxShadow: isDark
          ? "0 20px 45px rgba(0,0,0,0.55)"
          : "0 20px 45px rgba(0,0,0,0.15)",
      }}
    >
      {isMobile && (
        <div className="dash-sidebar-header">
          <button className="dash-menu-button" onClick={onClose}>
            {labels.close ?? "Close"}
          </button>
        </div>
      )}

      <div className="dash-sidebar-logo">
        <div className="dash-logo-box">SW</div>
        <div className="dash-logo-text">SmartWerk</div>
      </div>

      <div className="dash-sidebar-group">
        <button
          type="button"
          className="dash-sidebar-link"
          onClick={() => router.push("/dashboard")}
        >
          {labels.home ?? "Home"}
        </button>
      </div>

      {SIDEBAR_CONFIG.map((section) => {
        const sectionLabels = labels[section.key];
        const title =
          sectionLabels?.label ??
          section.key.charAt(0).toUpperCase() +
            section.key.slice(1);

        return (
          <div key={section.key} className="dash-sidebar-group">
            <button
              type="button"
              className="dash-sidebar-link has-children"
              onClick={() => toggleSection(section.key)}
            >
              <span>{title}</span>
              <span
                className={`chevron ${
                  openSections.includes(section.key) ? "open" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {openSections.includes(section.key) && section.children && (
              <div className="dash-sidebar-children">
                {section.children.map((child) => {
                  const label =
                    sectionLabels?.[child.id] ??
                    child.id.charAt(0).toUpperCase() +
                      child.id.slice(1);

                  return (
                    <button
                      key={child.id}
                      type="button"
                      className="dash-sidebar-child"
                      onClick={() => {
                        if (child.href) router.push(child.href);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="dash-sidebar-footer">
        <button className="dash-logout-btn" onClick={onLogout}>
          {labels.logout ?? "Logout"}
        </button>
      </div>
    </aside>
  );
}