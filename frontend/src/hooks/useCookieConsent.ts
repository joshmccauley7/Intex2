import { useContext } from 'react';
import { CookieConsentContext } from '../context/cookieConsentContext';
import type { CookieConsentContextValue } from '../context/cookieConsentContext';

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error(
      'useCookieConsent must be used within CookieConsentProvider'
    );
  }
  return ctx;
}
