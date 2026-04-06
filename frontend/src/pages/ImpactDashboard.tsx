import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { CSSProperties } from "react";

// ── Brand colors ──────────────────────────────────────────────────────────────
const BLUE     = "#3b5ce5";
const BLUE_LT  = "#dbeafe";
const NAVY     = "#0f172a";
const GRAY_BG  = "#f8f9fb";
const CARD     = "#ffffff";
const BORDER   = "#e5e7eb";
const TEXT     = "#111827";
const MUTED    = "#6b7280";
const GREEN    = "#16a34a";
const GREEN_LT = "#dcfce7";
const AMBER    = "#d97706";

// ── Data types ────────────────────────────────────────────────────────────────
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

interface ImpactSnapshot {
  date: string;
  headline: string;
  detail: string;
}

interface StatStrip {
  value: string;
  label: string;
}

interface SafeHomeStat {
  val: number;
  lbl: string;
}

interface FooterCol {
  heading: string;
  links: string[];
}

interface MilestoneItem {
  pct: number;
  label: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const donationTrends: DonationMonth[] = [
  { month: "Jan", amount: 11200 },
  { month: "Feb", amount: 14500 },
  { month: "Mar", amount: 10300 },
  { month: "Apr", amount: 16800 },
  { month: "May", amount: 20500 },
  { month: "Jun", amount: 17900 },
  { month: "Jul", amount: 18400 },
  { month: "Aug", amount: 21200 },
  { month: "Sep", amount: 19800 },
  { month: "Oct", amount: 24600 },
  { month: "Nov", amount: 31000 },
  { month: "Dec", amount: 42500 },
];

const fundAllocation: FundSlice[] = [
  { name: "Safe Housing & Food",  value: 38, color: BLUE      },
  { name: "Counseling & Therapy", value: 27, color: "#6366f1" },
  { name: "Education Support",    value: 18, color: "#06b6d4" },
  { name: "Healthcare",           value: 12, color: "#10b981" },
  { name: "Admin & Operations",   value: 5,  color: BORDER    },
];

const outcomesByMonth: OutcomeMonth[] = [
  { month: "Jan", counselingSessions: 84,  educationMilestones: 12, reintegrations: 1 },
  { month: "Feb", counselingSessions: 91,  educationMilestones: 15, reintegrations: 2 },
  { month: "Mar", counselingSessions: 88,  educationMilestones: 14, reintegrations: 1 },
  { month: "Apr", counselingSessions: 97,  educationMilestones: 18, reintegrations: 3 },
  { month: "May", counselingSessions: 103, educationMilestones: 21, reintegrations: 2 },
  { month: "Jun", counselingSessions: 89,  educationMilestones: 16, reintegrations: 4 },
  { month: "Jul", counselingSessions: 110, educationMilestones: 23, reintegrations: 2 },
  { month: "Aug", counselingSessions: 115, educationMilestones: 25, reintegrations: 3 },
  { month: "Sep", counselingSessions: 122, educationMilestones: 28, reintegrations: 5 },
];

const safehouses: Safehouse[] = [
  { name: "Casa Esperanca", city: "Sao Paulo",      residents: 14, capacity: 18, reintegrated: 27 },
  { name: "Casa Nova Vida", city: "Rio de Janeiro",  residents: 11, capacity: 15, reintegrated: 19 },
  { name: "Casa Aurora",    city: "Salvador",         residents: 9,  capacity: 12, reintegrated: 14 },
];

const impactSnapshots: ImpactSnapshot[] = [
  {
    date: "March 2026",
    headline: "Five residents successfully reintegrated",
    detail: "Five young women completed their rehabilitation journey and returned safely to family settings with ongoing support plans in place.",
  },
  {
    date: "February 2026",
    headline: "Record 115 counseling sessions held",
    detail: "Our social workers conducted 115 individual and group sessions — our highest monthly total — reflecting expanded staffing and deeper resident engagement.",
  },
  {
    date: "January 2026",
    headline: "New education partnerships established",
    detail: "Partnerships with two local schools now provide on-site tutoring and accredited coursework for residents working toward their diplomas.",
  },
];

// ── Logo ──────────────────────────────────────────────────────────────────────
interface SafiraLogoProps {
  height?: number;
  color?: string;
}

function SafiraLogo({ height = 36, color = NAVY }: SafiraLogoProps) {
  return (
    <svg height={height} viewBox="0 0 116 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3C27.5 3 33.5 8.5 33.5 15.5C33.5 22 29.5 28 23 31C21 32 20 32.5 20 32.5C20 32.5 19 32 17 31C10.5 28 6.5 22 6.5 15.5C6.5 8.5 12.5 3 20 3Z" fill={color} />
      <circle cx="17.5" cy="11" r="3" fill="white" opacity="0.9" />
      <path d="M12.5 22.5Q14 16 18 15Q22.5 14 23.5 17.5Q24.5 21 22 24" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
      <circle cx="23.5" cy="19.5" r="2.2" fill="white" opacity="0.85" />
      <path d="M15.5 23Q19 26 23.5 24" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <polygon points="20,0.5 21,2 20,3.5 19,2"     fill={color} opacity="0.55" />
      <polygon points="20,33.5 21,35 20,36.5 19,35"  fill={color} opacity="0.55" />
      <polygon points="3.5,17.5 5,19 3.5,20.5 2,19"  fill={color} opacity="0.55" />
      <polygon points="36.5,17.5 38,19 36.5,20.5 35,19" fill={color} opacity="0.55" />
      <text x="46" y="25" fontFamily="Georgia,'Times New Roman',serif" fontSize="19" fontWeight="700" letterSpacing="4" fill={color}>SAFIRA</text>
    </svg>
  );
}

// ── Shared component props ────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color: string;
  bg: string;
}

