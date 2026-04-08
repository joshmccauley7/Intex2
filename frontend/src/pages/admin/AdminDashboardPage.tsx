import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api'
import {
  Users, Home, Heart, Calendar, TrendingUp, Activity,
  BookOpen, MessageSquare, ShieldAlert, Percent, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  DashboardDetailModal,
  type KpiItem,
  type ChartData,
  type ColumnDef,
} from '../../components/ui/DashboardDetailModal'

// ── Dashboard summary types ───────────────────────────────────────────────────

interface DashboardData {
  activeResidents: number
  activeSafehouses: number
  activeDonors: number
  highChurnCount: number
  residentStatusCounts: { status: string; count: number }[]
  churnCounts: { riskLevel: string; count: number }[]
  recentDonations: {
    donationId: number
    donorName: string
    donationDate: string
    amount: number | null
    donationType: string | null
    campaignName: string | null
    isRecurring: boolean | null
  }[]
  upcomingConferences: {
    conferenceId: number
    residentCode: string | null
    conferenceType: string | null
    nextConferenceDate: string
    socialWorker: string | null
  }[]
  healthAvg: {
    avgGeneralHealth: number
    avgNutrition: number
    avgSleepQuality: number
    avgEnergyLevel: number
  } | null
  educationAvg: {
    avgAttendanceRate: number
    avgProgressPercent: number
  } | null
  enrollmentCounts: { status: string | null; count: number }[]
  counselingCounts: { sessionType: string | null; count: number }[]
  activeRiskCounts: { riskLevel: string | null; count: number }[]
  donorOkrPercent: number | null
  donorOkrRecentCount: number
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const CHURN_BADGE: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
}
const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-500',
  Transferred: 'bg-blue-100 text-blue-700',
}
const BAR_COLOR: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-400',
  Low: 'bg-green-500',
}
const RISK_BADGE: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
}
const cardHover = 'cursor-pointer hover:shadow-md hover:border-safira-blue/30 transition-all'

// ── Currency formatter ────────────────────────────────────────────────────────

const phpFmt = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2,
})
const fmtPhp = (v: unknown) =>
  v != null ? phpFmt.format(Number(v)) : '—'

// ── Modal config (columns + link) per section ─────────────────────────────────

interface SectionConfig {
  title: string
  linkTo?: string
  linkLabel?: string
  columns: ColumnDef[]
}

