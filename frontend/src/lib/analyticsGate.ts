/**
 * Central gate for optional analytics. Call only after checking consent via
 * useCookieConsent().hasAnalyticsConsent (or equivalent).
 *
 * When you add a real analytics SDK, load/inject it inside `runWithAnalyticsConsent`
 * or from a component that watches hasAnalyticsConsent.
 */
export function logAnalyticsDemo(
  message: string,
  data?: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.info(`[Analytics — demo / gated] ${message}`, data ?? '');
  }
}
