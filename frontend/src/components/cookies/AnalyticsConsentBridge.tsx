import { useEffect, useRef } from 'react';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import { logAnalyticsDemo } from '../../lib/analyticsGate';

/**
 * Placeholder for future analytics scripts. Demonstrates that analytics only run after consent.
 */
export default function AnalyticsConsentBridge() {
  const { hasAnalyticsConsent, hasMarketingConsent } = useCookieConsent();
  const loggedAnalytics = useRef(false);
  const loggedMarketing = useRef(false);

  useEffect(() => {
    if (!hasAnalyticsConsent) {
      loggedAnalytics.current = false;
      return;
    }
    if (loggedAnalytics.current) return;
    loggedAnalytics.current = true;
    logAnalyticsDemo(
      'Analytics category allowed — third-party analytics would initialize here.',
      {
        note: 'No external scripts are bundled in this school project build.',
      }
    );
  }, [hasAnalyticsConsent]);

  useEffect(() => {
    if (!hasMarketingConsent) {
      loggedMarketing.current = false;
      return;
    }
    if (loggedMarketing.current) return;
    loggedMarketing.current = true;
    logAnalyticsDemo(
      'Marketing category allowed — marketing pixels would load here.',
      {
        note: 'Not used unless you enable marketing cookies.',
      }
    );
  }, [hasMarketingConsent]);

  return null;
}
