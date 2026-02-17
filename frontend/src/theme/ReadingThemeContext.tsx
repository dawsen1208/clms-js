import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ReadingTheme = "day" | "night";

interface ReadingThemeContextValue {
  readingTheme: ReadingTheme;
  setReadingTheme: (theme: ReadingTheme) => void;
  toggleReadingTheme: () => void;
}

const ReadingThemeContext = createContext<ReadingThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "readingTheme";

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const ReadingThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [readingTheme, setReadingThemeState] = useState<ReadingTheme>(() => {
    if (typeof window === "undefined") return "day";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "night" || stored === "day" ? (stored as ReadingTheme) : "day";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("theme-day", "theme-night");
    root.classList.add(readingTheme === "night" ? "theme-night" : "theme-day");
    try {
      window.localStorage.setItem(STORAGE_KEY, readingTheme);
    } catch {}
  }, [readingTheme]);

  const runSwitchFlash = useCallback(() => {
    if (typeof document === "undefined") return;
    if (prefersReducedMotion()) return;
    const root = document.documentElement;
    root.classList.add("theme-switching");
    window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, 250);
  }, []);

  const setReadingTheme = useCallback(
    (next: ReadingTheme) => {
      setReadingThemeState((prev) => {
        if (prev === next) return prev;
        runSwitchFlash();
        return next;
      });
    },
    [runSwitchFlash]
  );

  const toggleReadingTheme = useCallback(() => {
    setReadingTheme((prev) => (prev === "day" ? "night" : "day"));
  }, [setReadingTheme]);

  const value = useMemo(
    () => ({ readingTheme, setReadingTheme, toggleReadingTheme }),
    [readingTheme, setReadingTheme, toggleReadingTheme]
  );

  return <ReadingThemeContext.Provider value={value}>{children}</ReadingThemeContext.Provider>;
};

export const useReadingTheme = () => {
  const ctx = useContext(ReadingThemeContext);
  if (!ctx) throw new Error("useReadingTheme must be used within ReadingThemeProvider");
  return ctx;
};

