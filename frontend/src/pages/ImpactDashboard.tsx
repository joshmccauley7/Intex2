import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Home,
  CheckCircle,
  Clock,
  TrendingUp,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../api';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiImpactSummary {
  latestSnapshot: {
    snapshotId: number;
    snapshotDate: string;
    headline: string;
    summaryText: string;
    isPublished: boolean;
  } | null;
  activeSafehouses: number;
  totalResidents: number;
}

interface DonationMonth {
  month: string;
  amount: number;
}

interface FundSlice {
  name: string;
  value: number;
  color: string;
}

interface OutcomeMonth {
  month: string;
  counselingSessions: number;
  educationMilestones: number;
  reintegrations: number;
}

interface Safehouse {
  name: string;
  city: string;
  residents: number;
  capacity: number;
  reintegrated: number;
}

interface StorySlide {
  tag: string;
  headline: string;
  body: string;
}

interface MilestoneItem {
  pct: number;
  label: string;
}

type TabKey = 'overview' | 'donations' | 'outcomes' | 'safe homes';

// ── Data ──────────────────────────────────────────────────────────────────────

const storySlides: StorySlide[] = [
  {
    tag: 'March 2026',
    headline: 'Five residents successfully reintegrated',
    body: 'Five young women completed their rehabilitation journey and returned safely to family settings with ongoing support plans in place.',
  },
  {
    tag: 'February 2026',
    headline: 'Record counseling sessions this month',
    body: 'Our social workers conducted 115 individual and group sessions — our highest monthly total — reflecting expanded staffing and deeper resident engagement.',
  },
  {
    tag: 'January 2026',
    headline: 'New school partnerships established',
    body: 'Partnerships with two local schools now provide on-site tutoring and accredited coursework for residents working toward their diplomas.',
  },
  {
    tag: 'How your money is used',
    headline: '38% goes directly to safe housing and food',
    body: 'The largest share of every donation covers the physical safety of our residents — a secure roof, nutritious meals, and a stable daily routine.',
  },
  {
    tag: 'Our mission',
    headline: 'Every child in our care receives a personal plan',
    body: 'From intake through reintegration, each resident has a dedicated social worker, an individualized intervention plan, and regular health and education check-ins.',
  },
  {
    tag: 'Donor impact',
    headline: '$50 funds a week of counseling for one resident',
    body: 'Therapy is the cornerstone of recovery. Your contribution directly covers the sessions that help survivors process trauma and build confidence.',
  },
];

const donationTrends: DonationMonth[] = [
  { month: 'Jan', amount: 11200 },
  { month: 'Feb', amount: 14500 },
  { month: 'Mar', amount: 10300 },
  { month: 'Apr', amount: 16800 },
  { month: 'May', amount: 20500 },
  { month: 'Jun', amount: 17900 },
  { month: 'Jul', amount: 18400 },
  { month: 'Aug', amount: 21200 },
  { month: 'Sep', amount: 19800 },
  { month: 'Oct', amount: 24600 },
  { month: 'Nov', amount: 31000 },
  { month: 'Dec', amount: 42500 },
];

const fundAllocation: FundSlice[] = [
  { name: 'Safe Housing & Food', value: 38, color: '#3b5ce5' },
  { name: 'Counseling & Therapy', value: 27, color: '#6366f1' },
  { name: 'Education Support', value: 18, color: '#06b6d4' },
  { name: 'Healthcare', value: 12, color: '#10b981' },
  { name: 'Admin & Operations', value: 5, color: '#94a3b8' },
];

