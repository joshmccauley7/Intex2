import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, ReferenceLine,
  LabelList,
} from 'recharts'
import { X, Download, Printer, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface KpiItem {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'neutral'
}

export interface ChartSeriesItem {
  name: string
  value: number
  color?: string
}

export interface ChartData {
  id: string
  /** 'pie' | 'donut' | 'bar' | 'line' | 'stackedBar' | 'verticalBar' | 'list' | 'statList' */
  type: 'pie' | 'donut' | 'bar' | 'line' | 'stackedBar' | 'verticalBar' | 'list' | 'statList'
  title: string
  series: ChartSeriesItem[]
  valuePrefix?: string
  valueSuffix?: string
  /** Override chart height in px */
  height?: number
  /** Compact rendering — shorter height, smaller labels */
  compact?: boolean
  /** Fixed x-axis domain for horizontal bar/line */
  xDomain?: [number, number]
  /** Fixed y-axis domain for vertical bar, e.g. [0,5] for scores */
  yDomain?: [number, number]
  /** Reference line value (threshold) drawn on the value axis */
  threshold?: number
  /** Show value labels above/beside each bar */
  showValueLabels?: boolean
  /** Sort bar series before rendering */
  sort?: 'asc' | 'desc' | 'none'
  /** Marks primary chart — rendered taller and full-width */
  primary?: boolean
}

export interface ColumnDef {
  key: string
  label: string
  fmt?: (v: unknown) => string
}

// ── Colour palette ────────────────────────────────────────────────────────────

const PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#ea580c', '#db2777', '#065f46', '#1e40af',
]

// ── Height helpers ────────────────────────────────────────────────────────────

function resolveHeight(chart: ChartData, isPrimary: boolean): number {
  if (chart.height) return chart.height
  if (chart.type === 'line')        return isPrimary ? 240 : 160
  if (chart.type === 'verticalBar') return isPrimary ? 240 : 180
  if (chart.compact)                return 130
  return isPrimary ? 200 : 170
}

// ── PHP currency axis formatter ───────────────────────────────────────────────

const phpShort = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1,
})

// ── Chart panels ──────────────────────────────────────────────────────────────

