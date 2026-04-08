import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api'
import {
  Users, Home, Heart, AlertTriangle, Calendar, TrendingUp, Activity,
  BookOpen, MessageSquare, ShieldAlert, Percent, X, ChevronDown, ChevronRight,
  Download, Printer, Search,
} from 'lucide-react'

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

type KpiItem = { label: string; value: string }

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

const interactiveCardClass =
  'cursor-pointer hover:shadow-md hover:border-safira-blue/30 transition-all'

// ── Modal config ──────────────────────────────────────────────────────────────

interface ModalDetail {
  title: string
  linkTo?: string
  linkLabel?: string
  columns: { key: string; label: string; fmt?: (v: unknown) => string }[]
}

const MODAL_CONFIG: Record<string, ModalDetail> = {
  residents: {
    title: 'Active Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse', label: 'Safe House' },
      { key: 'currentRiskLevel', label: 'Risk' },
      { key: 'dateOfAdmission', label: 'Admitted' },
    ],
  },
  safehouses: {
    title: 'Active Safe Houses',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'city', label: 'City' },
      { key: 'residents', label: 'Residents' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'occupancyPct', label: 'Occupancy', fmt: (v) => `${v}%` },
    ],
  },
  donors: {
    title: 'Active Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'country', label: 'Country' },
      { key: 'lastDonation', label: 'Last Donation' },
      { key: 'totalDonated', label: 'Total', fmt: (v) => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
    ],
  },
  'churn-high': {
    title: 'High Churn Risk Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation', label: 'Last Donation' },
    ],
  },
  'churn-medium': {
    title: 'Medium Churn Risk Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation', label: 'Last Donation' },
    ],
  },
  'churn-low': {
    title: 'Low Churn Risk Donors',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'churnProbability', label: 'Churn %', fmt: (v) => `${v}%` },
      { key: 'lastDonation', label: 'Last Donation' },
    ],
  },
  donations: {
    title: 'All Donations',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Donor' },
      { key: 'donationDate', label: 'Date' },
      { key: 'amount', label: 'Amount', fmt: (v) => v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
      { key: 'donationType', label: 'Type' },
    ],
  },
  conferences: {
    title: 'Upcoming Conferences',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'residentCode', label: 'Resident' },
      { key: 'conferenceType', label: 'Type' },
      { key: 'nextConferenceDate', label: 'Date' },
      { key: 'socialWorker', label: 'Social Worker' },
    ],
  },
  health: {
    title: 'Health & Wellbeing Records',
    columns: [
      { key: 'residentCode', label: 'Resident' },
      { key: 'recordDate', label: 'Date' },
      { key: 'generalHealth', label: 'General', fmt: (v) => v != null ? `${v}/5` : '—' },
      { key: 'nutrition', label: 'Nutrition', fmt: (v) => v != null ? `${v}/5` : '—' },
      { key: 'sleep', label: 'Sleep', fmt: (v) => v != null ? `${v}/5` : '—' },
      { key: 'energy', label: 'Energy', fmt: (v) => v != null ? `${v}/5` : '—' },
    ],
  },
  education: {
    title: 'Education Records',
    columns: [
      { key: 'residentCode', label: 'Resident' },
      { key: 'recordDate', label: 'Date' },
      { key: 'enrollmentStatus', label: 'Enrollment' },
      { key: 'attendancePct', label: 'Attendance', fmt: (v) => v != null ? `${v}%` : '—' },
      { key: 'progress', label: 'Progress', fmt: (v) => v != null ? `${v}%` : '—' },
    ],
  },
  counseling: {
    title: 'Counseling Sessions',
    columns: [
      { key: 'residentCode', label: 'Resident' },
      { key: 'sessionType', label: 'Type' },
      { key: 'sessionDate', label: 'Date' },
      { key: 'socialWorker', label: 'Social Worker' },
      { key: 'sessionDurationMinutes', label: 'Duration', fmt: (v) => v != null ? `${v} min` : '—' },
    ],
  },
  'risk-high': {
    title: 'High Risk Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse', label: 'Safe House' },
      { key: 'caseStatus', label: 'Status' },
    ],
  },
  'risk-medium': {
    title: 'Medium Risk Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse', label: 'Safe House' },
      { key: 'caseStatus', label: 'Status' },
    ],
  },
  'risk-low': {
    title: 'Low Risk Residents',
    linkTo: '/admin/residents', linkLabel: 'View all residents',
    columns: [
      { key: 'internalCode', label: 'Code' },
      { key: 'safehouse', label: 'Safe House' },
      { key: 'caseStatus', label: 'Status' },
    ],
  },
  'okr-recent': {
    title: 'Donors — Active (Last 3 Months)',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'lastDonation', label: 'Last Donation' },
      { key: 'donationLabel', label: 'Status' },
    ],
  },
  'okr-lapsed': {
    title: 'Donors — Lapsed (No Donation in 3 Months)',
    linkTo: '/admin/donors', linkLabel: 'View all donors',
    columns: [
      { key: 'displayName', label: 'Name' },
      { key: 'lastDonation', label: 'Last Donation' },
      { key: 'donationLabel', label: 'Status' },
    ],
  },
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function DashboardDetailModal({
  section,
  items,
  totalCount,
  loading,
  summary,
  onClose,
  onLoadMore,
  loadingMore,
}: {
  section: string
  items: Record<string, unknown>[]
  totalCount: number
  loading: boolean
  summary: KpiItem[]
  onClose: () => void
  onLoadMore: () => void
  loadingMore: boolean
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const config = MODAL_CONFIG[section]
  if (!config) return null

  const filtered = search
    ? items.filter((row) =>
        config.columns.some((col) => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(search.toLowerCase())
        })
      )
    : items

  function exportCsv() {
    const header = config.columns.map((c) => `"${c.label}"`).join(',')
    const rows = filtered.map((row) =>
      config.columns
        .map((col) => {
          const raw = row[col.key]
          const display = col.fmt ? col.fmt(raw) : raw != null ? String(raw) : ''
          return `"${display.replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${section}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 px-4 pb-6">
      {/* Backdrop — no onClick so only the X button closes */}
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a]">{config.title}</h2>
            {!loading && (
              <p className="text-xs text-slate-400 mt-0.5">
                {totalCount.toLocaleString()} total record{totalCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={loading || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
            >
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Printer size={13} />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* KPI summary row */}
        {!loading && summary.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex flex-wrap gap-6">
            {summary.map((kpi, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-xl font-bold text-[#0f172a] tabular-nums">{kpi.value}</span>
                <span className="text-xs text-slate-400 mt-0.5">{kpi.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-slate-100 shrink-0">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search within loaded records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-safira-blue/30 bg-white"
            />
          </div>
        </div>

        {/* Table body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-sm text-slate-400 px-6 py-10 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 px-6 py-10 text-center">
              {search ? 'No records match your search.' : 'No data available.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                <tr>
                  {config.columns.map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {config.columns.map((col) => {
                      const raw = row[col.key]
                      const display = col.fmt ? col.fmt(raw) : raw != null ? String(raw) : '—'
                      return (
                        <td key={col.key} className="px-5 py-3 text-slate-700 whitespace-nowrap">
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {search
              ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'} in ${items.length} loaded`
              : `Showing ${items.length.toLocaleString()} of ${totalCount.toLocaleString()}`}
          </span>
          <div className="flex items-center gap-4">
            {items.length < totalCount && !search && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-sm font-medium text-safira-blue hover:underline disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Load more (${(totalCount - items.length).toLocaleString()} remaining)`}
              </button>
            )}
            {config.linkTo && (
              <button
                onClick={() => {
                  onClose()
                  navigate(config.linkTo!)
                }}
                className="text-sm font-medium text-safira-blue hover:underline"
              >
                {config.linkLabel ?? 'View all'} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Collapsible ───────────────────────────────────────────────────────────────

function CollapsibleSection({
  icon,
  title,
  badge,
  defaultOpen = true,
  children,
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
        {open ? (
          <ChevronDown size={14} className="text-slate-400" />
        ) : (
          <ChevronRight size={14} className="text-slate-400" />
        )}
      </button>
      {open && children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [modalItems, setModalItems] = useState<Record<string, unknown>[]>([])
  const [modalTotal, setModalTotal] = useState(0)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSummary, setModalSummary] = useState<KpiItem[]>([])
  const [modalPage, setModalPage] = useState(1)
  const [modalLoadingMore, setModalLoadingMore] = useState(false)
  const pendingModal = useRef<string | null>(null)

  useEffect(() => {
    apiFetch('/api/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function openModal(section: string) {
    pendingModal.current = section
    setActiveModal(section)
    setModalItems([])
    setModalTotal(0)
    setModalSummary([])
    setModalPage(1)
    setModalLoading(true)
    try {
      const result = await apiFetch(
        `/api/admin/dashboard/detail?section=${encodeURIComponent(section)}&pageSize=${PAGE_SIZE}&page=1`
      )
      if (pendingModal.current !== section) return
      setModalItems(result.items ?? [])
      setModalTotal(result.totalCount ?? 0)
      setModalSummary(result.summary ?? [])
    } catch {
      setModalItems([])
    } finally {
      if (pendingModal.current === section) setModalLoading(false)
    }
  }

  async function loadMoreModal() {
    if (!activeModal || modalLoadingMore) return
    const nextPage = modalPage + 1
    setModalPage(nextPage)
    setModalLoadingMore(true)
    try {
      const result = await apiFetch(
        `/api/admin/dashboard/detail?section=${encodeURIComponent(activeModal)}&pageSize=${PAGE_SIZE}&page=${nextPage}`
      )
      if (pendingModal.current !== activeModal) return
      setModalItems((prev) => [...prev, ...(result.items ?? [])])
    } catch {
      // silently ignore load-more failures
    } finally {
      setModalLoadingMore(false)
    }
  }

  function closeModal() {
    pendingModal.current = null
    setActiveModal(null)
    setModalItems([])
    setModalSummary([])
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading dashboard…</p>
  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (!data) return null

  const totalResidents = data.residentStatusCounts.reduce((s, x) => s + x.count, 0)
  const totalChurn = data.churnCounts.reduce((s, x) => s + x.count, 0)

  const barColors: Record<string, string> = {
    High: 'bg-red-500',
    Medium: 'bg-yellow-400',
    Low: 'bg-green-500',
  }
  const riskBadge: Record<string, string> = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Operations overview for Safira staff</p>
      </div>

      {/* Primary OKR */}
      <div
        className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
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
          predictable support better than total donor count alone—so we prioritize keeping supporters
          connected, not just growing the list.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        <StatCard
          icon={<AlertTriangle size={20} className="text-red-500" />}
          label="High Churn Risk"
          value={data.highChurnCount}
          sub="donors at risk of lapsing"
          highlight
          onClick={() => openModal('churn-high')}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent donations — collapsible, default closed */}
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
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Donor
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentDonations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-slate-400 text-xs">
                      No recent donations.
                    </td>
                  </tr>
                ) : (
                  data.recentDonations.map((d) => (
                    <tr key={d.donationId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{d.donorName}</td>
                      <td className="px-5 py-3 text-slate-500">{d.donationDate}</td>
                      <td className="px-5 py-3 text-slate-800 font-medium">
                        {d.amount != null
                          ? `$${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{d.donationType ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100">
              <button
                onClick={() => openModal('donations')}
                className="text-xs font-medium text-safira-blue hover:underline"
              >
                View all donations →
              </button>
            </div>
          </CollapsibleSection>
        </div>

        {/* Upcoming conferences — collapsible, default closed */}
        <CollapsibleSection
          icon={<Calendar size={16} className="text-safira-blue" />}
          title="Upcoming Conferences"
          badge={String(data.upcomingConferences.length)}
          defaultOpen={false}
        >
          <div className="divide-y divide-slate-50">
            {data.upcomingConferences.length === 0 ? (
              <p className="px-5 py-6 text-center text-slate-400 text-xs">
                No upcoming conferences scheduled.
              </p>
            ) : (
              data.upcomingConferences.map((c) => (
                <div key={c.conferenceId} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 text-sm">
                      {c.residentCode ?? `Resident ${c.conferenceId}`}
                    </span>
                    <span className="text-xs text-slate-400">{c.nextConferenceDate}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.conferenceType ?? 'Conference'}
                    {c.socialWorker ? ` · ${c.socialWorker}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button
              onClick={() => openModal('conferences')}
              className="text-xs font-medium text-safira-blue hover:underline"
            >
              View all conferences →
            </button>
          </div>
        </CollapsibleSection>
      </div>

      {/* Bottom row: breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Resident status breakdown — interactive card */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
          onClick={() => openModal('residents')}
          title="Click to explore resident status detail"
        >
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Resident Status Breakdown</h2>
          <div className="flex flex-col gap-3">
            {data.residentStatusCounts.map((s) => (
              <div key={s.status} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}
                  >
                    {s.status ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {s.count} / {totalResidents}
                  </span>
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
          <p className="text-xs text-slate-400 mt-4">Click to view full resident roster</p>
        </div>

        {/* Donor churn risk breakdown — interactive card */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
          onClick={() => openModal('churn-high')}
          title="Click to explore churn risk detail"
        >
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Donor Churn Risk Breakdown</h2>
          {data.churnCounts.length === 0 ? (
            <p className="text-xs text-slate-400">No churn predictions available.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {['High', 'Medium', 'Low'].map((level) => {
                const entry = data.churnCounts.find((c) => c.riskLevel === level)
                const count = entry?.count ?? 0
                const sectionKey = `churn-${level.toLowerCase()}`
                return (
                  <div
                    key={level}
                    className="group"
                    onClick={(e) => {
                      e.stopPropagation()
                      openModal(sectionKey)
                    }}
                    title={`View ${level} churn risk donors`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[level]}`}>
                        {level}
                      </span>
                      <span className="text-xs text-slate-500">
                        {count} / {totalChurn}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColors[level]} group-hover:opacity-80 transition-opacity`}
                        style={{ width: totalChurn > 0 ? `${(count / totalChurn) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">Click a bar or card to drill into risk tier</p>
        </div>
      </div>

      {/* Resident progress row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Health */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
          onClick={() => openModal('health')}
        >
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
                { label: 'Nutrition', value: data.healthAvg.avgNutrition },
                { label: 'Sleep Quality', value: data.healthAvg.avgSleepQuality },
                { label: 'Energy Level', value: data.healthAvg.avgEnergyLevel },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-medium text-slate-700">{value} / 5</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-safira-blue rounded-full"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
          onClick={() => openModal('education')}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Education</h2>
          </div>
          {!data.educationAvg ? (
            <p className="text-xs text-slate-400">No education data.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-500">Avg Attendance</span>
                  <span className="text-xs font-medium text-slate-700">
                    {data.educationAvg.avgAttendanceRate}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-safira-blue rounded-full"
                    style={{ width: `${data.educationAvg.avgAttendanceRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-500">Avg Progress</span>
                  <span className="text-xs font-medium text-slate-700">
                    {data.educationAvg.avgProgressPercent}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${data.educationAvg.avgProgressPercent}%` }}
                  />
                </div>
              </div>
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
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
          onClick={() => openModal('counseling')}
        >
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
                      <span className="text-xs font-medium text-slate-700">
                        {c.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${(c.count / total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              })()}
              <p className="text-xs text-slate-400 mt-1">
                {data.counselingCounts
                  .reduce((s, c) => s + c.count, 0)
                  .toLocaleString()}{' '}
                total sessions recorded
              </p>
            </div>
          )}
        </div>

        {/* Active resident risk — interactive card */}
        <div
          className={`bg-white rounded-xl border border-slate-200 p-5 ${interactiveCardClass}`}
          onClick={() => openModal('risk-high')}
          title="Click to explore resident risk detail"
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
                  const entry = data.activeRiskCounts.find((r) => r.riskLevel === level)
                  const count = entry?.count ?? 0
                  const sectionKey = `risk-${level.toLowerCase()}`
                  return (
                    <div
                      key={level}
                      className="group"
                      onClick={(e) => {
                        e.stopPropagation()
                        openModal(sectionKey)
                      }}
                      title={`View ${level} risk residents`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadge[level]}`}
                        >
                          {level}
                        </span>
                        <span className="text-xs text-slate-500">
                          {count} / {total}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColors[level]} group-hover:opacity-80 transition-opacity`}
                          style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">Click a bar or card to drill into risk level</p>
        </div>
      </div>

      {/* Detail modal */}
      {activeModal && (
        <DashboardDetailModal
          section={activeModal}
          items={modalItems}
          totalCount={modalTotal}
          loading={modalLoading}
          summary={modalSummary}
          onClose={closeModal}
          onLoadMore={loadMoreModal}
          loadingMore={modalLoadingMore}
        />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  highlight?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 transition-all ${highlight ? 'border-red-200' : 'border-slate-200'} ${onClick ? `cursor-pointer hover:shadow-md hover:border-safira-blue/30` : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${highlight ? 'text-red-600' : 'text-[#0f172a]'}`}>
        {value}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