const MODAL_CONFIG: Record<string, SectionConfig> = {
  residents: {
    title: 'Active Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode',     label: 'Code' },
      { key: 'safehouse',        label: 'Safe House' },
      { key: 'currentRiskLevel', label: 'Risk' },
      { key: 'dateOfAdmission',  label: 'Admitted' },
    ],
  },
  safehouses: {
    title: 'Active Safe Houses',
    columns: [
      { key: 'name',         label: 'Name' },
      { key: 'city',         label: 'City' },
      { key: 'residents',    label: 'Residents' },
      { key: 'capacity',     label: 'Capacity' },
      { key: 'occupancyPct', label: 'Occupancy', fmt: (v) => `${v}%` },
    ],
  },
  donors: {
    title: 'Active Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',  label: 'Name' },
      { key: 'country',      label: 'Country' },
      { key: 'lastDonation', label: 'Last Donation' },
      { key: 'totalDonated', label: 'Total (all time, PHP)', fmt: fmtPhp },
      { key: 'giftCount',    label: 'Gifts' },
    ],
  },
  'churn-all': {
    title: 'Donor Churn Risk — All Tiers',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'riskLevel',        label: 'Risk' },
      { key: 'displayName',      label: 'Donor' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation',     label: 'Last Donation' },
      { key: 'valueInPeriod',    label: 'Total Donated (PHP)', fmt: fmtPhp },
    ],
  },
  'churn-high': {
    title: 'High Churn Risk — Priority Outreach Queue',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',      label: 'Donor' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation',     label: 'Last Donation' },
      { key: 'valueLast12Mo',    label: 'Value (12 mo, PHP)', fmt: fmtPhp },
    ],
  },
  'churn-medium': {
    title: 'Medium Churn Risk Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',      label: 'Donor' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation',     label: 'Last Donation' },
      { key: 'valueLast12Mo',    label: 'Value (12 mo, PHP)', fmt: fmtPhp },
    ],
  },
  'churn-low': {
    title: 'Low Churn Risk Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',      label: 'Donor' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation',     label: 'Last Donation' },
      { key: 'valueLast12Mo',    label: 'Value (12 mo, PHP)', fmt: fmtPhp },
    ],
  },
  donations: {
    title: 'All Donations',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',  label: 'Donor' },
      { key: 'donationDate', label: 'Date' },
      { key: 'amount',       label: 'Amount (PHP)', fmt: fmtPhp },
      { key: 'donationType', label: 'Type' },
    ],
  },
  conferences: {
    title: 'Upcoming Conferences',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'residentCode',       label: 'Resident' },
      { key: 'conferenceType',     label: 'Type' },
      { key: 'nextConferenceDate', label: 'Date' },
      { key: 'socialWorker',       label: 'Social Worker' },
    ],
  },
  health: {
    title: 'Health & Wellbeing — Lowest Scores First',
    columns: [
      { key: 'residentCode',  label: 'Resident' },
      { key: 'recordDate',    label: 'Date' },
      { key: 'generalHealth', label: 'General', fmt: (v) => v != null ? `${v}/5` : '—' },
      { key: 'nutrition',     label: 'Nutrition', fmt: (v) => v != null ? `${v}/5` : '—' },
      { key: 'sleep',         label: 'Sleep',    fmt: (v) => v != null ? `${v}/5` : '—' },
      { key: 'energy',        label: 'Energy',   fmt: (v) => v != null ? `${v}/5` : '—' },
    ],
  },
  education: {
    title: 'Education — Lowest Attendance First',
    columns: [
      { key: 'residentCode',    label: 'Resident' },
      { key: 'recordDate',      label: 'Date' },
      { key: 'enrollmentStatus',label: 'Enrollment' },
      { key: 'attendancePct',   label: 'Attendance', fmt: (v) => v != null ? `${v}%` : '—' },
      { key: 'progress',        label: 'Progress',   fmt: (v) => v != null ? `${v}%` : '—' },
    ],
  },
  counseling: {
    title: 'Counseling Sessions',
    columns: [
      { key: 'residentCode',          label: 'Resident' },
      { key: 'sessionType',           label: 'Type' },
      { key: 'sessionDate',           label: 'Date' },
      { key: 'socialWorker',          label: 'Social Worker' },
      { key: 'sessionDurationMinutes',label: 'Duration', fmt: (v) => v != null ? `${v} min` : '—' },
    ],
  },
  'risk-all': {
    title: 'Active Resident Risk — All Tiers',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'riskLevel',    label: 'Risk' },
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse',    label: 'Safe House' },
      { key: 'caseStatus',   label: 'Status' },
    ],
  },
  'risk-high': {
    title: 'High Risk Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse',    label: 'Safe House' },
      { key: 'caseStatus',   label: 'Status' },
    ],
  },
  'risk-medium': {
    title: 'Medium Risk Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse',    label: 'Safe House' },
      { key: 'caseStatus',   label: 'Status' },
    ],
  },
  'risk-low': {
    title: 'Low Risk Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse',    label: 'Safe House' },
      { key: 'caseStatus',   label: 'Status' },
    ],
  },
  'okr-recent': {
    title: 'Donor Retention',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',      label: 'Name' },
      { key: 'country',          label: 'Country' },
      { key: 'lastDonation',     label: 'Last Donation' },
      { key: 'giftCount12mo',    label: 'Gifts (12mo)' },
      { key: 'totalDonated12mo', label: 'Total (12mo, PHP)', fmt: fmtPhp },
      { key: 'statusLabel',      label: 'Status' },
    ],
  },
  'okr-lapsed': {
    title: 'Lapsed Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName',      label: 'Name' },
      { key: 'country',          label: 'Country' },
      { key: 'lastDonation',     label: 'Last Donation' },
      { key: 'giftCount12mo',    label: 'Gifts (12mo)' },
      { key: 'totalDonated12mo', label: 'Value at Risk (PHP)', fmt: fmtPhp },
      { key: 'statusLabel',      label: 'Status' },
    ],
  },
}

