import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { apiFetch } from '../../api'

interface StripeStatus {
  hasSecretKey: boolean
  hasPublishableKey: boolean
}

export default function StripeSettingsPage() {
  const [secretKey, setSecretKey] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = () => {
    apiFetch('/api/stripe/admin/status')
      .then((d: StripeStatus) => setStatus(d))
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setSaving(true)
    try {
      await apiFetch('/api/stripe/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: secretKey.trim(),
          publishableKey: publishableKey.trim(),
        }),
      })
      setMessage('Stripe keys saved successfully.')
      setSecretKey('')
      setPublishableKey('')
      refreshStatus()
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Failed to save Stripe keys.'
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0f172a]">Stripe Settings</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4 text-slate-700">
          <KeyRound size={18} />
          <p className="font-semibold">Payment Key Management</p>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Keys are never shown after saving. Enter new values to rotate credentials.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Secret Key</p>
            <p className="font-semibold text-sm">
              {status?.hasSecretKey ? 'Configured' : 'Not configured'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Publishable Key</p>
            <p className="font-semibold text-sm">
              {status?.hasPublishableKey ? 'Configured' : 'Not configured'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stripe Secret Key
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
              placeholder="sk_live_..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Stripe Publishable Key
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
              placeholder="pk_live_..."
              required
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Keys'}
          </button>
        </form>
      </div>
    </div>
  )
}
