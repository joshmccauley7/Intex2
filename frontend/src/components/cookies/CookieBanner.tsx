import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '../../hooks/useCookieConsent';

export default function CookieBanner() {
  const {
    needsConsentBanner,
    acceptAll,
    rejectNonEssential,
    openCookieSettings,
  } = useCookieConsent();

  if (!needsConsentBanner) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-4 md:p-6 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
    >
      <div className="pointer-events-auto max-w-3xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-black/40 p-5 md:p-6">
        <div className="flex gap-3 mb-3">
          <Cookie
            className="shrink-0 text-safira-blue dark:text-blue-400 mt-0.5"
            size={22}
            aria-hidden
          />
          <div>
            <h2
              id="cookie-banner-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Cookies and your privacy
            </h2>
            <p
              id="cookie-banner-desc"
              className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed"
            >
              We use essential cookies to remember your choices (including this
              consent). With your permission, we also use a cookie to save light
              or dark mode, and we may enable analytics or marketing cookies in
              the future. Rejecting non-essential cookies is one click — just as
              easy as accepting.
            </p>
          </div>
        </div>
        <ul className="text-xs text-slate-500 dark:text-slate-400 mb-4 list-disc list-inside space-y-1">
          <li>
            <strong className="text-slate-700 dark:text-slate-300">
              Essential
            </strong>{' '}
            — consent storage (always on after you choose).
          </li>
          <li>
            <strong className="text-slate-700 dark:text-slate-300">
              Preferences
            </strong>{' '}
            —{' '}
            <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 rounded">
              theme_preference
            </code>{' '}
            (only if you allow).
          </li>
          <li>
            <strong className="text-slate-700 dark:text-slate-300">
              Analytics / Marketing
            </strong>{' '}
            — optional; not loaded until you allow them.
          </li>
        </ul>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={acceptAll}
            className="order-1 sm:order-none flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold transition-colors"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            className="order-2 sm:order-none flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-slate-100 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={openCookieSettings}
            className="order-3 sm:order-none flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-safira-blue dark:text-blue-400 hover:underline"
          >
            Cookie settings
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
          See our{' '}
          <Link
            to="/privacy-policy"
            className="underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            Privacy Policy
          </Link>{' '}
          for details. You can reopen cookie settings anytime from the footer.
        </p>
      </div>
    </div>
  );
}
