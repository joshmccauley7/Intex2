import type { ConsentState } from '../types/privacy';

export const COOKIE_NAMES = {
  CONSENT: 'cookie_consent',
  THEME: 'theme_preference',
} as const;

const DEFAULT_PATH = '/';
/** 400 days — common upper bound; keeps consent for returning visitors. */
const CONSENT_MAX_AGE_SEC = 400 * 24 * 60 * 60;
const THEME_MAX_AGE_SEC = 400 * 24 * 60 * 60;

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(
  name: string,
  value: string,
  options?: { maxAge?: number; path?: string }
): void {
  if (typeof document === 'undefined') return;
  const path = options?.path ?? DEFAULT_PATH;
  const maxAge = options?.maxAge;
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${path}; SameSite=Lax`;
  if (maxAge !== undefined) cookie += `; Max-Age=${maxAge}`;
  document.cookie = cookie;
}

export function deleteCookie(name: string, path: string = DEFAULT_PATH): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; Path=${path}; Max-Age=0; SameSite=Lax`;
}

export function parseConsent(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    if (typeof parsed.consentGiven !== 'boolean') return null;
    if (parsed.essential !== true) return null;
    return {
      consentGiven: parsed.consentGiven,
      essential: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeConsent(state: ConsentState): string {
  return JSON.stringify(state);
}

export function loadConsentFromDocument(): ConsentState | null {
  return parseConsent(getCookie(COOKIE_NAMES.CONSENT));
}

export function saveConsentCookie(state: ConsentState): void {
  setCookie(COOKIE_NAMES.CONSENT, serializeConsent(state), {
    maxAge: CONSENT_MAX_AGE_SEC,
  });
}

export function saveThemeCookie(theme: 'light' | 'dark'): void {
  setCookie(COOKIE_NAMES.THEME, theme, { maxAge: THEME_MAX_AGE_SEC });
}

export function readThemeCookie(): 'light' | 'dark' | null {
  const v = getCookie(COOKIE_NAMES.THEME);
  return v === 'light' || v === 'dark' ? v : null;
}

export function clearThemeCookie(): void {
  deleteCookie(COOKIE_NAMES.THEME);
}
