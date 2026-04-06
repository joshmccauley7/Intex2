# Privacy policy & cookie consent (Safira frontend)

This document describes the GDPR-style privacy and cookie implementation for the React (Vite) app.

## Files added

| Path | Purpose |
|------|---------|
| `frontend/src/config/siteConfig.ts` | Editable business/site strings for the Privacy Policy (name, email, URL, address, last updated). |
| `frontend/src/types/privacy.ts` | TypeScript types for `ConsentState` and `ThemePreference`. |
| `frontend/src/lib/cookies.ts` | `getCookie` / `setCookie` / `deleteCookie`, consent JSON parse/serialize, cookie name constants. |
| `frontend/src/context/cookieConsentContext.ts` | React context object + TypeScript types (no hooks). |
| `frontend/src/context/CookieConsentProvider.tsx` | Consent state, banner visibility, accept/reject/save, cookie settings modal open state. |
| `frontend/src/hooks/useCookieConsent.ts` | Hook to read/update consent from context. |
| `frontend/src/context/themeContext.ts` | Theme context object + types. |
| `frontend/src/context/ThemeProvider.tsx` | Theme state; remounts when preference cookies turn on/off; writes `theme_preference` only when allowed. |
| `frontend/src/hooks/useTheme.ts` | Hook for theme toggle / `canPersistTheme`. |
| `frontend/src/lib/themeDocument.ts` | Applies `data-theme` on `<html>`; resets to light when preferences are rejected. |
| `frontend/src/components/cookies/CookieBanner.tsx` | First-visit banner: Accept all, Reject non-essential, Cookie settings. |
| `frontend/src/components/cookies/CookieSettingsModal.tsx` | Category toggles (Essential locked; Preferences / Analytics / Marketing). |
| `frontend/src/components/cookies/AnalyticsConsentBridge.tsx` | Demo hook: logs to console in dev when analytics/marketing consent is true (placeholder for real scripts). |
| `frontend/src/lib/analyticsGate.ts` | Gated demo logger for future analytics SDK wiring. |
| `frontend/src/components/theme/ThemeToggle.tsx` | Visible light/dark toggle; tooltip explains cookie persistence rules. |
| `frontend/src/components/layout/SiteFooter.tsx` | Footer with Privacy Policy + Cookie settings. |
| `frontend/src/pages/PrivacyPolicyPage.tsx` | Route `/privacy-policy` with tailored policy text. |

## Files changed

| Path | Change |
|------|--------|
| `frontend/src/App.tsx` | Wraps app in `CookieConsentProvider` + `ThemeProvider`; registers `/privacy-policy`; mounts banner, modal, analytics bridge. |
| `frontend/vite.config.ts` | Prettier formatting only (if changed). |
| `frontend/src/pages/Home.tsx` | `SiteFooter`, `ThemeToggle`, `Link` navigation, dark mode `dark:` classes. |
| `frontend/src/pages/ImpactDashboard.tsx` | Same footer/toggle/links + dark mode styling. |
| `frontend/index.html` | Inline bootstrap script applies `data-theme` from cookies **only** if consent allows preferences. |
| `frontend/src/index.css` | CSS variables for page background/text tied to `data-theme`. |
| `frontend/tailwind.config.js` | `darkMode: ['selector', '[data-theme="dark"]']`. |
| `frontend/src/api.ts` | (Prettier only if reformatted.) |

## Cookies (browser-accessible, not HttpOnly)

| Name | Essential? | When set | Purpose |
|------|----------------|----------|---------|
| `cookie_consent` | Yes (for consent UX) | After user accepts, rejects non-essential, or saves settings | JSON `ConsentState`: records `consentGiven`, category flags, `updatedAt`. |
| `theme_preference` | No (preference) | Only when **Preferences** category is allowed and user changes theme | `light` or `dark`; read on load by inline script + React for styling. |

Optional analytics/marketing **cookies are not written** in this project yet; `AnalyticsConsentBridge` only demonstrates where scripts would run after consent.

## Behaviour summary

1. **First visit**: No `cookie_consent` → banner shows. No `theme_preference` is set by the app until preferences are allowed.
2. **Reject non-essential**: `cookie_consent` saved with `preferences: false`, `analytics: false`, `marketing: false`; `theme_preference` is removed. User can still toggle theme for the **current visit** (in-memory / DOM only); refresh returns to default light unless they allow preferences later.
3. **Accept all**: All optional categories true; theme cookie may be written when user toggles theme.
4. **Cookie settings**: Same choices as banner; Essential always on; save updates `cookie_consent`.
5. **Footer**: “Privacy Policy” → `/privacy-policy`; “Cookie settings” reopens the modal anytime.

## How to test (browser)

1. Open the site in a **private/incognito** window (or clear site data).
2. Confirm the **cookie banner** appears; in DevTools → Application → Cookies, confirm **`theme_preference` is absent** before you accept preferences.
3. Click **Reject non-essential**; confirm `cookie_consent` exists; toggle dark mode; refresh — **theme should reset** (no preference cookie).
4. Clear cookies; reload; click **Accept all** (or enable **Preferences** only in Cookie settings); toggle **dark mode**; confirm **`theme_preference`** appears (`light` or `dark`).
5. Refresh — **theme should persist**.
6. Open **Cookie settings** from the footer; turn **Preferences** off and save — `theme_preference` should be **removed**.
7. (Optional) Enable **Analytics** in settings; in DevTools console (dev build), look for `[Analytics — demo / gated]` log lines.

## Config to edit

Update `frontend/src/config/siteConfig.ts` for real contact details, URL, and “last updated” before production or grading.

## Backend

No backend cookie changes were required for this feature set. The API does not set HttpOnly theme cookies; the theme remains a **client-only** preference cookie as required.

## Functional status

**Fully functional** for: consent storage, banner + settings modal, preference-gated theme cookie, footer links, privacy page, and a **demo** analytics gate (console-only, no third-party scripts).