// ── Collapsible ───────────────────────────────────────────────────────────────

function CollapsibleSection({
  icon, title, badge, defaultOpen = true, children,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-50 transition-colors"
      >
        {icon}
        <h2 className="font-semibold text-slate-800 text-sm flex-1 text-left">{title}</h2>
        {badge && (
          <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      {open && children}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, highlight = false, onClick, action,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  highlight?: boolean
  onClick?: () => void
  action?: React.ReactNode
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 transition-all ${highlight ? 'border-red-200' : 'border-slate-200'} ${onClick ? `${cardHover}` : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${highlight ? 'text-red-600' : 'text-[#0f172a]'}`}>{value}</div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {action && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100

const PERIOD_OPTIONS = [
  { label: 'All Time',       value: 'all'  },
  { label: 'Last 3 Months',  value: '3mo'  },
  { label: 'Last 6 Months',  value: '6mo'  },
  { label: 'Last 12 Months', value: '12mo' },
]

// Sections where current state doesn't meaningfully change by period — hide the dropdown
const NO_PERIOD_SECTIONS = ['residents', 'safehouses', 'risk-all', 'risk-high', 'risk-medium', 'risk-low', 'churn-all', 'churn-high', 'churn-medium', 'churn-low']

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [modalItems, setModalItems] = useState<Record<string, unknown>[]>([])
  const [modalTotal, setModalTotal] = useState(0)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalKpis, setModalKpis] = useState<KpiItem[]>([])
  const [modalCharts, setModalCharts] = useState<ChartData[]>([])
  const [modalPage, setModalPage] = useState(1)
  const [modalLoadingMore, setModalLoadingMore] = useState(false)
  const [modalPeriod, setModalPeriod] = useState('all')
  const pendingModal = useRef<string | null>(null)

  async function fetchModalData(section: string, page: number, period: string, append = false) {
    if (page === 1) setModalLoading(true)
    else setModalLoadingMore(true)
    const qs = new URLSearchParams({
      section,
      pageSize: String(PAGE_SIZE),
      page: String(page),
      period,
    })
    try {
      const result = await apiFetch(`/api/admin/dashboard/detail?${qs}`)
      if (pendingModal.current !== section) return
      if (append) {
        setModalItems((prev) => [...prev, ...(result.items ?? [])])
      } else {
        setModalItems(result.items ?? [])
        setModalTotal(result.totalCount ?? 0)
        setModalKpis(result.kpis ?? [])
        setModalCharts(result.charts ?? [])
      }
    } catch {
      if (!append) setModalItems([])
    } finally {
      if (page === 1 && pendingModal.current === section) setModalLoading(false)
      else setModalLoadingMore(false)
    }
  }

  const DONOR_SECTIONS    = ['donors', 'churn-all', 'churn-high', 'churn-medium', 'churn-low', 'okr-recent', 'okr-lapsed', 'donations']
  const RESIDENT_SECTIONS = ['residents', 'risk-all', 'risk-high', 'risk-medium', 'risk-low', 'health', 'education', 'counseling', 'conferences']

  function resolveRowClickable(section: string, row: Record<string, unknown>): boolean {
    const supporterId = row.supporterId ?? row.SupporterId
    const residentId  = row.residentId  ?? row.ResidentId
    if (DONOR_SECTIONS.includes(section))    return supporterId != null
    if (RESIDENT_SECTIONS.includes(section)) return residentId  != null
    return false
  }

  function handleRowClick(section: string, row: Record<string, unknown>) {
    const supporterId = row.supporterId ?? row.SupporterId
    const residentId  = row.residentId  ?? row.ResidentId

    if (DONOR_SECTIONS.includes(section) && supporterId != null) {
      closeModal()
      navigate(`/admin/donors?open=${supporterId}`)
    } else if (RESIDENT_SECTIONS.includes(section) && residentId != null) {
      closeModal()
      navigate(`/admin/residents?open=${residentId}`)
    }
  }

  useEffect(() => {
    apiFetch('/api/admin/dashboard')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // okr sections default to 3mo; everything else defaults to all
  function getDefaultPeriod(section: string) {
    return section === 'okr-recent' || section === 'okr-lapsed' ? '3mo' : 'all'
  }

  async function openModal(section: string) {
    const defaultPeriod = getDefaultPeriod(section)
    setModalPeriod(defaultPeriod)
    const period = defaultPeriod
    pendingModal.current = section
    setActiveModal(section)
    setModalItems([])
    setModalTotal(0)
    setModalKpis([])
    setModalCharts([])
    setModalPage(1)
    await fetchModalData(section, 1, period)
  }

  async function loadMoreModal() {
    if (!activeModal || modalLoadingMore) return
    const nextPage = modalPage + 1
    setModalPage(nextPage)
    await fetchModalData(activeModal, nextPage, modalPeriod, true)
  }

  async function handlePeriodChange(newPeriod: string) {
    if (!activeModal) return
    setModalPeriod(newPeriod)
    setModalItems([])
    setModalTotal(0)
    setModalKpis([])
    setModalCharts([])
    setModalPage(1)
    await fetchModalData(activeModal, 1, newPeriod)
  }

  function closeModal() {
    pendingModal.current = null
    setActiveModal(null)
    setModalItems([])
    setModalKpis([])
    setModalCharts([])
    setModalPeriod('all')
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading dashboard…</p>
  if (error)   return <p className="text-red-500 text-sm">{error}</p>
  if (!data)   return null

  const totalResidents = data.residentStatusCounts.reduce((s, x) => s + x.count, 0)
  const totalChurn     = data.churnCounts.reduce((s, x) => s + x.count, 0)

  const activeConfig = activeModal ? MODAL_CONFIG[activeModal] : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Operations overview for Safira staff</p>
      </div>

      {/* ── Primary OKR + High Churn Risk ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`}
          onClick={() => openModal(data.donorOkrPercent != null ? 'okr-recent' : 'donors')}
          title="Click to see donor detail"
        >
          <div className="flex items-center gap-2 mb-3">
            <Percent size={20} className="text-safira-blue" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Donors active in last 3 mo.
            </span>
          </div>
          {data.donorOkrPercent != null ? (
            <>
              <div className="text-3xl font-bold tabular-nums text-[#0f172a]">
                {data.donorOkrPercent.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                <span className="text-xl font-bold text-slate-600">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Primary OKR — {data.donorOkrRecentCount} of {data.activeDonors} active donor
                {data.activeDonors === 1 ? '' : 's'} with a donation in the last 3 months
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-slate-400">—</div>
              <p className="text-xs text-slate-400 mt-1">No active donors to measure yet.</p>
            </>
          )}
          <p className="text-xs text-slate-600 mt-3 leading-relaxed border-t border-slate-100 pt-3">
            <span className="font-medium text-[#0f172a]">Why this matters most:</span> Mission delivery
            depends on steady funding. The share of donors who gave recently reflects engagement and
            predictable support better than total donor count alone.
          </p>
        </div>
        <StatCard
          icon={<ShieldAlert size={20} className="text-red-500" />}
          label="High Churn Risk"
          value={data.highChurnCount}
          sub="donors at risk of lapsing"
          highlight
          onClick={() => openModal('churn-high')}
          action={
            <button
              className="w-full text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-left"
              onClick={() => navigate('/admin/donors?tab=outreach')}
            >
              Go to Outreach Queue →
            </button>
          }
        />
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={20} className="text-safira-blue" />}
          label="Active Residents"
          value={data.activeResidents}
          sub={`across ${data.activeSafehouses} safe houses`}
          onClick={() => openModal('residents')}
        />
        <StatCard
          icon={<Home size={20} className="text-safira-blue" />}
          label="Active Safe Houses"
          value={data.activeSafehouses}
          onClick={() => openModal('safehouses')}
        />
        <StatCard
          icon={<Heart size={20} className="text-safira-blue" />}
          label="Active Donors"
          value={data.activeDonors}
          onClick={() => openModal('donors')}
        />
      </div>

      {/* ── Middle row: donations + conferences ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CollapsibleSection
            icon={<TrendingUp size={16} className="text-safira-blue" />}
            title="Recent Donations"
            badge={String(data.recentDonations.length)}
            defaultOpen={false}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Donor', 'Date', 'Amount', 'Type'].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentDonations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-slate-400 text-xs">
                      No recent donations.
                    </td>
                  </tr>
                ) : data.recentDonations.map((d) => (
                  <tr key={d.donationId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{d.donorName}</td>
                    <td className="px-5 py-3 text-slate-500">{d.donationDate}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium">
                      {d.amount != null ? phpFmt.format(d.amount) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{d.donationType ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100">
              <button onClick={() => openModal('donations')} className="text-xs font-medium text-safira-blue hover:underline">
                View all donations →
              </button>
            </div>
          </CollapsibleSection>
        </div>

        <CollapsibleSection
          icon={<Calendar size={16} className="text-safira-blue" />}
          title="Upcoming Conferences"
          badge={String(data.upcomingConferences.length)}
          defaultOpen={false}
        >
          <div className="divide-y divide-slate-50">
            {data.upcomingConferences.length === 0 ? (
              <p className="px-5 py-6 text-center text-slate-400 text-xs">No upcoming conferences scheduled.</p>
            ) : data.upcomingConferences.map((c) => (
              <div key={c.conferenceId} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 text-sm">
                    {c.residentCode ?? `Resident ${c.conferenceId}`}
                  </span>
                  <span className="text-xs text-slate-400">{c.nextConferenceDate}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {c.conferenceType ?? 'Conference'}{c.socialWorker ? ` · ${c.socialWorker}` : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button onClick={() => openModal('conferences')} className="text-xs font-medium text-safira-blue hover:underline">
              View all conferences →
            </button>
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Bottom row: breakdowns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Resident status breakdown */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`}
          onClick={() => openModal('residents')}
          title="Click to explore resident roster"
        >
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Resident Status Breakdown</h2>
          <div className="flex flex-col gap-3">
            {data.residentStatusCounts.map((s) => (
              <div key={s.status} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                    {s.status ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-slate-500">{s.count} / {totalResidents}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-safira-blue rounded-full group-hover:opacity-80 transition-opacity"
                    style={{ width: `${(s.count / totalResidents) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Click to view full resident analytics</p>
        </div>

        {/* Donor churn risk breakdown */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`}
          onClick={() => openModal('churn-all')}
          title="Click to explore churn risk detail"
        >
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Donor Churn Risk Breakdown</h2>
          {data.churnCounts.length === 0 ? (
            <p className="text-xs text-slate-400">No churn predictions available.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {['High', 'Medium', 'Low'].map((level) => {
                const count = data.churnCounts.find((c) => c.riskLevel === level)?.count ?? 0
                return (
                  <div key={level} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[level]}`}>{level}</span>
                      <span className="text-xs text-slate-500">{count} / {totalChurn}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLOR[level]} group-hover:opacity-80 transition-opacity`}
                        style={{ width: totalChurn > 0 ? `${(count / totalChurn) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">Click to view all churn risk donors</p>
        </div>
      </div>

      {/* ── Resident progress row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Health */}
        <div className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`} onClick={() => openModal('health')}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Health</h2>
          </div>
          {!data.healthAvg ? (
            <p className="text-xs text-slate-400">No health data.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: 'General Health', value: data.healthAvg.avgGeneralHealth },
                { label: 'Nutrition',      value: data.healthAvg.avgNutrition },
                { label: 'Sleep Quality',  value: data.healthAvg.avgSleepQuality },
                { label: 'Energy Level',   value: data.healthAvg.avgEnergyLevel },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-medium text-slate-700">{value} / 5</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-safira-blue rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education */}
        <div className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`} onClick={() => openModal('education')}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Education</h2>
          </div>
          {!data.educationAvg ? (
            <p className="text-xs text-slate-400">No education data.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {[
                { label: 'Avg Attendance', pct: data.educationAvg.avgAttendanceRate, color: 'bg-safira-blue' },
                { label: 'Avg Progress',   pct: data.educationAvg.avgProgressPercent, color: 'bg-green-500' },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-medium text-slate-700">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-1 mt-1">
                {data.enrollmentCounts.map((e) => (
                  <div key={e.status} className="flex justify-between text-xs">
                    <span className="text-slate-500">{e.status ?? 'Unknown'}</span>
                    <span className="font-medium text-slate-700">{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Counseling */}
        <div className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`} onClick={() => openModal('counseling')}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Counseling</h2>
          </div>
          {data.counselingCounts.length === 0 ? (
            <p className="text-xs text-slate-400">No session data.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(() => {
                const total = data.counselingCounts.reduce((s, c) => s + c.count, 0)
                return data.counselingCounts.map((c) => (
                  <div key={c.sessionType}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-500">{c.sessionType ?? 'Unknown'}</span>
                      <span className="text-xs font-medium text-slate-700">{c.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(c.count / total) * 100}%` }} />
                    </div>
                  </div>
                ))
              })()}
              <p className="text-xs text-slate-400 mt-1">
                {data.counselingCounts.reduce((s, c) => s + c.count, 0).toLocaleString()} total sessions
              </p>
            </div>
          )}
        </div>

        {/* Active resident risk */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${cardHover}`}
          onClick={() => openModal('risk-all')}
          title="Click to explore resident risk analytics"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Active Resident Risk</h2>
          </div>
          {data.activeRiskCounts.length === 0 ? (
            <p className="text-xs text-slate-400">No risk data.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(() => {
                const total = data.activeRiskCounts.reduce((s, r) => s + r.count, 0)
                return ['High', 'Medium', 'Low'].map((level) => {
                  const count = data.activeRiskCounts.find((r) => r.riskLevel === level)?.count ?? 0
                  return (
                    <div key={level} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_BADGE[level]}`}>{level}</span>
                        <span className="text-xs text-slate-500">{count} / {total}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${BAR_COLOR[level]} group-hover:opacity-80 transition-opacity`}
                          style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">Click to view all active resident risk</p>
        </div>
      </div>

      {/* ── Detail modal ── */}
      {activeModal && activeConfig && (
        <DashboardDetailModal
          title={activeConfig.title + (!NO_PERIOD_SECTIONS.includes(activeModal) && PERIOD_OPTIONS.find(o => o.value === modalPeriod)
            ? ` (${PERIOD_OPTIONS.find(o => o.value === modalPeriod)!.label})`
            : '')}
          linkTo={activeConfig.linkTo}
          linkLabel={activeConfig.linkLabel}
          columns={activeConfig.columns}
          kpis={modalKpis}
          charts={modalCharts}
          items={modalItems}
          totalCount={modalTotal}
          loading={modalLoading}
          onClose={closeModal}
          onLoadMore={loadMoreModal}
          loadingMore={modalLoadingMore}
          onRowClick={(row) => handleRowClick(activeModal, row)}
          isRowClickable={(row) => resolveRowClickable(activeModal, row)}
          periodOptions={NO_PERIOD_SECTIONS.includes(activeModal) ? undefined : PERIOD_OPTIONS}
          period={modalPeriod}
          onPeriodChange={handlePeriodChange}
          extraAction={activeModal === 'churn-high' ? { label: 'Go to Outreach Queue', to: '/admin/donors?tab=outreach' } : undefined}
        />
      )}
    </div>
  )
}
