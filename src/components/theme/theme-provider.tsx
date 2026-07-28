"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { ResolvedTheme, Theme } from "./constants";
import {
  getSystemThemeServerSnapshot,
  getSystemThemeSnapshot,
  getThemeServerSnapshot,
  getThemeSnapshot,
  setStoredTheme,
  subscribeToSystemTheme,
  subscribeToTheme,
} from "./theme-store";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Minimal replacement for `next-themes`.
 *
 * The pre-paint class is applied by `<ThemeScript />` in the server layout, so
 * this provider only mirrors later changes onto `<html>`. Keeping the script
 * out of the client tree avoids React 19's "script tag while rendering"
 * warning, which `next-themes` triggers on every client mount.
 */
export function ThemeProvider({
  children,
  disableTransitionOnChange = true,
}: {
  children: React.ReactNode;
  disableTransitionOnChange?: boolean;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getSystemThemeServerSnapshot,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;

    let restore: (() => void) | undefined;
    if (disableTransitionOnChange) {
      const style = document.createElement("style");
      style.append(
        document.createTextNode(
          "*,*::before,*::after{transition:none!important}",
        ),
      );
      document.head.append(style);

      restore = () => {
        // Force a reflow so the suppression takes effect before it is removed.
        void window.getComputedStyle(document.body).opacity;
        style.remove();
      };
    }

    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    restore?.();
  }, [resolvedTheme, disableTransitionOnChange]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme: setStoredTheme }),
    [theme, resolvedTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return context;
}
