import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ConsentState } from '../types/privacy';
import { loadConsentFromDocument, saveConsentCookie } from '../lib/cookies';
import { resetThemeForRejectedPreferences } from '../lib/themeDocument';
import { CookieConsentContext } from './cookieConsentContext';

function buildConsent(
  preferences: boolean,
  analytics: boolean,
  marketing: boolean
): ConsentState {
  return {
    consentGiven: true,
    essential: true,
    preferences,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(() =>
    loadConsentFromDocument()
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const needsConsentBanner = !consent?.consentGiven;

  const persistConsent = useCallback((next: ConsentState) => {
    saveConsentCookie(next);
    setConsent(next);
  }, []);

  const acceptAll = useCallback(() => {
    persistConsent(buildConsent(true, true, true));
    setSettingsOpen(false);
  }, [persistConsent]);

  const rejectNonEssential = useCallback(() => {
    resetThemeForRejectedPreferences();
    persistConsent(buildConsent(false, false, false));
    setSettingsOpen(false);
  }, [persistConsent]);

  const saveCustomConsent = useCallback(
    (partial: {
      preferences: boolean;
      analytics: boolean;
      marketing: boolean;
    }) => {
      if (!partial.preferences) {
        resetThemeForRejectedPreferences();
      }
      persistConsent(
        buildConsent(partial.preferences, partial.analytics, partial.marketing)
      );
      setSettingsOpen(false);
    },
    [persistConsent]
  );

  const openCookieSettings = useCallback(() => setSettingsOpen(true), []);
  const closeCookieSettings = useCallback(() => setSettingsOpen(false), []);

  const value = useMemo(
    () => ({
      consent,
      needsConsentBanner,
      settingsOpen,
      openCookieSettings,
      closeCookieSettings,
      acceptAll,
      rejectNonEssential,
      saveCustomConsent,
      hasPreferenceCookies: Boolean(
        consent?.consentGiven && consent.preferences
      ),
      hasAnalyticsConsent: Boolean(consent?.consentGiven && consent.analytics),
      hasMarketingConsent: Boolean(consent?.consentGiven && consent.marketing),
    }),
    [
      consent,
      needsConsentBanner,
      settingsOpen,
      openCookieSettings,
      closeCookieSettings,
      acceptAll,
      rejectNonEssential,
      saveCustomConsent,
    ]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}
