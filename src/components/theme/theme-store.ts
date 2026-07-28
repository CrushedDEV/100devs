import { STORAGE_KEY, type ResolvedTheme, type Theme } from "./constants";

/**
 * Tiny external store for the theme preference.
 *
 * Living outside React lets the provider read it with `useSyncExternalStore`,
 * which gives the correct value on the very first client render — no effect,
 * no mount flag, and no state updates during render.
 */
const listeners = new Set<() => void>();
let cached: Theme | null = null;

function readFromStorage(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Private mode or storage disabled: fall back to the OS preference.
  }
  return "system";
}

export function subscribeToTheme(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getThemeSnapshot(): Theme {
  cached ??= readFromStorage();
  return cached;
}

/** Server render has no preference available; the inline script handles it. */
export function getThemeServerSnapshot(): Theme {
  return "system";
}

export function setStoredTheme(theme: Theme): void {
  cached = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Persistence is best-effort; the current session still switches.
  }
  for (const listener of listeners) listener();
}

/* ------------------------------ OS preference ----------------------------- */

const QUERY = "(prefers-color-scheme: dark)";

export function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function getSystemThemeSnapshot(): ResolvedTheme {
  return window.matchMedia(QUERY).matches ? "dark" : "light";
}

export function getSystemThemeServerSnapshot(): ResolvedTheme {
  return "dark";
}
