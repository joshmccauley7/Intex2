import { Fragment, useEffect, useState } from 'react';
import { Heart, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import SiteNav from '../components/layout/SiteNav';
import SiteFooter from '../components/layout/SiteFooter';
import { apiFetch } from '../api';
import philSh1 from '../images/safehouses/Phil_lighthouse_1.jpg';
import philSh2 from '../images/safehouses/Phil_lighthouse_2.jpg';
import philSh3 from '../images/safehouses/Phil_lighthouse_3.jpg';
import philSh4 from '../images/safehouses/Phil_lighthouse_4.jpg';
import philSh5 from '../images/safehouses/Phil_lighthouse_5.jpg';
import philSh6 from '../images/safehouses/Phil_lighthouse_6.jpg';
import philSh7 from '../images/safehouses/Phil_lighthouse_7.jpg';
import philSh8 from '../images/safehouses/Phil_lighthouse_8.jpg';
import philSh9 from '../images/safehouses/Phil_lighthouse_9.jpg';

/** Matches `safehouses.csv` safehouse_id → `Phil_lighthouse_{n}.jpg`. */
const SAFEHOUSE_CARD_IMAGE_BY_ID: Record<number, string> = {
  1: philSh1,
  2: philSh2,
  3: philSh3,
  4: philSh4,
  5: philSh5,
  6: philSh6,
  7: philSh7,
  8: philSh8,
  9: philSh9,
};

interface Donation {
  donationId: number;
  donationDate: string;
  donationType: string;
  amount: number | null;
  currencyCode: string | null;
  isRecurring: boolean;
  campaignName: string | null;
  channelSource: string | null;
  notes: string | null;
  estimatedValue: number | null;
  impactUnit: string | null;
  allocations: DonationAllocation[];
}

interface DonationAllocation {
  allocationId: number;
  safehouseId: number | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
  safehouseCity: string | null;
  safehouseRegion: string | null;
  safehouseName: string | null;
}

interface Supporter {
  supporterId: number;
  displayName: string;
  email: string;
  firstDonationDate: string | null;
  status: string;
}

interface MyDonationsResponse {
  supporter: Supporter | null;
  donations: Donation[];
}

interface SafehouseImpact {
  safehouseId: number;
  name: string;
  city: string;
  programAreas: string[];
  monetaryTotal: number;
  currency: string | null;
  impactLines: { value: number; unit: string }[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null) return '—';
  const code = (currency ?? 'USD').toUpperCase();
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
}

/** Per–safehouse card: show real hours/items (no round-up); top summary cards still use Math.ceil. */
function formatSafehouseImpactValue(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const MONETARY_TYPES = ['monetary', 'cash', 'financial'];

function isMonetary(donationType: string) {
  return MONETARY_TYPES.includes(donationType.toLowerCase());
}

/** Social/advocacy rows use e.g. "campaigns" — we do not show those as impact on this page. */
function isCampaignImpactUnit(unit: string | null | undefined): boolean {
  return (unit ?? '').toLowerCase().includes('campaign');
}

/** Avoid substring false positives (e.g. "hr" inside unrelated words) — only hour-like units. */
function isHourLikeImpactUnit(unit: string | null | undefined): boolean {
  const u = (unit ?? '').toLowerCase().trim();
  if (!u) return false;
  if (u.includes('hour')) return true;
  return u === 'hr' || u === 'hrs';
}

function positiveQuantity(n: number | null | undefined): number {
  if (n == null || typeof n !== 'number' || Number.isNaN(n)) return 0;
  return n > 0 ? n : 0;
}

/** Scalar for non-monetary impact (items, hours, …): prefer estimated_value, else amount for Time/Skills only. */
function nonMonetaryImpactMagnitude(d: Donation): number {
  const ev = positiveQuantity(d.estimatedValue);
  if (ev > 0) return ev;
  const type = (d.donationType ?? '').toLowerCase();
  if (type === 'time' || type === 'skills') return positiveQuantity(d.amount);
  return 0;
}

const AMOUNT_EPS = 0.02;

/** Impact (hours, items, etc.) credited to one allocation row — avoids duplicating the full donation across every safehouse. */
function impactAmountForAllocation(d: Donation, a: DonationAllocation): number {
  if (isCampaignImpactUnit(d.impactUnit)) return 0;
  const mag = nonMonetaryImpactMagnitude(d);
  if (mag <= 0) return 0;
  const type = (d.donationType ?? '').toLowerCase();
  const timeOrSkills = type === 'time' || type === 'skills';
  const unitOk =
    (d.impactUnit && !isCampaignImpactUnit(d.impactUnit)) ||
    (timeOrSkills && (isHourLikeImpactUnit(d.impactUnit) || !(d.impactUnit ?? '').trim()));
  if (!unitOk) return 0;
  const rowsWithLocation = d.allocations.filter((x) => x.safehouseId && x.safehouseCity);
  const n = Math.max(1, rowsWithLocation.length);
  // Scale amountAllocated proportionally to estimatedValue so safehouse totals match the summary card.
  const sumAlloc = rowsWithLocation.reduce((s, x) => s + (x.amountAllocated ?? 0), 0);
  if (sumAlloc > AMOUNT_EPS) {
    const rowAlloc = a.amountAllocated ?? 0;
    if (rowAlloc <= AMOUNT_EPS) return mag / n;
    return rowAlloc * (mag / sumAlloc);
  }
  return mag / n;
}

/**
 * Per-allocation share of a monetary donation for safehouse cards.
 * If rows duplicate the full gift (sum of amountAllocated >> donation amount), scale down proportionally.
 * If amountAllocated is missing, split donation total across location rows.
 */
function monetaryAmountForAllocation(d: Donation, a: DonationAllocation): number {
  if (!isMonetary(d.donationType)) return 0;
  const total = d.amount ?? 0;
  if (total <= 0) return 0;

  const rowsWithLocation = d.allocations.filter((x) => x.safehouseId && x.safehouseCity);
  const n = Math.max(1, rowsWithLocation.length);
  const sumAlloc = rowsWithLocation.reduce((s, x) => s + (x.amountAllocated ?? 0), 0);

  if (sumAlloc <= AMOUNT_EPS) {
    return total / n;
  }

  if (sumAlloc > total + AMOUNT_EPS) {
    const row = a.amountAllocated ?? 0;
    if (row <= AMOUNT_EPS) return total / n;
    return row * (total / sumAlloc);
  }

  return a.amountAllocated ?? 0;
}

function buildSafehouseImpact(donations: Donation[]): SafehouseImpact[] {
  const map = new Map<number, SafehouseImpact>();

  for (const d of donations) {
    for (const a of d.allocations) {
      if (!a.safehouseId || !a.safehouseCity) continue;
      if (!map.has(a.safehouseId)) {
        map.set(a.safehouseId, {
          safehouseId: a.safehouseId,
          name: a.safehouseName ?? `Safehouse #${a.safehouseId}`,
          city: a.safehouseCity,
          programAreas: [],
          monetaryTotal: 0,
          currency: d.currencyCode ?? null,
          impactLines: [],
        });
      }
      const entry = map.get(a.safehouseId)!;
      const area = a.programArea ?? 'General';
      if (!entry.programAreas.includes(area)) entry.programAreas.push(area);

      if (isMonetary(d.donationType)) {
        entry.monetaryTotal += monetaryAmountForAllocation(d, a);
        if (!entry.currency) entry.currency = d.currencyCode ?? null;
      } else {
        const add = impactAmountForAllocation(d, a);
        if (add <= 0) continue;
        const type = (d.donationType ?? '').toLowerCase();
        const raw = (d.impactUnit ?? '').trim();
        const lineUnit =
          raw && !isCampaignImpactUnit(raw)
            ? raw
            : type === 'time' || type === 'skills'
              ? 'hours'
              : null;
        if (!lineUnit) continue;
        const existing = entry.impactLines.find((l) => l.unit === lineUnit);
        if (existing) existing.value += add;
        else entry.impactLines.push({ unit: lineUnit, value: add });
      }
    }
  }

  return Array.from(map.values());
}

function isInKindDonationType(type: string) {
  const t = type.toLowerCase();
  return t === 'inkind' || t.includes('in-kind') || t === 'in kind';
}

/**
 * Hours for the "Time" summary card: explicit Time gifts plus other types that record hours
 * (e.g. Skills in Lighthouse data), but not monetary / in-kind rows.
 */
function contributesTimeHours(d: Donation): boolean {
  const type = (d.donationType ?? '').toLowerCase();
  if (isMonetary(d.donationType ?? '') || isInKindDonationType(d.donationType ?? '')) return false;
  if (isCampaignImpactUnit(d.impactUnit)) return false;
  if (isHourLikeImpactUnit(d.impactUnit)) return true;
  if (type === 'time') return true;
  if (type === 'skills' && nonMonetaryImpactMagnitude(d) > 0) return true;
  return false;
}

/** Top summary strip: only Total + Monetary + In-kind + Time (no extra cards per SocialMedia, etc.). */
function buildDonationSummaryBuckets(donations: Donation[]) {
  let monetaryTotal = 0;
  let monetaryCurrency: string | null = null;
  let inKindItems = 0;
  let timeHours = 0;

  for (const d of donations) {
    const type = d.donationType ?? '';
    if (isMonetary(type)) {
      monetaryTotal += d.amount ?? 0;
      if (!monetaryCurrency) monetaryCurrency = d.currencyCode ?? null;
    } else if (isInKindDonationType(type)) {
      inKindItems += d.estimatedValue ?? 0;
    } else if (contributesTimeHours(d)) {
      timeHours += nonMonetaryImpactMagnitude(d);
    }
  }

  return { monetaryTotal, monetaryCurrency, inKindItems, timeHours };
}

function SafehouseCardPhoto({
  safehouseId,
  city,
  className = '',
}: {
  safehouseId: number;
  city: string;
  className?: string;
}) {
  const src = SAFEHOUSE_CARD_IMAGE_BY_ID[safehouseId] ?? philSh1;
  return (
    <img
      src={src}
      alt={`${city} safehouse`}
      className={`w-full h-full object-cover object-center ${className}`}
    />
  );
}

const AREA_COLORS: Record<string, string> = {
  counseling: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  wellbeing: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  education: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  maintenance: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  shelter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  food: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  operations: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  transport: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
};

function areaColor(area: string) {
  return AREA_COLORS[area.toLowerCase()] ?? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
}

const DONATE_CTA_TITLE = 'Keep making a difference';
const DONATE_CTA_BLURB =
  'Your support changes lives every day. Consider giving again to help even more girls find safety.';

export default function DonationHistoryPage() {
  const [data, setData] = useState<MyDonationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch('/api/auth/my-donations')
      .then((res: MyDonationsResponse) => setData(res))
      .catch(() => setError('Failed to load donation history.'))
      .finally(() => setLoading(false));
  }, []);

  const safehouseImpact = data ? buildSafehouseImpact(data.donations) : [];
  const summaryBuckets = data ? buildDonationSummaryBuckets(data.donations) : null;
  const isMonthlyDonor = data?.donations.some((d) => d.isRecurring) ?? false;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <SiteNav />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto">

          {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading your donations...</p>}
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">{error}</p>}

          {!loading && !error && data && (
            <>
              {data.supporter == null ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No donation record found for your account.</p>
                </div>
              ) : data.donations.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">You haven't made any donations yet.</p>
                </div>
              ) : (
                <>
                  {/* Hero header */}
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-safira-blue flex items-center justify-center shrink-0">
                        <Heart size={22} className="text-white fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">
                            {data.supporter.displayName}
                          </h1>
                          {isMonthlyDonor && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              Monthly Donor
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{data.supporter.email}</p>
                      </div>
                    </div>

                    {/* Hero stat */}
                    {safehouseImpact.length > 0 && (
                      <p className="text-lg text-slate-600 dark:text-slate-300 mt-4">
                        Your generosity has reached{' '}
                        <span className="font-bold text-[#0f172a] dark:text-white">{safehouseImpact.length} safehouse{safehouseImpact.length !== 1 ? 's' : ''}</span>
                        {' '}across{' '}
                        <span className="font-bold text-[#0f172a] dark:text-white">
                          {[...new Set(safehouseImpact.map((s) => s.city))].length} {[...new Set(safehouseImpact.map((s) => s.city))].length !== 1 ? 'cities' : 'city'}
                        </span>
                        . Every contribution directly supports girls on the path to safety and healing.
                      </p>
                    )}
                  </div>

                  {/* Impact summary cards */}
                  <div className="flex gap-5 mb-10 overflow-x-auto pb-2 snap-x snap-mandatory">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-5 min-w-[11rem] sm:min-w-[13rem] shrink-0 snap-start shadow-sm">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Total donations</p>
                      <p className="text-2xl font-bold text-[#0f172a] dark:text-white tabular-nums">{data.donations.length}</p>
                    </div>
                    {summaryBuckets && (
                      <>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-5 min-w-[11rem] sm:min-w-[13rem] shrink-0 snap-start shadow-sm">
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Monetary</p>
                          <p className="text-xl font-bold leading-snug">
                            <span className="text-safira-blue">{formatAmount(summaryBuckets.monetaryTotal, summaryBuckets.monetaryCurrency)}</span>
                            <span className="text-[#0f172a] dark:text-white"> donated</span>
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-5 min-w-[11rem] sm:min-w-[13rem] shrink-0 snap-start shadow-sm">
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">In-kind</p>
                          <p className="text-xl font-bold leading-snug">
                            <span className="text-safira-blue">{Math.ceil(summaryBuckets.inKindItems).toLocaleString()}</span>
                            <span className="text-[#0f172a] dark:text-white"> items donated</span>
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-5 min-w-[11rem] sm:min-w-[13rem] shrink-0 snap-start shadow-sm">
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">Time</p>
                          <p className="text-xl font-bold leading-snug">
                            <span className="text-safira-blue">{Math.ceil(summaryBuckets.timeHours).toLocaleString()}</span>
                            <span className="text-[#0f172a] dark:text-white"> hours devoted</span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Safehouse impact cards */}
                  {safehouseImpact.length > 0 && (
                    <div className="mb-10">
                      <h2 className="text-lg font-bold text-[#0f172a] dark:text-white mb-4">Where Your Donations Went</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {safehouseImpact.map((s) => (
                          <div key={s.safehouseId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            {/* Photo */}
                            <div className="h-44 overflow-hidden">
                              <SafehouseCardPhoto safehouseId={s.safehouseId} city={s.city} />
                            </div>

                            {/* Content */}
                            <div className="p-4 flex flex-col flex-1">
                              <div className="flex items-start gap-1 mb-1">
                                <MapPin size={14} className="text-safira-blue mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-bold text-[#0f172a] dark:text-white leading-tight">{s.city} Safehouse</p>
                                </div>
                              </div>

                              {/* Program area pills */}
                              <div className="mb-3">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Used in the following areas:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {s.programAreas.map((area) => (
                                    <span key={area} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${areaColor(area)}`}>
                                      {area}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Contribution totals */}
                              <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                {s.monetaryTotal > 0 && (
                                  <p className="text-sm font-semibold text-safira-blue">
                                    {formatAmount(s.monetaryTotal, s.currency)} contributed
                                  </p>
                                )}
                                {s.impactLines
                                  .filter((line) => !isCampaignImpactUnit(line.unit))
                                  .map((line) => (
                                    <p key={line.unit} className="text-sm font-semibold text-safira-blue">
                                      {formatSafehouseImpactValue(line.value)}{' '}
                                      {line.unit.toLowerCase().includes('item') ? 'items donated' : `${line.unit} devoted`}
                                    </p>
                                  ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Donation history — collapsible */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      onClick={() => setHistoryOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-[#0f172a] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      Donation History
                      {historyOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>

                    {historyOpen && (
                      <table className="w-full text-sm border-t border-slate-200 dark:border-slate-700">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {data.donations.map((d) => {
                            const isExpanded = expandedId === d.donationId;
                            const hasAllocations = d.allocations.length > 0;
                            return (
                              <Fragment key={d.donationId}>
                                <tr
                                  onClick={() => hasAllocations && setExpandedId(isExpanded ? null : d.donationId)}
                                  className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${hasAllocations ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''} ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                                >
                                  <td className="px-4 py-3 text-[#0f172a] dark:text-white font-medium whitespace-nowrap">{formatDate(d.donationDate)}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.donationType}</td>
                                  <td className="px-4 py-3 font-semibold text-safira-blue">{formatAmount(d.amount, d.currencyCode)}</td>
                                  <td className="px-4 py-3 text-right text-slate-400 dark:text-slate-500">
                                    {hasAllocations && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                                    <td colSpan={4} className="px-6 py-3">
                                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Used in the following areas:</p>
                                      <div className="space-y-2">
                                        {d.allocations.map((a) => (
                                          <div key={a.allocationId} className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${areaColor(a.programArea ?? '')}`}>
                                              {a.programArea ?? 'General'}
                                            </span>
                                            {a.safehouseCity && (
                                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                {a.safehouseCity} Safehouse
                                              </span>
                                            )}
                                            {!isMonetary(d.donationType) && d.impactUnit && isCampaignImpactUnit(d.impactUnit) ? null : (
                                              <span className="text-xs font-semibold text-safira-blue">
                                                {!isMonetary(d.donationType) && d.impactUnit
                                                  ? `${a.amountAllocated != null ? a.amountAllocated.toFixed(1) : '—'} ${d.impactUnit}`
                                                  : formatAmount(a.amountAllocated, d.currencyCode)}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-8 bg-safira-blue rounded-2xl p-6 text-center text-white">
                    <p className="text-lg font-bold mb-1">{DONATE_CTA_TITLE}</p>
                    <p className="text-sm text-blue-100 mb-4">{DONATE_CTA_BLURB}</p>
                    <a
                      href="/donate"
                      className="inline-block bg-white text-safira-blue font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Donate Again
                    </a>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
