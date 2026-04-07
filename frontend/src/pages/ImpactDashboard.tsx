import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { apiFetch } from '../api';
import SiteFooter from '../components/layout/SiteFooter';
import ThemeToggle from '../components/theme/ThemeToggle';

const PHP_TO_USD = 56;

interface MonthValue {
  month: string | null;
}
interface DashboardSafehouse {
  safehouseId: number;
  region?: string | null;
  capacity?: number | null;
  residents?: number | null;
  occupancyPct?: number | null;
  capacityGirls?: number | null;
  currentOccupancy?: number | null;
}
interface MonthlyWellbeing extends MonthValue {
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
}
interface MonthlyCareOps extends MonthValue {
  counselingSessions: number | null;
  homeVisitations: number | null;
}
interface DonationsByMonth extends MonthValue {
  totalAmountPhp: number | null;
  donationCount: number | null;
}
interface DonationTypeBreakdown {
  totalValue: number | null;
}
interface ReintegrationByMonth extends MonthValue {
  completedCases: number | null;
  admittedCases?: number | null;
}
interface InterventionPlanByMonth extends MonthValue {
  achievedCount: number | null;
  totalPlans: number | null;
}
interface EducationAttendanceByMonth extends MonthValue {
  avgAttendancePct: number | null;
}
interface IncidentResolutionByMonth extends MonthValue {
  incidentCount: number | null;
  resolvedCount: number | null;
}
interface SnapshotSeriesItem {
  snapshotId: number;
  snapshotDate: string;
  headline: string;
}
interface DashboardResponse {
  activeSafehouses: number;
  totalResidents: number;
  totalCapacity: number;
  safehouses: DashboardSafehouse[];
  monthlyWellbeing: MonthlyWellbeing[];
  monthlyCareOps: MonthlyCareOps[];
  donationsByMonth: DonationsByMonth[];
  donationTypeBreakdown: DonationTypeBreakdown[];
  snapshotSeries: SnapshotSeriesItem[];
  reintegrationByMonth: ReintegrationByMonth[];
  interventionPlanByMonth: InterventionPlanByMonth[];
  educationAttendanceByMonth: EducationAttendanceByMonth[];
  incidentResolutionByMonth: IncidentResolutionByMonth[];
}
interface Point {
  label: string;
  value: number;
}

