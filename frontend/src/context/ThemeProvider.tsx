import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '../types/privacy';
import { readThemeCookie, saveThemeCookie } from '../lib/cookies';
import { applyThemeToDocument } from '../lib/themeDocument';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { ThemeContext } from './themeContext';

function readInitialDataTheme(): ThemePreference {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

function initTheme(allowPrefs: boolean): ThemePreference {
  if (allowPrefs) {
    const stored = readThemeCookie();
    if (stored) return stored;
    const dom = readInitialDataTheme();
    saveThemeCookie(dom);
    return dom;
  }
  return readInitialDataTheme();
}

function ThemeController({
  allowPrefs,
  children,
}: {
  allowPrefs: boolean;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    initTheme(allowPrefs)
  );

  const setTheme = useCallback(
    (t: ThemePreference) => {
      setThemeState(t);
      applyThemeToDocument(t);
      if (allowPrefs) saveThemeCookie(t);
    },
    [allowPrefs]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      canPersistTheme: allowPrefs,
    }),
    [theme, toggleTheme, setTheme, allowPrefs]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { consent } = useCookieConsent();
  const allowPrefs = Boolean(consent?.consentGiven && consent.preferences);

  return (
    <ThemeController
      key={allowPrefs ? 'prefs-on' : 'prefs-off'}
      allowPrefs={allowPrefs}
    >
      {children}
    </ThemeController>
  );
}
