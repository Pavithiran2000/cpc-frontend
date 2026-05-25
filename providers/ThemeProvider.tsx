"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(t: Theme): ResolvedTheme {
  return t === "system" ? getSystemPreference() : t;
}

function applyClass(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Restore stored preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      const t: Theme =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "dark";
      const r = resolve(t);
      applyClass(r);
      setThemeState(t);
      setResolvedTheme(r);
    } catch {
      // localStorage unavailable — stay dark
    }
  }, []);

  // Follow OS preference changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const r: ResolvedTheme = e.matches ? "dark" : "light";
      applyClass(r);
      setResolvedTheme(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    const r = resolve(t);
    applyClass(r);
    setThemeState(t);
    setResolvedTheme(r);
    try {
      localStorage.setItem("theme", t);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
