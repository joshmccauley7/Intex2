import { useState, useEffect, useCallback, useMemo, useId } from 'react'
import { Share2, Sparkles, TrendingUp, ChevronRight, ArrowRight, BarChart2, RefreshCw, ChevronLeft } from 'lucide-react'
import { apiFetch } from '../../api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeatureValueStat { rate: number; n: number }
interface FeatureRatesResponse {
  overall_rate: number
  features: Record<string, Record<string, FeatureValueStat>>
}

interface Recommendation {
  feature: string
  feature_label: string
  current_value: string
  recommended_value: string
  improvement_pct: number
  new_probability: number
  reason: string
}

interface PredictionResult {
  donation_probability: number
  risk_label: string
  predicted_referrals: number
  recommendations: Recommendation[]
  model_version: string
  avg_conversion_rate: number
  anchor_description: string
}

interface PostFormState {
  platform: string
  post_type: string
  media_type: string
  content_topic: string
  sentiment_tone: string
  day_of_week: string
  call_to_action_type: string
  has_call_to_action: boolean
  features_resident_story: boolean
  is_boosted: boolean
  post_hour: number
  num_hashtags: number
  caption_length: number
}

interface HistoricalPost {
  postId: number
  platform: string
  postType: string
  mediaType: string
  contentTopic: string
  createdAt: string
  engagementRate: number
  donationReferrals: number
  estimatedDonationValuePhp: number
  isBoosted: boolean
  hasCallToAction: boolean
}

interface HistoryResponse {
  total: number
  page: number
  pageSize: number
  totalPages: number
  posts: HistoricalPost[]
}

interface InsightRow {
  platform?: string
  postType?: string
  mediaType?: string
  postCount: number
  conversionRate: number
  totalReferrals: number
  avgDonationValue?: number
}

