import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiFetch } from '../api';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';

function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('50');
  const [message, setMessage] = useState('');
  const [frequency, setFrequency] = useState<'one_time' | 'monthly'>('one_time');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountValue = useMemo(() => Number(amount), [amount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

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
            amountUsd: amountValue,
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
          amountUsd: amountValue,
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
          amountUsd: amountValue,
          isRecurring: false,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      setStatus('Thank you! Your donation was successful.');
      setMessage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Donation failed. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
          placeholder="Jane Doe"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
          placeholder="+1 (555) 123-4567"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Donation type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFrequency('one_time')}
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
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              frequency === 'monthly'
                ? 'border-safira-blue bg-cyan-50 text-safira-blue'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            Recurring Monthly
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Donation amount (USD)</label>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
          required
        />
      </div>
      {frequency === 'one_time' && (
        <div>
          <label className="block text-sm font-medium mb-1">Card details</label>
          <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3">
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
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-safira-blue"
          placeholder="In honor of..."
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {status && <p className="text-sm text-emerald-600">{status}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !stripe}
        className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        <Heart size={16} className="fill-white" />
        {isSubmitting
          ? 'Processing...'
          : frequency === 'monthly'
          ? `Start Monthly $${amountValue || 0}`
          : `Donate $${amountValue || 0}`}
      </button>
    </form>
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
      <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Heart className="text-safira-blue fill-safira-blue" size={22} />
          Safira
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/impact" className="hover:text-white transition-colors">Impact</Link>
          <Link to="/donate" className="text-white hover:text-blue-400 transition-colors">Donate</Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-sm font-semibold text-white bg-safira-blue hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Login
          </Link>
        </div>
      </nav>

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
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading secure payment form...</p>
          ) : (
            <Elements stripe={stripePromise}>
              <DonationForm />
            </Elements>
          )}
        </section>
      </main>

      <SiteFooter variant="dark" />
    </div>
  );
}
