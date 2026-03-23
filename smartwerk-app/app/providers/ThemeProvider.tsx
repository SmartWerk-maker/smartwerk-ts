"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ----------------------------------------------------------
// INITIAL THEME (SSR-safe)
// ----------------------------------------------------------
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  try {
    const saved = window.localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "dark";
  }
}

// ----------------------------------------------------------
// PROVIDER
// ----------------------------------------------------------
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    // клас, який ти вже використовував раніше
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // 🟦 додатково — класи для dashboard / client.css
    body.classList.remove("dash-theme-light", "dash-theme-dark");
    body.classList.add(
      theme === "dark" ? "dash-theme-dark" : "dash-theme-light"
    );

    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // ignore errors
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider
      value={{ theme, isDark: theme === "dark", toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ----------------------------------------------------------
// HOOK
// ----------------------------------------------------------
export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}