interface InsightsData {
  overall: {
    totalPosts: number
    totalReferrals: number
    overallConversionRate: number
    totalDonationValue: number
  } | null
  byPlatform: InsightRow[]
  byPostType: InsightRow[]
  byMediaType: InsightRow[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS     = ['Facebook', 'Instagram', 'Twitter', 'TikTok', 'LinkedIn', 'YouTube', 'WhatsApp']
const POST_TYPES    = ['ImpactStory', 'Campaign', 'EventPromotion', 'ThankYou', 'EducationalContent', 'FundraisingAppeal']
const MEDIA_TYPES   = ['Photo', 'Video', 'Carousel', 'Text', 'Reel']
const CONTENT_TOPICS = ['Education', 'Health', 'Reintegration', 'DonorImpact', 'SafehouseLife', 'EventRecap', 'CampaignLaunch', 'Gratitude', 'AwarenessRaising']
const SENTIMENT_TONES = ['Hopeful', 'Urgent', 'Celebratory', 'Informative', 'Grateful', 'Emotional']
const DAYS_OF_WEEK  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const CTA_TYPES     = ['None', 'DonateNow', 'LearnMore', 'ShareStory', 'SignUp']

const DEFAULT_FORM: PostFormState = {
  platform:               'Instagram',
  post_type:              'ImpactStory',
  media_type:             'Video',
  content_topic:          'DonorImpact',
  sentiment_tone:         'Hopeful',
  day_of_week:            'Tuesday',
  call_to_action_type:    'DonateNow',
  has_call_to_action:     true,
  features_resident_story: false,
  is_boosted:             false,
  post_hour:              19,
  num_hashtags:           5,
  caption_length:         280,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColor(label: string) {
  if (label === 'High Potential')   return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (label === 'Medium Potential') return 'text-amber-600  bg-amber-50  border-amber-200'
  return                                    'text-red-600   bg-red-50    border-red-200'
}

function riskBarColor(label: string) {
  if (label === 'High Potential')   return 'bg-emerald-500'
  if (label === 'Medium Potential') return 'bg-amber-400'
  return                                    'bg-red-500'
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%` }
function php(n: number) { return `₱${n.toLocaleString()}` }

function hourLabel(h: number) {
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:00 ${ampm}`
}

// Bin helpers — must match SocialMediaController's HourBin / HashtagBin / CaptionBin exactly
function hourBin(h: number) {
  if (h <= 5)  return '00-05'
  if (h <= 8)  return '06-08'
  if (h <= 11) return '09-11'
  if (h <= 14) return '12-14'
  if (h <= 17) return '15-17'
  if (h <= 20) return '18-20'
  return '21-23'
}
function hashtagBin(n: number) {
  if (n === 0) return '0'
  if (n <= 3)  return '1-3'
  if (n <= 7)  return '4-7'
  return '8+'
}
function captionBin(n: number) {
  if (n < 150) return 'short (<150)'
  if (n < 400) return 'medium (150-400)'
  if (n < 800) return 'long (400-800)'
  return 'very long (800+)'
}

// Computes a live estimate entirely in the browser from cached feature rates.
// Uses a simple average of individual feature conversion rates — fast, honest,
// and updates instantly without a server round-trip.
function computeLiveEstimate(fr: FeatureRatesResponse, form: PostFormState): number {
  const f = fr.features
  const rates: number[] = []
  const add = (feat: string, val: string) => {
    const r = f[feat]?.[val]?.rate
    if (r !== undefined) rates.push(r)
  }
  add('platform',           form.platform)
  add('post_type',          form.post_type)
  add('media_type',         form.media_type)
  add('content_topic',      form.content_topic)
  add('sentiment_tone',     form.sentiment_tone)
  add('day_of_week',        form.day_of_week)
  add('has_cta',            String(form.has_call_to_action))
  add('call_to_action_type', form.call_to_action_type)
  add('resident_story',     String(form.features_resident_story))
  add('is_boosted',         String(form.is_boosted))
  add('hour_bin',           hourBin(form.post_hour))
  add('hashtag_bin',        hashtagBin(form.num_hashtags))
  add('caption_bin',        captionBin(form.caption_length))
  if (rates.length === 0) return fr.overall_rate
  return rates.reduce((a, b) => a + b, 0) / rates.length
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LiveEstimateBar({ estimate, overall }: { estimate: number; overall: number }) {
  const diff   = estimate - overall
  const color  = diff > 0.03 ? 'bg-emerald-500' : diff < -0.03 ? 'bg-red-400' : 'bg-amber-400'
  const label  = diff > 0.03 ? 'above avg' : diff < -0.03 ? 'below avg' : 'near avg'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Live estimate</span>
        <span className="font-bold text-slate-700">{pct(estimate)} <span className="text-slate-400 font-normal">({label})</span></span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-300 ${color}`} style={{ width: `${Math.min(estimate * 100 / 1, 100)}%` }} />
      </div>
      <p className="text-xs text-slate-400">Click <strong>Predict</strong> for the anchored analysis with recommendations.</p>
    </div>
  )
}

function RateBadge({ rate, overall }: { rate: number; overall: number }) {
  const diff = rate - overall
  if (diff > 0.03)  return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">▲ {pct(rate)}</span>
  if (diff < -0.03) return <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">▼ {pct(rate)}</span>
  return                   <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">— {pct(rate)}</span>
}

function SelectField({
  label, value, options, onChange, rateHint,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  rateHint?: { rate: number; overall: number }
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
        {rateHint && <RateBadge rate={rateHint.rate} overall={rateHint.overall} />}
      </div>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ToggleField({
  label, checked, onChange, rateHint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  rateHint?: { rate: number; overall: number }
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {rateHint && <RateBadge rate={rateHint.rate} overall={rateHint.overall} />}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 ${checked ? 'bg-[#2563eb]' : 'bg-slate-200'}`}
        aria-checked={checked}
        role="switch"
        aria-label={label}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}

function NumberSlider({
  label, value, min, max, onChange, formatter, rateHint,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  formatter?: (v: number) => string
  rateHint?: { rate: number; overall: number }
}) {
  const id = useId()
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
          {rateHint && <RateBadge rate={rateHint.rate} overall={rateHint.overall} />}
        </div>
        <span className="text-sm font-semibold text-[#2563eb]">
          {formatter ? formatter(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#2563eb]"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>{formatter ? formatter(min) : min}</span>
        <span>{formatter ? formatter(max) : max}</span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SocialMediaPage() {
  const [form, setForm]           = useState<PostFormState>(DEFAULT_FORM)
  const [predicting, setPredicting] = useState(false)
  const [result, setResult]       = useState<PredictionResult | null>(null)
  const [resultIsStale, setResultIsStale] = useState(false)
  const [predError, setPredError] = useState<string | null>(null)

  const [featureRates, setFeatureRates] = useState<FeatureRatesResponse | null>(null)

  const [history, setHistory]         = useState<HistoricalPost[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage]   = useState(1)
  const [historyPages, setHistoryPages] = useState(1)
  const [historyFilter, setHistoryFilter] = useState('')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError]   = useState<string | null>(null)

  const [insights, setInsights]         = useState<InsightsData | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  const updateField = useCallback(<K extends keyof PostFormState>(key: K, val: PostFormState[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      // Auto-manage CTA type when toggling has_call_to_action
      if (key === 'has_call_to_action') {
        if (!val) next.call_to_action_type = 'None'
        else if (next.call_to_action_type === 'None') next.call_to_action_type = 'DonateNow'
      }
      return next
    })
    // Mark result stale (keep visible but greyed) so user knows they need to re-predict
    setResultIsStale(true)
    setPredError(null)
  }, [])

  const applyRecommendation = useCallback((rec: Recommendation) => {
    setForm(prev => {
      const next = { ...prev }
      const key = rec.feature as keyof PostFormState
      if (typeof next[key] === 'boolean') {
        (next as Record<string, unknown>)[key] = rec.recommended_value === 'Yes'
      } else if (typeof next[key] === 'number') {
        (next as Record<string, unknown>)[key] = Number(rec.recommended_value)
      } else {
        (next as Record<string, unknown>)[key] = rec.recommended_value
      }
      // Sync has_call_to_action when call_to_action_type changes
      if (rec.feature === 'call_to_action_type') {
        next.has_call_to_action = rec.recommended_value !== 'None'
      }
      return next
    })
    setResultIsStale(true)
    setPredError(null)
  }, [])

  const predict = async () => {
    setPredicting(true)
    setPredError(null)
    try {
      // Run prediction and refresh feature rates in parallel so badges stay current
      const [data] = await Promise.all([
        apiFetch('/api/social-media/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
        fetchFeatureRates(),
      ])
      setResult(data)
      setResultIsStale(false)
    } catch (e: unknown) {
      setPredError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  const fetchHistory = useCallback((page = 1, platform = '') => {
    setHistoryLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '15' })
    if (platform) params.append('platform', platform)
    apiFetch(`/api/social-media/history?${params}`)
      .then((d: HistoryResponse) => {
        setHistory(d.posts)
        setHistoryTotal(d.total)
        setHistoryPages(d.totalPages)
        setHistoryPage(d.page)
      })
      .catch(e => setHistoryError(e.message))
      .finally(() => setHistoryLoading(false))
  }, [])

  const fetchInsights = useCallback(() => {
    apiFetch('/api/social-media/insights')
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false))
  }, [])

  const fetchFeatureRates = useCallback(() => {
    apiFetch('/api/social-media/feature-rates')
      .then((d: FeatureRatesResponse) => setFeatureRates(d))
      .catch(() => { /* hints optional — silently skip */ })
  }, [])

  useEffect(() => { fetchHistory(1, historyFilter) }, [historyFilter, fetchHistory])
  useEffect(() => { fetchInsights() }, [fetchInsights])

  // Load feature rates on mount, then refresh every 30 minutes so the live
  // estimates automatically pick up newly added social media posts.
  useEffect(() => {
    fetchFeatureRates()
    const interval = setInterval(fetchFeatureRates, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchFeatureRates])

  // Live estimate — computed in the browser from cached rates, updates instantly
  // on every form change without any server round-trip.
  const liveEstimate = useMemo(
    () => featureRates ? computeLiveEstimate(featureRates, form) : null,
    [featureRates, form]
  )

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Social Media Planner</h1>
          <p className="text-sm text-slate-500 mt-1">
            Plan your next post, predict its donation impact, and get recommendations to improve it.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2563eb]/10 rounded-lg">
          <Sparkles size={16} className="text-[#2563eb]" />
          <span className="text-xs font-semibold text-[#2563eb]">ML-Powered</span>
        </div>
      </div>

      {/* ── Top row: Form + Results ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Post Planner Form ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={18} className="text-[#2563eb]" />
            <h2 className="text-base font-semibold text-[#0f172a]">Post Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Platform" value={form.platform} options={PLATFORMS}
              onChange={v => updateField('platform', v)}
              rateHint={featureRates ? { rate: featureRates.features['platform']?.[form.platform]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <SelectField
              label="Post Type" value={form.post_type} options={POST_TYPES}
              onChange={v => updateField('post_type', v)}
              rateHint={featureRates ? { rate: featureRates.features['post_type']?.[form.post_type]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <SelectField
              label="Media Type" value={form.media_type} options={MEDIA_TYPES}
              onChange={v => updateField('media_type', v)}
              rateHint={featureRates ? { rate: featureRates.features['media_type']?.[form.media_type]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <SelectField
              label="Content Topic" value={form.content_topic} options={CONTENT_TOPICS}
              onChange={v => updateField('content_topic', v)}
              rateHint={featureRates ? { rate: featureRates.features['content_topic']?.[form.content_topic]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <SelectField
              label="Tone / Sentiment" value={form.sentiment_tone} options={SENTIMENT_TONES}
              onChange={v => updateField('sentiment_tone', v)}
              rateHint={featureRates ? { rate: featureRates.features['sentiment_tone']?.[form.sentiment_tone]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <SelectField
              label="Day of Week" value={form.day_of_week} options={DAYS_OF_WEEK}
              onChange={v => updateField('day_of_week', v)}
              rateHint={featureRates ? { rate: featureRates.features['day_of_week']?.[form.day_of_week]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <ToggleField
              label="Has Call to Action" checked={form.has_call_to_action}
              onChange={v => updateField('has_call_to_action', v)}
              rateHint={featureRates ? { rate: featureRates.features['has_cta']?.[String(form.has_call_to_action)]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            {form.has_call_to_action && (
              <SelectField
                label="CTA Type" value={form.call_to_action_type}
                options={CTA_TYPES.filter(t => t !== 'None')}
                onChange={v => updateField('call_to_action_type', v)}
                rateHint={featureRates ? { rate: featureRates.features['call_to_action_type']?.[form.call_to_action_type]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
              />
            )}
            <ToggleField
              label="Features Resident Story" checked={form.features_resident_story}
              onChange={v => updateField('features_resident_story', v)}
              rateHint={featureRates ? { rate: featureRates.features['resident_story']?.[String(form.features_resident_story)]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <ToggleField
              label="Boosted / Paid Promotion" checked={form.is_boosted}
              onChange={v => updateField('is_boosted', v)}
              rateHint={featureRates ? { rate: featureRates.features['is_boosted']?.[String(form.is_boosted)]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <NumberSlider
              label="Hour of Day" value={form.post_hour} min={0} max={23}
              onChange={v => updateField('post_hour', v)} formatter={hourLabel}
              rateHint={featureRates ? { rate: featureRates.features['hour_bin']?.[hourBin(form.post_hour)]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <NumberSlider
              label="Number of Hashtags" value={form.num_hashtags} min={0} max={30}
              onChange={v => updateField('num_hashtags', v)}
              rateHint={featureRates ? { rate: featureRates.features['hashtag_bin']?.[hashtagBin(form.num_hashtags)]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
            <NumberSlider
              label="Caption Length (chars)" value={form.caption_length} min={0} max={2200}
              onChange={v => updateField('caption_length', v)}
              rateHint={featureRates ? { rate: featureRates.features['caption_bin']?.[captionBin(form.caption_length)]?.rate ?? featureRates.overall_rate, overall: featureRates.overall_rate } : undefined}
            />
          </div>

          <button
            onClick={predict}
            disabled={predicting}
            className="w-full flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-semibold px-4 py-3 rounded-lg transition-colors"
          >
            {predicting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Predicting…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Predict Donation Impact
              </>
            )}
          </button>

          {predError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {predError}
            </div>
          )}
        </div>

        {/* ── Results + Recommendations ── */}
        <div className="space-y-4">
          {/* Live estimate — always visible on the right, updates instantly */}
          {liveEstimate !== null && featureRates && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <LiveEstimateBar estimate={liveEstimate} overall={featureRates.overall_rate} />
            </div>
          )}

          {!result && !predError && (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
              <Sparkles size={32} className="text-slate-300" />
              <p className="text-slate-400 text-sm">Fill in the post details and click<br /><strong>Predict Donation Impact</strong> to see results.</p>
            </div>
          )}

          {result && (
            <div className={`space-y-4 transition-opacity duration-200 ${resultIsStale ? 'opacity-50 pointer-events-none select-none' : ''}`}>
              {resultIsStale && (
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                  <RefreshCw size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500">Form changed — click <strong>Predict</strong> to update this score.</span>
                </div>
              )}
              {/* Score Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Donation Conversion Probability</p>
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-bold text-[#0f172a]">
                        {pct(result.donation_probability)}
                      </span>
                      <span className={`text-sm font-semibold px-2.5 py-1 rounded-full border mb-1 ${riskColor(result.risk_label)}`}>
                        {result.risk_label}
                      </span>
                    </div>
                  </div>
                  <TrendingUp size={28} className="text-[#2563eb] shrink-0" />
                </div>

                {/* Probability bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4">
                  <div
                    className={`h-2.5 rounded-full transition-all ${riskBarColor(result.risk_label)}`}
                    style={{ width: `${Math.min(result.donation_probability * 100, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-0.5">Predicted Referrals</p>
                    <p className="text-2xl font-bold text-[#0f172a]">{result.predicted_referrals}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 mb-0.5">Avg Conversion Rate</p>
                    <p className="text-2xl font-bold text-[#0f172a]">{pct(result.avg_conversion_rate)}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-3 text-center">
                  Anchored on: {result.anchor_description}
                </p>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-600 text-xs font-bold">!</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#0f172a]">How to Improve This Post</h3>
                  </div>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-[#2563eb]/30 hover:bg-slate-50 transition-colors"
                      >
                        <div className="shrink-0 w-6 h-6 rounded-full bg-[#2563eb]/10 flex items-center justify-center mt-0.5">
                          <span className="text-[#2563eb] text-xs font-bold">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-slate-600">{rec.feature_label}</span>
                            <span className="text-xs text-slate-400">{rec.current_value}</span>
                            <ArrowRight size={12} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-[#2563eb]">{rec.recommended_value}</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              +{rec.improvement_pct.toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{rec.reason}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            New probability: <span className="font-semibold text-slate-600">{pct(rec.new_probability)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => applyRecommendation(rec)}
                          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#2563eb] bg-[#2563eb]/10 hover:bg-[#2563eb]/20 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Apply
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    After applying changes, click <strong>Predict</strong> again to see the updated score.
                  </p>
                </div>
              )}

              {result.recommendations.length === 0 && result.risk_label === 'High Potential' && (
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex items-center gap-3">
                  <div className="text-emerald-500 text-2xl">✓</div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Great post plan!</p>
                    <p className="text-xs text-emerald-600">This post has high conversion potential. No changes recommended.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Insights Summary ── */}
      {!insightsLoading && insights && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={18} className="text-[#2563eb]" />
            <h2 className="text-base font-semibold text-[#0f172a]">Platform Insights</h2>
            {insights.overall && (
              <span className="ml-auto text-xs text-slate-500">
                {insights.overall.totalPosts.toLocaleString()} posts · avg {pct(insights.overall.overallConversionRate)} conversion
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By Platform */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Platform</p>
              <div className="space-y-1.5">
                {insights.byPlatform.slice(0, 7).map(row => (
                  <div key={row.platform} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-20 shrink-0 truncate">{row.platform}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(row.conversionRate * 100 * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-10 text-right shrink-0">
                      {pct(row.conversionRate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Post Type */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Post Type</p>
              <div className="space-y-1.5">
                {insights.byPostType.slice(0, 6).map(row => (
                  <div key={row.postType} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{row.postType}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(row.conversionRate * 100 * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-10 text-right shrink-0">
                      {pct(row.conversionRate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Media Type */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">By Media Type</p>
              <div className="space-y-1.5">
                {insights.byMediaType.slice(0, 5).map(row => (
                  <div key={row.mediaType} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-20 shrink-0 truncate">{row.mediaType}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(row.conversionRate * 100 * 2, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-10 text-right shrink-0">
                      {pct(row.conversionRate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Historical Posts Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-[#0f172a]">Post History</h2>
          <div className="flex items-center gap-3">
            <label htmlFor="history-platform-filter" className="sr-only">Filter history by platform</label>
            <select
              id="history-platform-filter"
              value={historyFilter}
              onChange={e => { setHistoryFilter(e.target.value); setHistoryPage(1) }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="">All Platforms</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {historyTotal > 0 && (
              <span className="text-xs text-slate-500">{historyTotal.toLocaleString()} posts</span>
            )}
          </div>
        </div>

        {historyLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading history…</div>
        ) : historyError ? (
          <div className="py-8 text-center text-red-500 text-sm">{historyError}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Media</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Topic</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Engagement</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Referrals</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Est. Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No posts found.</td>
                    </tr>
                  ) : history.map(post => (
                    <tr key={post.postId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{post.platform}</td>
                      <td className="px-4 py-3 text-slate-600">{post.postType}</td>
                      <td className="px-4 py-3 text-slate-600">{post.mediaType}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{post.contentTopic}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{pct(post.engagementRate)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${post.donationReferrals > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {post.donationReferrals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {post.estimatedDonationValuePhp > 0 ? php(post.estimatedDonationValuePhp) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {historyPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Page {historyPage} of {historyPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => { fetchHistory(historyPage - 1, historyFilter); setHistoryPage(p => p - 1) }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous history page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={historyPage >= historyPages}
                    onClick={() => { fetchHistory(historyPage + 1, historyFilter); setHistoryPage(p => p + 1) }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next history page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