interface KpiCardProps {
  value: string | number;
  label: string;
  sub?: string;
  accent?: string;
}

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: CSSProperties;
}

// ── Shared components ─────────────────────────────────────────────────────────
function Badge({ label, color, bg }: BadgeProps) {
  return (
    <span style={{ background: bg, color, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, display: "inline-block", letterSpacing: 0.2 }}>
      {label}
    </span>
  );
}

function KpiCard({ value, label, sub, accent = BLUE }: KpiCardProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "24px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 38, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, style }: ChartCardProps) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, ...style }}>
      {title && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtUSD = (n: number): string =>
  n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

type TabKey = "overview" | "donations" | "outcomes" | "safe homes";

// ── Main component ────────────────────────────────────────────────────────────
export default function ImpactDashboard() {
  const [tab, setTab] = useState<TabKey>("overview");

  const totalDonations      = donationTrends.reduce((s, d) => s + d.amount, 0);
  const totalReintegrations = outcomesByMonth.reduce((s, d) => s + d.reintegrations, 0);
  const totalSessions       = outcomesByMonth.reduce((s, d) => s + d.counselingSessions, 0);
  const totalResidents      = safehouses.reduce((s, sh) => s + sh.residents, 0);

  const tabs: { label: string; key: TabKey }[] = [
    { label: "Overview",   key: "overview"   },
    { label: "Donations",  key: "donations"  },
    { label: "Outcomes",   key: "outcomes"   },
    { label: "Safe Homes", key: "safe homes" },
  ];

  const statStrip: StatStrip[] = [
    { value: "150+",                      label: "Children Served"          },
    { value: "3",                         label: "Safe Homes"               },
    { value: String(totalReintegrations), label: "Reintegrations This Year" },
    { value: "8",                         label: "Years of Impact"          },
  ];

  const milestones: MilestoneItem[] = [
    { pct: 87, label: "Residents attending school regularly" },
    { pct: 79, label: "Residents showing measurable emotional progress" },
    { pct: 72, label: "Families engaged in reintegration planning" },
    { pct: 94, label: "Cases with current intervention plans" },
  ];

  const footerCols: FooterCol[] = [
    { heading: "Quick Links", links: ["Home", "About", "Donate", "Contact"] },
    { heading: "Contact",     links: ["contact@safira.org", "+55 11 9999-0000", "Sao Paulo, Brazil"] },
    { heading: "Follow Us",   links: ["Instagram", "Facebook", "LinkedIn"] },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: GRAY_BG, minHeight: "100vh", color: TEXT }}>

      {/* ── Nav ── */}
      <nav style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 40px", height: 64, position: "sticky", top: 0, zIndex: 100, gap: 32 }}>
        <SafiraLogo height={30} color={NAVY} />
        <div style={{ display: "flex", gap: 4, flex: 1, justifyContent: "center" }}>
          {(["Home", "About", "Donate", "Contact"] as const).map((l) => (
            <a key={l} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 14, color: MUTED, fontWeight: 400, textDecoration: "none", cursor: "pointer" }}>{l}</a>
          ))}
        </div>
        <button style={{ background: BLUE, color: "#fff", border: "none", padding: "9px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}>Donate Now</button>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(to bottom, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.60) 100%), url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400&auto=format&fit=crop&q=80') center/cover no-repeat`,
        padding: "88px 56px",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 48,
      }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 600, marginBottom: 22, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Annual Impact Report &middot; 2025&ndash;2026
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.12, marginBottom: 18, fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Every Child<br />Deserves Safety
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, opacity: 0.88, marginBottom: 30 }}>
            Safira protects children who are victims of sexual abuse in Brazil, providing shelter, healing, and a path to a brighter future. See exactly where your support goes.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ background: BLUE, color: "#fff", border: "none", padding: "13px 32px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Donate Now</button>
            <button style={{ background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.45)", padding: "13px 26px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Watch Our Story</button>
          </div>
        </div>
        <div style={{ flexShrink: 0, width: 176, height: 176, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 136, height: 136, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: `2px solid rgba(59,92,229,0.7)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 50, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{totalResidents}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4, textAlign: "center", fontWeight: 500 }}>Girls in<br />Our Care</div>
          </div>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {statStrip.map((s, i) => (
            <div key={i} style={{ padding: "32px 24px", textAlign: "center", borderRight: i < statStrip.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: BLUE, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tab bar ── */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, display: "flex", padding: "0 40px" }}>
        {tabs.map(({ label, key }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{ padding: "15px 22px", fontSize: 14, fontWeight: tab === key ? 700 : 500, color: tab === key ? BLUE : MUTED, background: "none", border: "none", borderBottom: `3px solid ${tab === key ? BLUE : "transparent"}`, cursor: "pointer", letterSpacing: 0.2 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <main style={{ padding: "36px 40px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <KpiCard value={totalResidents}                            label="Residents Currently Served" sub="Across 3 safe homes" />
              <KpiCard value={totalReintegrations}                       label="Successful Reintegrations"  sub="This program year" />
              <KpiCard value={totalSessions.toLocaleString()}            label="Counseling Sessions"        sub="Individual and group" />
              <KpiCard value={`$${(totalDonations / 1000).toFixed(0)}k`} label="Raised This Year"           sub="From all supporters" />
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <ChartCard title="Donation Activity" subtitle="Monthly contributions — program year" style={{ flex: 1.6 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={donationTrends}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={BLUE} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={BLUE} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: MUTED }} />
                    <YAxis tickFormatter={fmtUSD} tick={{ fontSize: 12, fill: MUTED }} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Donations"]} />
                    <Area type="monotone" dataKey="amount" stroke={BLUE} strokeWidth={2.5} fill="url(#dg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="How Funds Are Used" subtitle="Current fiscal year" style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={168}>
                  <PieChart>
                    <Pie data={fundAllocation} cx="50%" cy="50%" innerRadius={48} outerRadius={74} dataKey="value" paddingAngle={3}>
                      {fundAllocation.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {fundAllocation.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: TEXT }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: BLUE }}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 16 }}>Recent Impact Updates</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {impactSnapshots.map((s, i) => (
                  <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, borderTop: `3px solid ${BLUE}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8, lineHeight: 1.4 }}>{s.headline}</div>
                    <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>{s.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ DONATIONS ══ */}
        {tab === "donations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <KpiCard value={`$${(totalDonations / 1000).toFixed(0)}k`} label="Total Raised (Program Year)" />
              <KpiCard value="247"    label="Active Supporters"    sub="+18 new this quarter" />
              <KpiCard value="82%"    label="Donor Retention Rate" sub="Up 6% vs last year" />
              <KpiCard value="$1,120" label="Avg. Annual Gift"     sub="Monetary donors" />
            </div>

            <ChartCard title="Monthly Donations" subtitle="Full program year">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={donationTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 13, fill: MUTED }} />
                  <YAxis tickFormatter={fmtUSD} tick={{ fontSize: 13, fill: MUTED }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Donations"]} />
                  <Bar dataKey="amount" fill={BLUE} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div style={{ display: "flex", gap: 16 }}>
              <ChartCard title="Supporter Types" style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Monetary Donors",  value: 58, color: BLUE      },
                        { name: "Volunteers",        value: 21, color: "#6366f1" },
                        { name: "In-Kind",           value: 13, color: "#06b6d4" },
                        { name: "Skills / Pro Bono", value: 8,  color: "#10b981" },
                      ]}
                      cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}
                    >
                      {[BLUE, "#6366f1", "#06b6d4", "#10b981"].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Fund Allocation" style={{ flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
                  {fundAllocation.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: TEXT, width: 155, flexShrink: 0 }}>{item.name}</span>
                      <div style={{ flex: 1, height: 9, background: "#f3f4f6", borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${item.value * 2.4}%`, height: "100%", background: item.color, borderRadius: 5 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: BLUE, width: 32, textAlign: "right" }}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ══ OUTCOMES ══ */}
        {tab === "outcomes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <KpiCard value={totalSessions.toLocaleString()} label="Counseling Sessions"       sub="Program year total" />
              <KpiCard value="172"                            label="Education Milestones"       sub="Grades advanced / diplomas" />
              <KpiCard value="98%"                            label="Health Check Completion"    sub="Monthly wellness reviews" />
              <KpiCard value={totalReintegrations}            label="Successful Reintegrations"  sub="Safe return to family / community" />
            </div>

            <ChartCard title="Monthly Outcomes Trends" subtitle="Counseling sessions, education milestones, and reintegrations">
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={outcomesByMonth} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: MUTED }} />
                  <YAxis tick={{ fontSize: 12, fill: MUTED }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                  <Bar dataKey="counselingSessions"  name="Counseling Sessions"  fill={BLUE}      radius={[3, 3, 0, 0]} />
                  <Bar dataKey="educationMilestones" name="Education Milestones" fill="#06b6d4"   radius={[3, 3, 0, 0]} />
                  <Bar dataKey="reintegrations"      name="Reintegrations"       fill="#10b981"   radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                  <div style={{ position: "relative", width: 76, height: 76 }}>
                    <svg viewBox="0 0 36 36" style={{ width: 76, height: 76 }}>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3.2" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={BLUE} strokeWidth="3.2"
                        strokeDasharray={`${m.pct} ${100 - m.pct}`} strokeLinecap="round" transform="rotate(-90 18 18)" />
                    </svg>
                    <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 15, fontWeight: 800, color: BLUE }}>{m.pct}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.55 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SAFE HOMES ══ */}
        {tab === "safe homes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <KpiCard value="3"                           label="Active Safe Homes"       sub="Brazil" />
              <KpiCard value={`${totalResidents} / 45`}   label="Occupancy"               sub="Beds in use / total capacity" />
              <KpiCard value="11"                          label="Social Workers and Staff" sub="Across all locations" />
              <KpiCard value="Avg. 14 mo."                 label="Average Length of Stay"  sub="Intake to reintegration" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {safehouses.map((sh, i) => {
                const pct      = Math.round((sh.residents / sh.capacity) * 100);
                const barColor = pct > 85 ? AMBER : BLUE;
                const shStats: SafeHomeStat[] = [
                  { val: sh.residents,   lbl: "Residents"    },
                  { val: sh.capacity,    lbl: "Capacity"     },
                  { val: sh.reintegrated, lbl: "Reintegrated" },
                ];
                return (
                  <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{sh.name}</div>
                      <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{sh.city}, Brazil</div>
                      <div style={{ marginTop: 8 }}><Badge label="Active" color={GREEN} bg={GREEN_LT} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                      {shStats.map((s, j) => (
                        <div key={j} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ fontSize: 26, fontWeight: 800, color: BLUE }}>{s.val}</div>
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{s.lbl}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, marginBottom: 5, fontWeight: 500 }}>
                        <span>Occupancy</span>
                        <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <ChartCard title="Residents per Safe Home" subtitle="Current vs. capacity">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={safehouses.map((s) => ({ name: s.name, current: s.residents, capacity: s.capacity }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: MUTED }} />
                  <YAxis tick={{ fontSize: 12, fill: MUTED }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                  <Bar dataKey="current"  name="Current Residents" fill={BLUE}     radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capacity" name="Capacity"           fill="#e0e7ff"  radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </main>

      {/* ── Donate CTA ── */}
      <section style={{ background: NAVY, color: "#fff", padding: "72px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 14, fontFamily: "Georgia,'Times New Roman',serif" }}>Ready to make a difference?</h2>
          <p style={{ fontSize: 17, opacity: 0.8, marginBottom: 30 }}>Every dollar provides safety, healing, and hope for a survivor in Brazil.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 22 }}>
            {(["$25", "$50", "$100", "$250"] as const).map((amt) => (
              <button key={amt} style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{amt}</button>
            ))}
            <button style={{ background: "transparent", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Custom</button>
          </div>
          <button style={{ background: BLUE, color: "#fff", border: "none", padding: "16px 52px", borderRadius: 9, fontSize: 17, fontWeight: 700, cursor: "pointer" }}>Donate Securely</button>
          <p style={{ fontSize: 13, opacity: 0.5, marginTop: 16 }}>SAFIRA is a registered 501(c)(3) nonprofit. All donations are tax-deductible.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "52px 40px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 36, marginBottom: 36 }}>
          <div>
            <div style={{ marginBottom: 12 }}><SafiraLogo height={28} color="#94a3b8" /></div>
            <p style={{ fontSize: 13, lineHeight: 1.65, maxWidth: 260 }}>Protecting children and restoring hope across Brazil since 2017.</p>
          </div>
          {footerCols.map((col, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{col.heading}</div>
              {col.links.map((l, j) => (
                <div key={j} style={{ fontSize: 13, marginBottom: 7, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 12, borderTop: "1px solid #1e293b", paddingTop: 22, maxWidth: 1100, margin: "0 auto" }}>
          &copy; 2026 Safira. All rights reserved. &nbsp;&middot;&nbsp; All data anonymized and aggregated.
        </div>
      </footer>
    </div>
  );
}
