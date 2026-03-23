"use client";

import React from "react";
import type { LanguageCode } from "@/app/providers/LanguageProvider";

interface LanguageSwitcherProps {
  language: LanguageCode;
  setLanguage: (lng: LanguageCode) => void;
  isDark: boolean;
}

export default function LanguageSwitcher({
  language,
  setLanguage,
  isDark,
}: LanguageSwitcherProps) {
  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as LanguageCode)}
      className={isDark ? "lang-select-dark" : "lang-select"}
    >
      <option value="en">English</option>
      <option value="nl">Dutch</option>
      <option value="de">German</option>
      <option value="fr">French</option>
      <option value="pl">Polish</option>
      <option value="es">Spanish</option>
      <option value="ru">Russian</option>
    </select>
  );
}