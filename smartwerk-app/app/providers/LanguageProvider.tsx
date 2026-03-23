"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { SUPPORTED_LANGUAGES, DEFAULT_LANG, type Lang } from "@/app/i18n/config";

// -------------------------------
// TYPES
// -------------------------------
export type LanguageCode = Lang;

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "sw-lang";

// -------------------------------
// INITIAL LANGUAGE LOADER
// -------------------------------
function getInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANG;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved && SUPPORTED_LANGUAGES.includes(saved as Lang)) {
      return saved as Lang;
    }

    const browser = window.navigator.language.slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(browser as Lang)) {
      return browser as Lang;
    }
  } catch {
    // ignore errors
  }

  return DEFAULT_LANG;
}

// -------------------------------
// PROVIDER
// -------------------------------
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<LanguageCode>(() => getInitialLanguage());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// -------------------------------
// HOOK
// -------------------------------
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}