function monthLabel(v: string | null): string {
  if (!v) return '—';
  const d = new Date(`${v}-01`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-US', { month: 'short' });
}
function monthLabelWithYear(v: string | null): string {
  if (!v) return '—';
  const d = new Date(`${v}-01`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
function usdFromPhp(v: number | null | undefined): number {
  return (v ?? 0) / PHP_TO_USD;
}
function number(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function formatUSD(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}
function percentDiff(series: Point[]): number {
  if (series.length < 2) return 0;
  const start = series[0].value;
  const end = series[series.length - 1].value;
  if (start === 0) return end > 0 ? 100 : 0;
  return ((end - start) / start) * 100;
}
function latest(series: Point[]): number {
  return series[series.length - 1]?.value ?? 0;
}
function runningTotal(series: Point[]): Point[] {
  let sum = 0;
  return series.map((p) => {
    sum += p.value;
    return { ...p, value: sum };
  });
}

function MetricCard({
  title,
  value,
  accent,
  footnote,
  icon,
}: {
  title: string;
  value: string;
  accent: string;
  footnote: string;
  icon: ReactNode;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-6 text-center border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <span className={`${accent}`}>{icon}</span>
      </div>
      <p className={`text-4xl font-bold leading-none ${accent}`}>{value}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{footnote}</p>
    </div>
  );
}

function SparkLine({
  data,
  stroke,
  fill,
  valueFormatter,
}: {
  data: Point[];
  stroke: string;
  fill: string;
  valueFormatter: (v: number) => string;
}) {
  if (!data.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data available.</p>;
  }
  const width = 700;
  const height = 210;
  const pad = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const points = data.map((d, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1);
    const y = height - pad - (d.value / max) * (height - pad * 2);
    return { ...d, x, y };
  });
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
        <defs>
          <linearGradient id={`fill-${fill}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#fill-${fill})`} />
        <path d={line} stroke={stroke} strokeWidth={3} fill="none" />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{points[0].label}</span>
        <span>{valueFormatter(points[Math.floor(points.length / 2)].value)}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

function DualBars({
  admitted,
  completed,
}: {
  admitted: Point[];
  completed: Point[];
}) {
  if (!admitted.length && !completed.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No data available.</p>;
  }
  const size = Math.max(admitted.length, completed.length);
  const rows = Array.from({ length: size }).map((_, i) => ({
    label: admitted[i]?.label ?? completed[i]?.label ?? '—',
    admitted: admitted[i]?.value ?? 0,
    completed: completed[i]?.value ?? 0,
  }));
  const max = Math.max(
    1,
    ...rows.map((r) => Math.max(r.admitted, r.completed))
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-cyan-500" />
          Admitted
        </span>
        <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          Completed
        </span>
      </div>
      <div className="h-52 flex items-end gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className="h-full flex-1 min-w-0 flex flex-col items-center justify-end">
            <div className="h-full flex w-full items-end justify-center gap-[2px]">
              <div
                className="w-[45%] rounded-t-sm bg-cyan-500"
                style={{ height: `${Math.max(3, (r.admitted / max) * 100)}%` }}
                title={`Admitted: ${r.admitted.toFixed(0)}`}
              />
              <div
                className="w-[45%] rounded-t-sm bg-indigo-600"
                style={{ height: `${Math.max(3, (r.completed / max) * 100)}%` }}
                title={`Completed: ${r.completed.toFixed(0)}`}
              />
            </div>
            <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionCapacity({
  rows,
}: {
  rows: Array<{ region: string; residents: number; capacity: number; pct: number }>;
}) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No regional data available.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.region} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{r.region}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {r.residents}/{r.capacity} beds
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={r.pct > 90 ? 'h-full bg-rose-500' : r.pct > 75 ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
              style={{ width: `${Math.max(0, Math.min(100, r.pct))}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Occupancy {r.pct.toFixed(1)}%
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ImpactDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/impact/dashboard')
      .then((d: DashboardResponse) => {
        setData(d);
        setError(null);
      })
      .catch(() => setError('Unable to load public impact metrics from the database.'))
      .finally(() => setLoading(false));
  }, []);

  const totalSupportUsd = useMemo(() => {
    const breakdown = (data?.donationTypeBreakdown ?? []).reduce(
      (sum, row) => sum + (row.totalValue ?? 0),
      0
    );
    if (breakdown > 0) return usdFromPhp(breakdown);
    const months = (data?.donationsByMonth ?? []).reduce(
      (sum, row) => sum + (row.totalAmountPhp ?? 0),
      0
    );
    return usdFromPhp(months);
  }, [data?.donationTypeBreakdown, data?.donationsByMonth]);

  const donationSeries = useMemo<Point[]>(
    () =>
      (data?.donationsByMonth ?? []).slice(-12).map((m) => ({
        label: monthLabel(m.month),
        value: usdFromPhp(m.totalAmountPhp),
      })),
    [data?.donationsByMonth]
  );
  const cumulativeDonations = useMemo(() => runningTotal(donationSeries), [donationSeries]);

  const careSeries = useMemo<Point[]>(
    () =>
      (data?.monthlyCareOps ?? []).slice(-12).map((m) => ({
        label: monthLabel(m.month),
        value: (m.counselingSessions ?? 0) + (m.homeVisitations ?? 0),
      })),
    [data?.monthlyCareOps]
  );
  const reintegrationAdmittedSeries = useMemo<Point[]>(
    () =>
      (data?.reintegrationByMonth ?? []).slice(-12).map((m) => {
        const row = m as unknown as Record<string, unknown>;
        return {
          label: monthLabelWithYear(m.month),
          value: number(m.admittedCases ?? row.admitted_cases),
        };
      }),
    [data?.reintegrationByMonth]
  );
  const reintegrationCompletedSeries = useMemo<Point[]>(
    () =>
      (data?.reintegrationByMonth ?? []).slice(-12).map((m) => {
        const row = m as unknown as Record<string, unknown>;
        return {
          label: monthLabelWithYear(m.month),
          value: number(m.completedCases ?? row.completed_cases),
        };
      }),
    [data?.reintegrationByMonth]
  );
  const attendanceSeries = useMemo<Point[]>(
    () =>
      (data?.educationAttendanceByMonth ?? []).slice(-12).map((m) => ({
        label: monthLabel(m.month),
        value: m.avgAttendancePct ?? 0,
      })),
    [data?.educationAttendanceByMonth]
  );
  const healthSeries = useMemo<Point[]>(
    () =>
      (data?.monthlyWellbeing ?? []).slice(-12).map((m) => ({
        label: monthLabel(m.month),
        value: ((m.avgHealthScore ?? 0) / 5) * 100,
      })),
    [data?.monthlyWellbeing]
  );
  const planRateSeries = useMemo<Point[]>(
    () =>
      (data?.interventionPlanByMonth ?? []).slice(-12).map((m) => ({
        label: monthLabel(m.month),
        value:
          (m.totalPlans ?? 0) > 0
            ? ((m.achievedCount ?? 0) / (m.totalPlans ?? 1)) * 100
            : 0,
      })),
    [data?.interventionPlanByMonth]
  );
  const incidentResolutionSeries = useMemo<Point[]>(
    () =>
      (data?.incidentResolutionByMonth ?? []).slice(-12).map((m) => ({
        label: monthLabel(m.month),
        value:
          (m.incidentCount ?? 0) > 0
            ? ((m.resolvedCount ?? 0) / (m.incidentCount ?? 1)) * 100
            : 0,
      })),
    [data?.incidentResolutionByMonth]
  );

  const regionCapacity = useMemo<
    Array<{ region: string; residents: number; capacity: number; pct: number }>
  >(() => {
    const grouped = new Map<string, { residents: number; capacity: number }>();
    for (const row of data?.safehouses ?? []) {
      const region = row.region?.trim() || 'Unknown';
      const residents = number(
        row.residents ??
          row.currentOccupancy ??
          (row as unknown as Record<string, unknown>).current_occupancy
      );
      const capacity = number(
        row.capacity ??
          row.capacityGirls ??
          (row as unknown as Record<string, unknown>).capacity_girls
      );
      const current = grouped.get(region) ?? { residents: 0, capacity: 0 };
      grouped.set(region, {
        residents: current.residents + residents,
        capacity: current.capacity + capacity,
      });
    }
    return Array.from(grouped.entries())
      .map(([region, v]) => ({
        region,
        residents: v.residents,
        capacity: v.capacity,
        pct: v.capacity > 0 ? (v.residents / v.capacity) * 100 : 0,
      }))
      .filter((x) => x.capacity > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [data?.safehouses]);

  const recentHighlights = useMemo(() => (data?.snapshotSeries ?? []).slice(-3).reverse(), [data?.snapshotSeries]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <nav className="bg-[#0f172a] dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800/80">
        <div className="mx-auto flex w-full items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Heart className="text-safira-blue fill-safira-blue" size={22} />
            Safira
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <a href="/about" className="hover:text-white transition-colors">About</a>
            <Link to="/impact" className="text-white hover:text-blue-400 transition-colors">Impact</Link>
            <a href="/donate" className="hover:text-white transition-colors">Donate</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/donate"
              className="flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Heart size={16} className="fill-white" />
              <span className="hidden sm:inline">Donate Now</span>
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/70 dark:to-slate-950 py-14 px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="mx-auto max-w-7xl">
            <div
              className="max-w-3xl rounded-2xl px-8 py-8"
              style={{
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
              }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-safira-blue font-semibold">
                Impact Command Center
              </p>
              <h1 className="mt-2 text-4xl font-bold text-[#0f172a] dark:text-slate-100 md:text-5xl">
                Proof That Support Changes Lives
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
              Every number here reflects real safety, stability, and long-term progress for girls in care.
              We track capacity, service delivery, and outcomes in one transparent view.
              </p>
              <div className="mt-6">
                <a
                  href="/donate"
                  className="inline-flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm shadow"
                >
                  <Heart size={16} className="fill-white" />
                  Make a Donation
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Loading dashboard data...
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Total Program Revenue"
                  value={formatUSD(totalSupportUsd)}
                  accent="text-safira-blue"
                  footnote={`${percentDiff(donationSeries).toFixed(1)}% trend over recent period`}
                  icon={<TrendingUp size={18} />}
                />
                <MetricCard
                  title="Case Plan Completion"
                  value={`${latest(planRateSeries).toFixed(1)}%`}
                  accent="text-indigo-700 dark:text-indigo-300"
                  footnote="Share of intervention plans achieved this month"
                  icon={<CheckCircle2 size={18} />}
                />
                <MetricCard
                  title="Care Sessions Delivered"
                  value={latest(careSeries).toFixed(0)}
                  accent="text-slate-900 dark:text-slate-100"
                  footnote="Counseling and home visits in latest month"
                  icon={<Activity size={18} />}
                />
                <MetricCard
                  title="Likely Harm Prevented"
                  value={`${latest(incidentResolutionSeries).toFixed(1)}%`}
                  accent="text-rose-500"
                  footnote="Incident resolution rate this month"
                  icon={<Heart size={18} />}
                />
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-navy-DEFAULT dark:text-slate-100">Monthly Funding Momentum</h2>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    Donor contributions by month, showing how consistently support is flowing.
                  </p>
                  <SparkLine
                    data={donationSeries}
                    stroke="#00B7EB"
                    fill="#00B7EB"
                    valueFormatter={(v) => formatUSD(v)}
                  />
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h2 className="text-xl font-bold text-navy-DEFAULT dark:text-slate-100">Cumulative Funds Mobilized</h2>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    Running total of support unlocked for shelter and services this year.
                  </p>
                  <SparkLine
                    data={cumulativeDonations}
                    stroke="#0f172a"
                    fill="#0f172a"
                    valueFormatter={(v) => formatUSD(v)}
                  />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-navy-DEFAULT dark:text-slate-100">Shelter Reach</h3>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                    Capacity pressure by region highlights where support is most urgent.
                  </p>
                  <RegionCapacity rows={regionCapacity} />
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-navy-DEFAULT dark:text-slate-100">Reintegration Throughput</h3>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                    Monthly admissions versus completed reintegration outcomes.
                  </p>
                  <DualBars
                    admitted={reintegrationAdmittedSeries}
                    completed={reintegrationCompletedSeries}
                  />
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-navy-DEFAULT dark:text-slate-100">Attendance & Wellbeing</h3>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                    Latest outcome indicators that show educational and health stability.
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Attendance</p>
                      <p className="text-2xl font-black text-emerald-600">{latest(attendanceSeries).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Health score index</p>
                      <p className="text-2xl font-black text-emerald-600">{latest(healthSeries).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Current residents</p>
                      <p className="text-2xl font-black text-cyan-600">{data.totalResidents}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Open homes</p>
                      <p className="text-2xl font-black text-cyan-600">{data.activeSafehouses}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <h3 className="text-lg font-bold text-navy-DEFAULT dark:text-slate-100">Latest Impact Notes</h3>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  Most recent field snapshots from operations and case teams.
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {recentHighlights.map((s) => (
                    <div key={s.snapshotId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(s.snapshotDate).toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{s.headline}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <SiteFooter variant="dark" className="mt-8" />
    </div>
  );
}
