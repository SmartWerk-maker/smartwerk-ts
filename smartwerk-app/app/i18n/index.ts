"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LANG, SUPPORTED_LANGUAGES, type Lang } from "./config";

export type TranslationDictionary = Record<string, unknown>;

const cache: Partial<Record<Lang, TranslationDictionary>> = {};

export async function loadLanguage(
  lang: Lang
): Promise<TranslationDictionary> {
  if (cache[lang]) return cache[lang] as TranslationDictionary;

  try {
    const mod = (await import(`@/app/i18n/languages/${lang}.json`)) as {
      default: TranslationDictionary;
    };

    cache[lang] = mod.default;
    return mod.default;
  } catch {
    console.warn(`⚠️ Missing language "${lang}", using EN fallback.`);

    const fallback = (await import(`@/app/i18n/languages/en.json`)) as {
      default: TranslationDictionary;
    };

    cache[lang] = fallback.default;
    return fallback.default;
  }
}

export function detectBrowserLanguage(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;

  const code = navigator.language.slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(code as Lang)
    ? (code as Lang)
    : DEFAULT_LANG;
}

export function getSavedLanguage(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;

  const saved = localStorage.getItem("lang");

  return saved && SUPPORTED_LANGUAGES.includes(saved as Lang)
    ? (saved as Lang)
    : detectBrowserLanguage();
}

export function saveLanguage(lang: Lang) {
  localStorage.setItem("lang", lang);
}

export function useTranslation(
  lang: Lang
): TranslationDictionary | null {
  const [dict, setDict] = useState<TranslationDictionary | null>(null);

  useEffect(() => {
    loadLanguage(lang).then((d) => setDict(d));
  }, [lang]);

  return dict;
}