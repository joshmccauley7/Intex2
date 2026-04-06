import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { ConsentState } from '../../types/privacy';
import { useCookieConsent } from '../../hooks/useCookieConsent';

function CookieSettingsPanel({
  consent,
  onClose,
  saveCustomConsent,
  acceptAll,
  rejectNonEssential,
}: {
  consent: ConsentState | null;
  onClose: () => void;
  saveCustomConsent: (p: {
    preferences: boolean;
    analytics: boolean;
    marketing: boolean;
  }) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
}) {
  const [prefs, setPrefs] = useState(() =>
    consent
      ? {
          preferences: consent.preferences,
          analytics: consent.analytics,
          marketing: consent.marketing,
        }
      : { preferences: true, analytics: false, marketing: false }
  );

  return (
    <>
      <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-700">
        <h2
          id="cookie-settings-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Cookie settings
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-5 space-y-5 text-sm">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Choose which optional categories we may use. Essential storage for
          your consent decision is always active once you save.
        </p>

        <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex justify-between items-center gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Essential
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Always on
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Stores your consent choices (e.g.{' '}
            <code className="text-[10px]">cookie_consent</code>) so we do not
            show the banner on every visit.
          </p>
        </div>

        <label className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-600 p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
          <div className="flex justify-between items-center gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Preferences
            </span>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-safira-blue focus:ring-safira-blue"
              checked={prefs.preferences}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, preferences: e.target.checked }))
              }
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Allows the browser-readable{' '}
            <code className="text-[10px]">theme_preference</code> cookie (light
            / dark) so your theme persists across visits.
          </p>
        </label>

        <label className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-600 p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
          <div className="flex justify-between items-center gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Analytics
            </span>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-safira-blue focus:ring-safira-blue"
              checked={prefs.analytics}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, analytics: e.target.checked }))
              }
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Would allow measurement cookies or scripts (e.g. page views). Not
            loaded in this build until you opt in.
          </p>
        </label>

        <label className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-600 p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
          <div className="flex justify-between items-center gap-3">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Marketing
            </span>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-safira-blue focus:ring-safira-blue"
              checked={prefs.marketing}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, marketing: e.target.checked }))
              }
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Would allow advertising or social pixels. Not used unless you enable
            this.
          </p>
        </label>
      </div>

      <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button
          type="button"
          onClick={rejectNonEssential}
          className="min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-500 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={acceptAll}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() =>
            saveCustomConsent({
              preferences: prefs.preferences,
              analytics: prefs.analytics,
              marketing: prefs.marketing,
            })
          }
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold"
        >
          Save choices
        </button>
      </div>
    </>
  );
}

export default function CookieSettingsModal(): ReactNode {
  const {
    settingsOpen,
    closeCookieSettings,
    consent,
    saveCustomConsent,
    acceptAll,
    rejectNonEssential,
  } = useCookieConsent();

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-settings-title"
      onClick={closeCookieSettings}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CookieSettingsPanel
          key={consent?.updatedAt ?? 'new-visitor'}
          consent={consent}
          onClose={closeCookieSettings}
          saveCustomConsent={saveCustomConsent}
          acceptAll={acceptAll}
          rejectNonEssential={rejectNonEssential}
        />
      </div>
    </div>
  );
}
