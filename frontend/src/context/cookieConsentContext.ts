import { createContext } from 'react';
import type { ConsentState } from '../types/privacy';

export interface CookieConsentContextValue {
  consent: ConsentState | null;
  /** True until the user has stored a consent decision (cookie_consent with consentGiven). */
  needsConsentBanner: boolean;
  settingsOpen: boolean;
  openCookieSettings: () => void;
  closeCookieSettings: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  saveCustomConsent: (partial: {
    preferences: boolean;
    analytics: boolean;
    marketing: boolean;
  }) => void;
  hasPreferenceCookies: boolean;
  hasAnalyticsConsent: boolean;
  hasMarketingConsent: boolean;
}

export const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);
