import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/siteConfig';
import { useCookieConsent } from '../../hooks/useCookieConsent';

interface SiteFooterProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export default function SiteFooter({
  variant = 'dark',
  className = '',
}: SiteFooterProps) {
  const { openCookieSettings } = useCookieConsent();

  const isDark = variant === 'dark';

  return (
    <footer
      className={`mt-auto py-8 px-6 text-center text-sm ${
        isDark
          ? 'bg-[#0f172a] text-slate-400 border-t border-slate-800'
          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700'
      } ${className}`}
    >
      <p className="mb-3">
        &copy; {new Date().getFullYear()} {siteConfig.SITE_NAME}. All rights
        reserved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link
          to="/privacy-policy"
          className={
            isDark
              ? 'hover:text-white transition-colors underline-offset-2 hover:underline'
              : 'hover:text-safira-blue dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline'
          }
        >
          Privacy Policy
        </Link>
        <span
          className={
            isDark ? 'text-slate-600' : 'text-slate-300 dark:text-slate-600'
          }
          aria-hidden
        >
          |
        </span>
        <button
          type="button"
          onClick={openCookieSettings}
          className={
            isDark
              ? 'hover:text-white transition-colors underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer text-inherit text-sm p-0 font-[inherit]'
              : 'hover:text-safira-blue dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline bg-transparent border-0 cursor-pointer text-inherit text-sm p-0 font-[inherit]'
          }
        >
          Cookie settings
        </button>
      </div>
    </footer>
  );
}