const outcomesByMonth: OutcomeMonth[] = [
  {
    month: 'Jan',
    counselingSessions: 84,
    educationMilestones: 12,
    reintegrations: 1,
  },
  {
    month: 'Feb',
    counselingSessions: 91,
    educationMilestones: 15,
    reintegrations: 2,
  },
  {
    month: 'Mar',
    counselingSessions: 88,
    educationMilestones: 14,
    reintegrations: 1,
  },
  {
    month: 'Apr',
    counselingSessions: 97,
    educationMilestones: 18,
    reintegrations: 3,
  },
  {
    month: 'May',
    counselingSessions: 103,
    educationMilestones: 21,
    reintegrations: 2,
  },
  {
    month: 'Jun',
    counselingSessions: 89,
    educationMilestones: 16,
    reintegrations: 4,
  },
  {
    month: 'Jul',
    counselingSessions: 110,
    educationMilestones: 23,
    reintegrations: 2,
  },
  {
    month: 'Aug',
    counselingSessions: 115,
    educationMilestones: 25,
    reintegrations: 3,
  },
  {
    month: 'Sep',
    counselingSessions: 122,
    educationMilestones: 28,
    reintegrations: 5,
  },
];

const safehouses: Safehouse[] = [
  {
    name: 'Casa Esperanca',
    city: 'Sao Paulo',
    residents: 14,
    capacity: 18,
    reintegrated: 27,
  },
  {
    name: 'Casa Nova Vida',
    city: 'Rio de Janeiro',
    residents: 11,
    capacity: 15,
    reintegrated: 19,
  },
  {
    name: 'Casa Aurora',
    city: 'Salvador',
    residents: 9,
    capacity: 12,
    reintegrated: 14,
  },
];

const milestones: MilestoneItem[] = [
  { pct: 87, label: 'In school regularly' },
  { pct: 79, label: 'Emotional progress' },
  { pct: 72, label: 'Family engaged' },
  { pct: 94, label: 'Active care plan' },
];

// ── Logo ──────────────────────────────────────────────────────────────────────

function SafiraLogo({
  height = 24,
  color = '#000',
}: {
  height?: number;
  color?: string;
}) {
  return (
    <svg
      width={height * 2.3}
      height={height}
      viewBox="0 0 92 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="0.5" width="91" height="39" rx="10" stroke={color} />
      <path d="M20 28L32 12L44 28H38L32 20L26 28H20Z" fill={color} />
      <path d="M52 12H60L70 24V12H76V28H70L60 16V28H52V12Z" fill={color} />
      <path d="M80 12H86V28H80V12Z" fill={color} />
    </svg>
  );
}

// ── Chart primitives ──────────────────────────────────────────────────────────

