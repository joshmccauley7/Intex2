import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';

export default function PrivacyPolicyPage() {
  const {
    SITE_NAME,
    BUSINESS_NAME,
    CONTACT_EMAIL,
    WEBSITE_URL,
    BUSINESS_ADDRESS,
    LAST_UPDATED_DATE,
    DATA_CONTROLLER_NOTE,
  } = siteConfig;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Heart className="text-safira-blue fill-safira-blue" size={22} />
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            to="/impact"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Impact
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
          Last updated: {LAST_UPDATED_DATE}
        </p>

        <div className="max-w-none space-y-8 text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Who we are
            </h2>
            <p>
              This website is operated by <strong>{BUSINESS_NAME}</strong>{' '}
              (“we”, “us”) under the name <strong>{SITE_NAME}</strong>.{' '}
              {DATA_CONTROLLER_NOTE}
            </p>
            <p className="mt-2">
              <strong>Website:</strong> {WEBSITE_URL}
              <br />
              <strong>Contact:</strong>{' '}
              <a
                className="text-safira-blue dark:text-blue-400 hover:underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
              <br />
              <strong>Address:</strong> {BUSINESS_ADDRESS}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              What data we collect
            </h2>
            <p>Depending on how you use the site, we may process:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Information you submit</strong> — for example, if you
                use contact or donation forms (when available), we collect the
                details you choose to send.
              </li>
              <li>
                <strong>Technical data</strong> — such as browser type, general
                location (country/region), and timestamps when you request pages
                or call our APIs.
              </li>
              <li>
                <strong>Impact dashboard data</strong> — aggregated statistics
                shown on the Impact page may be loaded from our servers; we
                describe API usage below.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              How we collect it
            </h2>
            <p>
              We collect information directly from you when you type it into the
              site, and automatically when your device communicates with our web
              servers and APIs (for example, when the homepage loads impact
              summary data from{' '}
              <code className="text-sm bg-slate-200 dark:bg-slate-800 px-1 rounded">
                /api/impact/summary
              </code>
              ).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Why we use it
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To run the website and show accurate impact information.</li>
              <li>
                To respond to enquiries and process donations where those
                features exist.
              </li>
              <li>
                To remember your cookie choices and (if you allow it) your
                display theme.
              </li>
              <li>
                To measure interest in our mission with analytics, only if you
                opt in.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Cookies and similar technologies
            </h2>
            <p>We group cookies as follows:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Essential</strong> — After you interact with the cookie
                banner, we store{' '}
                <code className="text-sm bg-slate-200 dark:bg-slate-800 px-1 rounded">
                  cookie_consent
                </code>{' '}
                in your browser (not HttpOnly) so we know your choice and do not
                nag you on every visit. This is required for our consent UX.
              </li>
              <li>
                <strong>Preferences</strong> — If you allow preference cookies,
                we may set{' '}
                <code className="text-sm bg-slate-200 dark:bg-slate-800 px-1 rounded">
                  theme_preference
                </code>{' '}
                to{' '}
                <code className="text-sm bg-slate-200 dark:bg-slate-800 px-1 rounded">
                  light
                </code>{' '}
                or{' '}
                <code className="text-sm bg-slate-200 dark:bg-slate-800 px-1 rounded">
                  dark
                </code>
                . This cookie is <strong>browser-readable on purpose</strong> so
                our React app can read it on load and apply your theme before
                you interact with the page. If you reject non-essential cookies
                or turn preferences off, we do <strong>not</strong> keep this
                cookie; you can still switch theme for the current visit only.
              </li>
              <li>
                <strong>Analytics</strong> — Optional. We do not load analytics
                scripts unless you consent. The site is built so analytics can
                be wired in later behind the same consent flag.
              </li>
              <li>
                <strong>Marketing</strong> — Optional. Same as analytics: off by
                default, not loaded without consent.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Backend and sessions
            </h2>
            <p>
              Our API is built with ASP.NET Core.{' '}
              <strong>This demo does not rely on HttpOnly auth cookies</strong>{' '}
              for the pages described here. If we add login or session cookies
              in the future, they would be documented here and treated as
              essential for signed-in functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Third-party services
            </h2>
            <p>
              We use Google Fonts (Inter) loaded from Google’s servers when you
              load the app. Your browser may send requests to Google; see
              Google’s privacy policy for how they handle network data. Our
              primary database may be hosted by a cloud provider (e.g. Railway)
              when using the deployed API.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Data retention
            </h2>
            <p>
              We keep personal data only as long as needed for the purposes
              above or as required by law. Aggregated impact metrics may be
              retained longer for reporting. Cookie lifetimes are limited
              (typically up to 400 days for consent/theme cookies in this
              implementation).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Your rights
            </h2>
            <p>
              Depending on where you live, you may have rights to access,
              correct, delete, or export personal data, and to object to certain
              processing. To exercise these rights, email{' '}
              <a
                className="text-safira-blue dark:text-blue-400 hover:underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
              . You can also change or withdraw cookie consent anytime using{' '}
              <strong>Cookie settings</strong> in the footer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              How to change cookie settings
            </h2>
            <p>
              Click <strong>Cookie settings</strong> in the site footer (or open
              the banner’s “Cookie settings” button). Accepting, rejecting
              non-essential, or saving custom choices updates your stored
              consent. Rejecting non-essential removes preference cookies such
              as{' '}
              <code className="text-sm bg-slate-200 dark:bg-slate-800 px-1 rounded">
                theme_preference
              </code>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-navy-DEFAULT dark:text-slate-100 mb-3">
              Contact
            </h2>
            <p>
              Questions about this policy:{' '}
              <a
                className="text-safira-blue dark:text-blue-400 hover:underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </main>

      <SiteFooter variant="light" />
    </div>
  );
}