function PiePanel({ chart, isPrimary }: { chart: ChartData; isPrimary: boolean }) {
  const h = resolveHeight(chart, isPrimary)
  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 shrink-0">
        {chart.title}
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie
            data={chart.series}
            cx="50%"
            cy="50%"
            innerRadius={chart.type === 'donut' ? (chart.compact ? 36 : 48) : 0}
            outerRadius={chart.compact ? 56 : 76}
            dataKey="value"
            nameKey="name"
            paddingAngle={chart.type === 'donut' ? 2 : 0}
          >
            {chart.series.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${chart.valuePrefix ?? ''}${value.toLocaleString()}${chart.valueSuffix ?? ''}`,
              '',
            ]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: chart.compact ? 10 : 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function BarPanel({ chart, isPrimary }: { chart: ChartData; isPrimary: boolean }) {
  const h = resolveHeight(chart, isPrimary)

  // Optionally sort series
  const series = chart.sort && chart.sort !== 'none'
    ? [...chart.series].sort((a, b) => chart.sort === 'asc' ? a.value - b.value : b.value - a.value)
    : chart.series

  const maxNameLen = Math.max(...series.map((s) => (s.name ?? '').length))
  const yWidth = Math.min(Math.max(maxNameLen * 6, 60), 130)

  const isPhp = (chart.valuePrefix ?? '').includes('₱') ||
                (chart.valueSuffix ?? '') === '' && (chart.id?.includes('amount') || chart.id?.includes('value') || chart.id?.includes('revenue'))

  const fmt = (v: number) => {
    if (isPhp) return phpShort.format(v)
    const suffix = chart.valueSuffix ?? ''
    const prefix = chart.valuePrefix ?? ''
    return `${prefix}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}${suffix}`
  }

  // x-axis domain
  const domain: [number | 'auto', number | 'auto'] = chart.xDomain
    ? [chart.xDomain[0], chart.xDomain[1]]
    : [0, 'auto']

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 shrink-0">
        {chart.title}
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart
          data={series}
          layout="vertical"
          margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
        >
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} domain={domain} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: chart.compact ? 9 : 10 }}
            width={yWidth}
            tickFormatter={(name: string) =>
              name.length > 18 ? `${name.slice(0, 17)}…` : name
            }
          />
          <Tooltip
            formatter={(value: number) => [
              isPhp
                ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value)
                : `${chart.valuePrefix ?? ''}${value.toLocaleString()}${chart.valueSuffix ?? ''}`,
              '',
            ]}
          />
          {chart.xDomain && (
            <ReferenceLine x={chart.xDomain[1]} stroke="#e2e8f0" strokeDasharray="3 3" />
          )}
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {series.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LinePanel({ chart, isPrimary }: { chart: ChartData; isPrimary: boolean }) {
  const h = resolveHeight(chart, isPrimary)

  const isPhp = (chart.valuePrefix ?? '').includes('₱')
  const fmt = (v: number) => {
    if (isPhp) return phpShort.format(v)
    return `${chart.valuePrefix ?? ''}${v.toLocaleString()}${chart.valueSuffix ?? ''}`
  }

  const domain: [number | 'auto', number | 'auto'] = chart.xDomain
    ? [chart.xDomain[0], chart.xDomain[1]]
    : ['auto', 'auto']

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 shrink-0">
        {chart.title}
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={chart.series} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} domain={domain} />
          <Tooltip
            formatter={(value: number) => [
              isPhp
                ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(value)
                : `${chart.valuePrefix ?? ''}${value.toLocaleString()}${chart.valueSuffix ?? ''}`,
              chart.title,
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3, fill: '#2563eb' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function StackedBarPanel({ chart }: { chart: ChartData }) {
  const total = chart.series.reduce((s, x) => s + x.value, 0)
  if (total === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">
        {chart.title}
      </p>
      {/* Single proportional stacked bar */}
      <div className="flex h-7 rounded-md overflow-hidden w-full">
        {chart.series.map((seg, i) => {
          const pct = (seg.value / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={i}
              style={{ width: `${pct}%`, backgroundColor: seg.color ?? PALETTE[i % PALETTE.length] }}
              className="relative group flex items-center justify-center"
              title={`${seg.name}: ${seg.value.toLocaleString()} (${pct.toFixed(1)}%)`}
            >
              {pct > 10 && (
                <span className="text-white text-xs font-semibold drop-shadow-sm pointer-events-none">
                  {seg.value.toLocaleString()}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {chart.series.map((seg, i) => {
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0'
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: seg.color ?? PALETTE[i % PALETTE.length] }}
              />
              <span className="text-xs text-slate-600">
                {seg.name}: <span className="font-semibold">{seg.value.toLocaleString()}</span>
                <span className="text-slate-400 ml-1">({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListPanel({ chart }: { chart: ChartData }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 shrink-0">
        {chart.title}
      </p>
      {chart.series.map((item, i) => {
        const color = item.color ?? PALETTE[i % PALETTE.length]
        const isFull = item.value === 0
        return (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-100"
            style={{ borderLeftWidth: 3, borderLeftColor: color }}
          >
            <span className="text-sm text-slate-700 font-medium">{item.name}</span>
            {isFull ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                FULL
              </span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums" style={{ color }}>
                  {item.value}
                </span>
                <span className="text-xs text-slate-400">
                  {chart.valueSuffix ?? 'spots open'}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Compact stat list — stacks vertically so sort order is always visually obvious */
function StatListPanel({ chart }: { chart: ChartData }) {
  const fmt = (v: number) => {
    const prefix = chart.valuePrefix ?? ''
    const suffix = chart.valueSuffix ?? ''
    const num = Number.isInteger(v)
      ? v.toLocaleString()
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return `${prefix}${num}${suffix}`
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {chart.title}
      </p>
      <div className="flex flex-col gap-1.5">
        {chart.series.map((item, i) => {
          const color = item.color ?? PALETTE[i % PALETTE.length]
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-500 truncate">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{fmt(item.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VerticalBarPanel({ chart, isPrimary }: { chart: ChartData; isPrimary: boolean }) {
  const h = resolveHeight(chart, isPrimary)

  const series = chart.sort && chart.sort !== 'none'
    ? [...chart.series].sort((a, b) => chart.sort === 'asc' ? a.value - b.value : b.value - a.value)
    : chart.series

  const isPhp = (chart.valuePrefix ?? '').includes('₱')
  const fmt = (v: number) => {
    if (isPhp) return phpShort.format(v)
    const suffix = chart.valueSuffix ?? ''
    const prefix = chart.valuePrefix ?? ''
    return `${prefix}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}${suffix}`
  }

  const domain: [number | 'auto', number | 'auto'] = chart.yDomain
    ? [chart.yDomain[0], chart.yDomain[1]]
    : [0, 'auto']

  // Rotate x-axis labels when there are many categories
  const rotateLabels = series.length > 4
  const bottomMargin = rotateLabels ? 55 : 24

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 shrink-0">
        {chart.title}
      </p>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={series} margin={{ left: 0, right: 8, top: 16, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: chart.compact ? 9 : 10 }}
            angle={rotateLabels ? -35 : 0}
            textAnchor={rotateLabels ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={fmt}
            domain={domain}
          />
          {chart.threshold != null && (
            <ReferenceLine
              y={chart.threshold}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{ value: `${chart.threshold}`, fill: '#d97706', fontSize: 9, position: 'right' }}
            />
          )}
          <Tooltip
            formatter={(value: number) => [
              isPhp
                ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value)
                : `${chart.valuePrefix ?? ''}${value.toLocaleString()}${chart.valueSuffix ?? ''}`,
              '',
            ]}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {series.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? PALETTE[i % PALETTE.length]} />
            ))}
            {chart.showValueLabels && (
              <LabelList
                dataKey="value"
                position="top"
                style={{ fontSize: 10, fill: '#475569' }}
                formatter={(v: number) => fmt(v)}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartPanel({ chart, isPrimary }: { chart: ChartData; isPrimary: boolean }) {
  if (!chart.series.length) return null
  if (chart.type === 'pie' || chart.type === 'donut') return <PiePanel chart={chart} isPrimary={isPrimary} />
  if (chart.type === 'bar')         return <BarPanel         chart={chart} isPrimary={isPrimary} />
  if (chart.type === 'verticalBar') return <VerticalBarPanel chart={chart} isPrimary={isPrimary} />
  if (chart.type === 'line')        return <LinePanel        chart={chart} isPrimary={isPrimary} />
  if (chart.type === 'stackedBar')  return <StackedBarPanel  chart={chart} />
  if (chart.type === 'list')        return <ListPanel        chart={chart} />
  if (chart.type === 'statList')    return <StatListPanel    chart={chart} />
  return null
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export interface DashboardDetailModalProps {
  title: string
  linkTo?: string
  linkLabel?: string
  kpis: KpiItem[]
  charts: ChartData[]
  items: Record<string, unknown>[]
  totalCount: number
  loading: boolean
  columns: ColumnDef[]
  onClose: () => void
  onLoadMore: () => void
  loadingMore: boolean
  onRowClick?: (row: Record<string, unknown>) => void
  /** Per-row guard — if provided, only rows returning true show pointer + click */
  isRowClickable?: (row: Record<string, unknown>) => boolean
  periodOptions?: { label: string; value: string }[]
  period?: string
  onPeriodChange?: (value: string) => void
  /** Extra CTA button shown in the footer alongside the main link */
  extraAction?: { label: string; to: string }
}

export function DashboardDetailModal({
  title,
  linkTo,
  linkLabel,
  kpis,
  charts,
  items,
  totalCount,
  loading,
  columns,
  onClose,
  onLoadMore,
  loadingMore,
  onRowClick,
  isRowClickable,
  periodOptions,
  period,
  onPeriodChange,
  extraAction,
}: DashboardDetailModalProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const validCharts = charts.filter((c) => c.series.length > 0)

  // If any chart is explicitly marked primary=true, render it full-width + rest in grid.
  // Otherwise render all charts in a grid (side-by-side) — no forced full-width leader.
  const hasExplicitPrimary = validCharts.some((c) => c.primary)
  const primaryChart    = hasExplicitPrimary ? validCharts.find((c) => c.primary)! : null
  const gridCharts      = hasExplicitPrimary
    ? validCharts.filter((c) => !c.primary).slice(0, 2)
    : validCharts.slice(0, 3)

  const filtered = search
    ? items.filter((row) =>
        columns.some((col) => {
          const val = row[col.key]
          return val != null && String(val).toLowerCase().includes(search.toLowerCase())
        })
      )
    : items

  function exportCsv() {
    const header = columns.map((c) => `"${c.label}"`).join(',')
    const rows = filtered.map((row) =>
      columns
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
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 px-4 pb-6">
      {/* Backdrop — clicking it does nothing; only X closes */}
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f172a]">{title}</h2>
              {!loading && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {totalCount.toLocaleString()} total record{totalCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
            {periodOptions && periodOptions.length > 0 && (
              <select
                value={period}
                onChange={(e) => onPeriodChange?.(e.target.value)}
                disabled={loading}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-safira-blue/30 cursor-pointer disabled:opacity-50"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
              onClick={() => window.print()}
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

        {/* ── KPI strip ── */}
        {!loading && kpis.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 flex flex-wrap gap-x-8 gap-y-3">
            {kpis.map((kpi, i) => (
              <div key={i} className="flex flex-col">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[#0f172a] tabular-nums">{kpi.value}</span>
                  {kpi.delta && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-0.5 ${
                        kpi.trend === 'up'
                          ? 'text-green-600'
                          : kpi.trend === 'down'
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {kpi.trend === 'up' ? (
                        <TrendingUp size={11} />
                      ) : kpi.trend === 'down' ? (
                        <TrendingDown size={11} />
                      ) : (
                        <Minus size={11} />
                      )}
                      {kpi.delta}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 mt-0.5">{kpi.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Charts ── */}
        {!loading && validCharts.length > 0 && (
          <div className="px-6 pt-4 pb-2 border-b border-slate-100 shrink-0 flex flex-col gap-4">
            {/* Primary chart — full width (only when explicitly marked) */}
            {primaryChart && (
              <ChartPanel key={`${primaryChart.id}-${period ?? 'all'}`} chart={primaryChart} isPrimary={true} />
            )}
            {/* Grid charts — side by side (2-col) or single column */}
            {gridCharts.length > 0 && (
              <div className={`grid gap-6 ${gridCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {gridCharts.map((chart) => (
                  <ChartPanel key={`${chart.id}-${period ?? 'all'}`} chart={chart} isPrimary={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Search bar ── */}
        <div className="px-6 py-3 border-b border-slate-100 shrink-0">
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search within loaded records…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-safira-blue/30 bg-white"
            />
          </div>
        </div>

        {/* ── Table ── */}
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
                  {columns.map((col) => (
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
                {filtered.map((row, i) => {
                  // Row is only clickable if the per-row guard approves (or no guard + handler exists)
                  const clickable = onRowClick != null &&
                    (isRowClickable ? isRowClickable(row) : true)
                  return (
                    <tr
                      key={i}
                      onClick={clickable ? () => onRowClick!(row) : undefined}
                      className={`transition-colors ${clickable ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      {columns.map((col) => {
                        const raw = row[col.key]
                        const display = col.fmt ? col.fmt(raw) : raw != null ? String(raw) : '—'
                        return (
                          <td key={col.key} className="px-5 py-3 text-slate-700 whitespace-nowrap">
                            {display}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {search
              ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'} within ${items.length.toLocaleString()} loaded`
              : `Showing ${items.length.toLocaleString()} of ${totalCount.toLocaleString()}`}
          </span>
          <div className="flex items-center gap-4">
            {items.length < totalCount && !search && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-sm font-medium text-safira-blue hover:underline disabled:opacity-50"
              >
                {loadingMore
                  ? 'Loading…'
                  : `Load more (${(totalCount - items.length).toLocaleString()} remaining)`}
              </button>
            )}
            {extraAction && (
              <button
                onClick={() => { onClose(); navigate(extraAction.to) }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {extraAction.label} →
              </button>
            )}
            {linkTo && (
              <button
                onClick={() => {
                  onClose()
                  navigate(linkTo)
                }}
                className="text-sm font-medium text-safira-blue hover:underline"
              >
                {linkLabel ?? 'View all'} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
