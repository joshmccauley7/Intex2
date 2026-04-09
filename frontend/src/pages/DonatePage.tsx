import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, LogIn } from 'lucide-react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch } from '../api';
import SiteFooter from '../components/layout/SiteFooter';
import SiteNav from '../components/layout/SiteNav';
import { useAuth } from '../context/AuthContext';

const FORM_STORAGE_KEY = 'safira_donate_form';

/** Strip non-digits, cap at 10, then format as (XXX) XXX-XXXX */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

interface SavedFormState {
  fullName: string;
  email: string;
  phone: string;
  amount: string;
  message: string;
  frequency: 'one_time' | 'monthly';
}

function loadSavedForm(): Partial<SavedFormState> {
  try {
    const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveForm(state: SavedFormState) {
  try {
    sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable
  }
}

function clearSavedForm() {
  try {
    sessionStorage.removeItem(FORM_STORAGE_KEY);
  } catch {
    // ignore
  }
}


function AuthGateBanner({
  fullName, email, phone, amount, message, frequency,
}: {
  fullName: string; email: string; phone: string; amount: string; message: string;
  frequency: 'one_time' | 'monthly';
}) {
  function handleSaveAndRedirect(path: string) {
    saveForm({ fullName, email, phone, amount, message, frequency });
    window.location.href = path;
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <LogIn size={20} className="text-safira-blue mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Sign in to complete your donation
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            You need a free account to donate. Your form details will be saved and
            restored when you return.
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleSaveAndRedirect(`/register?returnTo=${encodeURIComponent('/donate')}`)}
          className="bg-safira-blue text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Account
        </button>
        <button
          type="button"
          onClick={() => handleSaveAndRedirect(`/login?returnTo=${encodeURIComponent('/donate')}`)}
          className="border border-safira-blue text-safira-blue text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

function DonationFormWithGate() {
  const { session, isLoading } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const saved = useMemo(() => loadSavedForm(), []);

  const [fullName, setFullName] = useState(saved.fullName ?? '');
  const [email, setEmail] = useState(saved.email ?? '');
  const [phone, setPhone] = useState(saved.phone ?? '');
  const [amount, setAmount] = useState(
    searchParams.get('amount') ?? saved.amount ?? '50',
  );
  const [message, setMessage] = useState(saved.message ?? '');
  const [frequency, setFrequency] = useState<'one_time' | 'monthly'>(
    searchParams.get('recurring') === 'true' ? 'monthly' : (saved.frequency ?? 'one_time'),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);

  const amountValue = useMemo(() => Number(amount), [amount]);

  const isAuthenticated = session.isAuthenticated;

  // Pre-fill from logged-in session + supporter profile
  useEffect(() => {
    if (!session.isAuthenticated || !session.userName) return;
    // Prefill from account, but still allow correction (e.g., admin username not an email).
    if (!saved.email) setEmail(session.userName);
    apiFetch('/api/donations/my-profile')
      .then((profile: { displayName: string | null; phone: string | null }) => {
        if (profile.displayName && !saved.fullName) setFullName(profile.displayName);
        if (profile.phone && !saved.phone) setPhone(profile.phone);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated, session.userName]);

  // Clear saved form once user is authenticated and on this page
  useEffect(() => {
    if (session.isAuthenticated) {
      clearSavedForm();
    }
  }, [session.isAuthenticated]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (!isAuthenticated) {
      setShowGate(true);
      return;
    }

    if (!stripe || !elements) {
      setError('Payment service is still loading. Please try again.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim() || !amountValue || amountValue <= 0) {
      setError('Please enter your full name, email, phone, and a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (frequency === 'monthly') {
        const base = `${window.location.origin}/donate`;
        const createSession = await apiFetch('/api/donations/create-recurring-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountPhp: amountValue,
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            message: message.trim(),
            successUrl: `${base}?success=1&mode=monthly&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${base}?canceled=1&mode=monthly`,
          }),
        });
        if (!createSession.checkoutUrl) {
          throw new Error('Unable to open Stripe checkout.');
        }
        window.location.href = createSession.checkoutUrl as string;
        return;
      }

      const create = await apiFetch('/api/donations/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPhp: amountValue,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Card input is not ready.');

      const result = await stripe.confirmCardPayment(create.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: fullName.trim(),
            email: email.trim(),
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message ?? 'Payment failed.');
      }
      if (result.paymentIntent?.status !== 'succeeded') {
        throw new Error('Payment did not complete. Please try again.');
      }

      await apiFetch('/api/donations/record-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: result.paymentIntent.id,
          amountPhp: amountValue,
          isRecurring: false,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      navigate('/my-donations');
      setMessage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Donation failed. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {!isAuthenticated && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">Account required to donate.</span>{' '}
          <Link to={`/register?returnTo=/donate`} className="underline font-medium">Create a free account</Link>
          {' '}or{' '}
          <Link to={`/login?returnTo=/donate`} className="underline font-medium">sign in</Link>
          {' '}— your form will be saved.
        </div>
      )}

      {showGate && (
        <AuthGateBanner
          fullName={fullName}
          email={email}
          phone={phone}
          amount={amount}
          message={message}
          frequency={frequency}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="donate-full-name" className="block text-sm font-medium mb-1">Full name</label>
          <input
            id="donate-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
            placeholder="Jane Doe"
            required
          />
          {isAuthenticated && !fullName && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Enter your name as it should appear on the donation.</p>
          )}
        </div>
        <div>
          <label htmlFor="donate-email" className="block text-sm font-medium mb-1">Email</label>
          <input
            id="donate-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue ${
              isAuthenticated
                ? 'bg-slate-50 dark:bg-slate-800'
                : 'bg-white dark:bg-slate-800'
            }`}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="donate-phone" className="block text-sm font-medium mb-1">Phone number</label>
          <input
            id="donate-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
            placeholder="(555) 123-4567"
            required
          />
        </div>
        <fieldset>
          <legend className="block text-sm font-medium mb-1">Donation type</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Donation type">
            <button
              type="button"
              onClick={() => setFrequency('one_time')}
              aria-pressed={frequency === 'one_time'}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                frequency === 'one_time'
                  ? 'border-safira-blue bg-cyan-50 text-safira-blue'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              One-time
            </button>
            <button
              type="button"
              onClick={() => setFrequency('monthly')}
              aria-pressed={frequency === 'monthly'}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                frequency === 'monthly'
                  ? 'border-safira-blue bg-cyan-50 text-safira-blue'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              Recurring Monthly
            </button>
          </div>
        </fieldset>
        <div>
          <label htmlFor="donate-amount" className="block text-sm font-medium mb-1">Donation amount (PHP ₱)</label>
          <input
            id="donate-amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
            required
          />
        </div>
        <div>
          <label htmlFor="donate-card-details" className="block text-sm font-medium mb-1">Card details</label>
          {frequency === 'monthly' ? (
            <div id="donate-card-details" className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
              You'll enter your card securely on Stripe's checkout page after clicking the button below.
            </div>
          ) : (
            <div id="donate-card-details" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3" aria-label="Card details input">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#0f172a',
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="donate-message" className="block text-sm font-medium mb-1">Message (optional)</label>
          <textarea
            id="donate-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
            placeholder="In honor of..."
          />
        </div>

        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        {status && <p className="text-sm text-emerald-600" role="status" aria-live="polite">{status}</p>}

        <button
          type="submit"
          disabled={isSubmitting || (!isAuthenticated ? false : !stripe)}
          className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <Heart size={16} className="fill-white" />
          {isSubmitting
            ? 'Processing...'
            : frequency === 'monthly'
            ? `Start Monthly ₱${amountValue || 0}`
            : `Donate ₱${amountValue || 0}`}
        </button>
      </form>
    </div>
  );
}

export default function DonatePage() {
  const [searchParams] = useSearchParams();
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);
  const [pageStatus, setPageStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/stripe/public-config')
      .then((config: { publishableKey: string }) => {
        if (!config.publishableKey) {
          setStripeConfigError('Stripe is not configured yet. Please contact support.');
          return;
        }
        setStripePromise(loadStripe(config.publishableKey));
      })
      .catch(() => {
        setStripeConfigError('Stripe is not configured yet. Please contact support.');
      });
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const mode = searchParams.get('mode');
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');

    if (canceled) {
      setPageStatus('Donation was canceled. No charge was made.');
      return;
    }

    if (success === '1' && mode === 'monthly' && sessionId) {
      apiFetch('/api/donations/record-checkout-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(() => setPageStatus('Thank you! Your recurring monthly donation is active.'))
        .catch(() => setPageStatus('Recurring donation succeeded, but we could not record it locally yet.'));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <SiteNav />

      <main className="flex-1 px-6 py-12">
        <section className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
          <h1 className="text-3xl font-bold text-navy-DEFAULT dark:text-slate-100 mb-2">
            Make a Donation
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Your contribution directly supports safe housing, trauma-informed care,
            and education services for girls in crisis.
          </p>
          {pageStatus && <p className="mb-4 text-sm text-emerald-600">{pageStatus}</p>}
          {stripeConfigError ? (
            <p className="text-sm text-rose-600">
              {stripeConfigError}
            </p>
          ) : !stripePromise ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading secure payment form...</p>
          ) : (
            <Elements stripe={stripePromise}>
              <DonationFormWithGate />
            </Elements>
          )}
        </section>
      </main>

      <SiteFooter variant="dark" />
    </div>
  );
}