function AreaSparkline({ data }: { data: DonationMonth[] }) {
  const values = data.map((d) => d.amount);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 600;
  const H = 100;
  const pad = 8;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * (W - pad * 2) + pad,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-28"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b5ce5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b5ce5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ag)" />
      <path
        d={line}
        fill="none"
        stroke="#3b5ce5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SimpleBarChart({
  data,
  valueKey,
  labelKey,
  color = '#3b5ce5',
}: {
  data: Record<string, number | string>[];
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const values = data.map((d) => Number(d[valueKey]));
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1 h-36 w-full">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1 flex-1 h-full justify-end"
        >
          <div
            className="w-full rounded-t-sm"
            style={{
              height: `${max > 0 ? (values[i] / max) * 100 : 0}%`,
              background: color,
              minHeight: 2,
            }}
          />
          <span className="text-[10px] text-gray-400 truncate w-full text-center">
            {String(d[labelKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

function GroupedBarChart({ data }: { data: OutcomeMonth[] }) {
  const maxVal = Math.max(
    ...data.flatMap((d) => [
      d.counselingSessions,
      d.educationMilestones,
      d.reintegrations * 10,
    ])
  );
  return (
    <div className="flex items-end gap-1.5 h-40 w-full">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex flex-col items-center flex-1 h-full justify-end gap-0.5"
        >
          <div className="flex items-end gap-px w-full">
            <div
              className="flex-1 rounded-t-sm"
              style={{
                height: `${(d.counselingSessions / maxVal) * 140}px`,
                background: '#3b5ce5',
                minHeight: 2,
              }}
            />
            <div
              className="flex-1 rounded-t-sm"
              style={{
                height: `${(d.educationMilestones / maxVal) * 140}px`,
                background: '#06b6d4',
                minHeight: 2,
              }}
            />
            <div
              className="flex-1 rounded-t-sm"
              style={{
                height: `${((d.reintegrations * 10) / maxVal) * 140}px`,
                background: '#10b981',
                minHeight: 2,
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutRing({
  pct,
  color = '#3b5ce5',
}: {
  pct: number;
  color?: string;
}) {
  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 36 36" className="w-16 h-16">
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${pct} ${100 - pct}`}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function KpiCard({
  value,
  label,
  icon,
}: {
  value: string | number;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-5 text-center">
      <div className="flex justify-center mb-2 text-[#3b5ce5]">{icon}</div>
      <div className="text-3xl font-extrabold text-[#3b5ce5] leading-none">
        {value}
      </div>
      <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1.5">
        {label}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl p-5 ${className}`}
    >
      {title && (
        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-4">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Story carousel ────────────────────────────────────────────────────────────

function StoryCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % storySlides.length),
      5000
    );
    return () => clearInterval(t);
  }, []);

  const prev = () =>
    setIndex((i) => (i - 1 + storySlides.length) % storySlides.length);
  const next = () => setIndex((i) => (i + 1) % storySlides.length);
  const slide = storySlides[index];

  return (
    <div className="bg-[#3b5ce5] text-white rounded-2xl overflow-hidden">
      <div className="px-8 py-7 min-h-[148px] flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200 mb-2 block">
            {slide.tag}
          </span>
          <h3 className="text-lg font-bold leading-snug mb-2">
            {slide.headline}
          </h3>
          <p className="text-sm text-blue-100 leading-relaxed">{slide.body}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-8 pb-5">
        <div className="flex gap-1.5">
          {storySlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-blue-300/60'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ImpactDashboard() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [apiData, setApiData] = useState<ApiImpactSummary | null>(null);

  useEffect(() => {
    apiFetch('/api/impact/summary')
      .then((data: ApiImpactSummary) => setApiData(data))
      .catch(() => null);
  }, []);

  const totalDonations = donationTrends.reduce((s, d) => s + d.amount, 0);
  const totalReintegrations = outcomesByMonth.reduce(
    (s, d) => s + d.reintegrations,
    0
  );
  const totalSessions = outcomesByMonth.reduce(
    (s, d) => s + d.counselingSessions,
    0
  );
  const totalResidents =
    apiData?.totalResidents ??
    safehouses.reduce((s, sh) => s + sh.residents, 0);
  const activeSafehouses = apiData?.activeSafehouses ?? safehouses.length;

  const tabs: { label: string; key: TabKey }[] = [
    { label: 'Overview', key: 'overview' },
    { label: 'Donations', key: 'donations' },
    { label: 'Outcomes', key: 'outcomes' },
    { label: 'Safe Homes', key: 'safe homes' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col">
      {/* Nav */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-8 h-14 flex items-center gap-4 md:gap-8">
          <Link
            to="/"
            aria-label="Home"
            className="text-[#0f172a] dark:text-slate-100 shrink-0"
          >
            <SafiraLogo height={28} color="currentColor" />
          </Link>
          <div className="flex gap-1 flex-1 justify-center">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-md text-sm text-gray-500 dark:text-slate-400 hover:text-[#3b5ce5] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/impact"
              className="px-3 py-1.5 rounded-md text-sm text-gray-500 dark:text-slate-400 hover:text-[#3b5ce5] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
            >
              Impact
            </Link>
            {(['About', 'Donate', 'Contact'] as const).map((l) => (
              <a
                key={l}
                href="#"
                className="px-3 py-1.5 rounded-md text-sm text-gray-500 dark:text-slate-400 hover:text-[#3b5ce5] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
          <ThemeToggle />
          <button
            type="button"
            className="bg-[#3b5ce5] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            Donate Now
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-8 flex flex-col gap-6">
        {/* ── Story carousel (all text content lives here) ── */}
        <StoryCarousel />

        {/* ── Top stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            value={totalResidents}
            label="Girls in Our Care"
            icon={<Users size={18} />}
          />
          <KpiCard
            value={totalReintegrations}
            label="Reintegrated This Year"
            icon={<CheckCircle size={18} />}
          />
          <KpiCard
            value={totalSessions.toLocaleString()}
            label="Counseling Sessions"
            icon={<Heart size={18} />}
          />
          <KpiCard
            value={`$${(totalDonations / 1000).toFixed(0)}k`}
            label="Raised This Year"
            icon={<TrendingUp size={18} />}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-slate-600 px-2">
            {tabs.map(({ label, key }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-[#3b5ce5] text-[#3b5ce5] font-semibold'
                    : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="flex gap-5">
                <div className="flex-[1.6] flex flex-col gap-5">
                  <Card title="Donations over time">
                    <AreaSparkline data={donationTrends} />
                    <div className="flex justify-between mt-1 px-0.5">
                      {donationTrends
                        .filter((_, i) => i % 3 === 0)
                        .map((d, i) => (
                          <span key={i} className="text-[10px] text-gray-400">
                            {d.month}
                          </span>
                        ))}
                    </div>
                  </Card>
                  <Card title="Monthly outcomes">
                    <GroupedBarChart data={outcomesByMonth} />
                    <div className="flex gap-4 mt-3 justify-center">
                      {[
                        { color: '#3b5ce5', label: 'Counseling' },
                        { color: '#06b6d4', label: 'Education' },
                        { color: '#10b981', label: 'Reintegrations' },
                      ].map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[11px] text-gray-400"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: l.color }}
                          />
                          {l.label}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
                <div className="flex-1 flex flex-col gap-5">
                  <Card title="Where your money goes">
                    {fundAllocation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 mb-3">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ background: item.color }}
                        />
                        <span className="flex-1 text-xs text-gray-600 truncate">
                          {item.name}
                        </span>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.value * 2.5}%`,
                              background: item.color,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold w-7 text-right"
                          style={{ color: item.color }}
                        >
                          {item.value}%
                        </span>
                      </div>
                    ))}
                  </Card>
                  <Card title="Resident progress">
                    <div className="grid grid-cols-2 gap-4">
                      {milestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2 text-center"
                        >
                          <DonutRing pct={m.pct} />
                          <span className="text-[11px] text-gray-500 leading-tight">
                            {m.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* DONATIONS */}
            {tab === 'donations' && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard
                    value={`$${(totalDonations / 1000).toFixed(0)}k`}
                    label="Total Raised"
                    icon={<TrendingUp size={18} />}
                  />
                  <KpiCard
                    value="247"
                    label="Active Supporters"
                    icon={<Users size={18} />}
                  />
                  <KpiCard
                    value="82%"
                    label="Donor Retention"
                    icon={<Heart size={18} />}
                  />
                  <KpiCard
                    value="$1,120"
                    label="Avg. Annual Gift"
                    icon={<CheckCircle size={18} />}
                  />
                </div>
                <div className="flex gap-5">
                  <Card title="Monthly donations" className="flex-[1.6]">
                    <SimpleBarChart
                      data={
                        donationTrends as unknown as Record<
                          string,
                          number | string
                        >[]
                      }
                      valueKey="amount"
                      labelKey="month"
                      color="#3b5ce5"
                    />
                  </Card>
                  <Card title="Fund allocation" className="flex-1">
                    {fundAllocation.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 mb-3.5">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ background: item.color }}
                        />
                        <span className="text-xs text-gray-600 w-36 shrink-0">
                          {item.name}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.value * 2.4}%`,
                              background: item.color,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold w-7 text-right"
                          style={{ color: item.color }}
                        >
                          {item.value}%
                        </span>
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            )}

            {/* OUTCOMES */}
            {tab === 'outcomes' && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard
                    value={totalSessions.toLocaleString()}
                    label="Counseling Sessions"
                    icon={<Heart size={18} />}
                  />
                  <KpiCard
                    value="172"
                    label="Education Milestones"
                    icon={<CheckCircle size={18} />}
                  />
                  <KpiCard
                    value="98%"
                    label="Health Checks Done"
                    icon={<Users size={18} />}
                  />
                  <KpiCard
                    value={totalReintegrations}
                    label="Reintegrations"
                    icon={<TrendingUp size={18} />}
                  />
                </div>
                <div className="flex gap-5">
                  <Card title="Monthly outcomes" className="flex-[1.6]">
                    <GroupedBarChart data={outcomesByMonth} />
                    <div className="flex gap-4 mt-3 justify-center">
                      {[
                        { color: '#3b5ce5', label: 'Counseling' },
                        { color: '#06b6d4', label: 'Education' },
                        { color: '#10b981', label: 'Reintegrations' },
                      ].map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-[11px] text-gray-400"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: l.color }}
                          />
                          {l.label}
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card title="Resident progress" className="flex-1">
                    <div className="grid grid-cols-2 gap-5 mt-1">
                      {milestones.map((m, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center gap-2 text-center"
                        >
                          <DonutRing pct={m.pct} />
                          <span className="text-[11px] text-gray-500 leading-tight">
                            {m.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* SAFE HOMES */}
            {tab === 'safe homes' && (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard
                    value={activeSafehouses}
                    label="Active Safe Homes"
                    icon={<Home size={18} />}
                  />
                  <KpiCard
                    value={`${totalResidents} / 45`}
                    label="Occupancy"
                    icon={<Users size={18} />}
                  />
                  <KpiCard
                    value="11"
                    label="Staff Members"
                    icon={<CheckCircle size={18} />}
                  />
                  <KpiCard
                    value="14 mo."
                    label="Avg. Length of Stay"
                    icon={<Clock size={18} />}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {safehouses.map((sh, i) => {
                    const pct = Math.round((sh.residents / sh.capacity) * 100);
                    const barColor = pct > 85 ? '#d97706' : '#3b5ce5';
                    return (
                      <div
                        key={i}
                        className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 rounded-xl p-5"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                          {sh.name}
                        </h4>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
                          {sh.city}
                        </p>
                        <div className="flex gap-2 mb-4">
                          {[
                            { val: sh.residents, lbl: 'Residents' },
                            { val: sh.capacity, lbl: 'Capacity' },
                            { val: sh.reintegrated, lbl: 'Reintegrated' },
                          ].map((s, j) => (
                            <div key={j} className="flex-1 text-center">
                              <div className="text-xl font-extrabold text-[#3b5ce5]">
                                {s.val}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {s.lbl}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                          <span>Occupancy</span>
                          <span
                            className="font-bold"
                            style={{ color: barColor }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Donate CTA ── */}
        <div className="bg-[#0f172a] text-white rounded-2xl px-8 py-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Make a difference today</h2>
          <p className="text-sm text-slate-400 mb-6">
            Every dollar goes directly toward a child's safety and recovery.
          </p>
          <div className="flex gap-2 justify-center flex-wrap mb-4">
            {(['$25', '$50', '$100', '$250'] as const).map((amt) => (
              <button
                key={amt}
                className="bg-white/10 border border-white/20 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                {amt}
              </button>
            ))}
          </div>
          <button className="bg-[#3b5ce5] text-white font-bold px-10 py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Donate Securely
          </button>
        </div>
      </div>

      <SiteFooter variant="light" className="mt-6" />
    </div>
  );
}
