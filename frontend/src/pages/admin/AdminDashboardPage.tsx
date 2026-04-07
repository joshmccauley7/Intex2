import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { Users, Home, Heart, AlertTriangle, Calendar, TrendingUp, Activity, BookOpen, MessageSquare, ShieldAlert, Percent } from 'lucide-react'

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
  /** % of active donors with ≥1 donation in the rolling last 3 months; null if there are no active donors. */
  donorOkrPercent: number | null
  donorOkrRecentCount: number
}

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

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm">Loading dashboard…</p>
  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (!data) return null

  const totalResidents = data.residentStatusCounts.reduce((s, x) => s + x.count, 0)
  const totalChurn = data.churnCounts.reduce((s, x) => s + x.count, 0)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Operations overview for Safira staff</p>
      </div>

      {/* Primary OKR — same card shell and hierarchy as StatCard (label → value → sub), plus context below */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
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
          <span className="font-medium text-[#0f172a]">Why this matters most:</span> Mission delivery depends on steady
          funding. The share of donors who gave recently reflects engagement and predictable support better than total
          donor count alone—so we prioritize keeping supporters connected, not just growing the list.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} className="text-safira-blue" />}
          label="Active Residents"
          value={data.activeResidents}
          sub={`across ${data.activeSafehouses} safe houses`}
        />
        <StatCard
          icon={<Home size={20} className="text-safira-blue" />}
          label="Active Safe Houses"
          value={data.activeSafehouses}
        />
        <StatCard
          icon={<Heart size={20} className="text-safira-blue" />}
          label="Active Donors"
          value={data.activeDonors}
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-red-500" />}
          label="High Churn Risk"
          value={data.highChurnCount}
          sub="donors at risk of lapsing"
          highlight
        />
      </div>

      {/* ── Middle row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent donations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Recent Donations</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Donor</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.recentDonations.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400 text-xs">No recent donations.</td></tr>
              ) : data.recentDonations.map((d) => (
                <tr key={d.donationId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{d.donorName}</td>
                  <td className="px-5 py-3 text-slate-500">{d.donationDate}</td>
                  <td className="px-5 py-3 text-slate-800 font-medium">
                    {d.amount != null ? `$${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{d.donationType ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upcoming conferences */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Calendar size={16} className="text-safira-blue" />
            <h2 className="font-semibold text-slate-800 text-sm">Upcoming Conferences</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {data.upcomingConferences.length === 0 ? (
              <p className="px-5 py-6 text-center text-slate-400 text-xs">No upcoming conferences scheduled.</p>
            ) : data.upcomingConferences.map((c) => (
              <div key={c.conferenceId} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 text-sm">{c.residentCode ?? `Resident ${c.conferenceId}`}</span>
                  <span className="text-xs text-slate-400">{c.nextConferenceDate}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {c.conferenceType ?? 'Conference'}{c.socialWorker ? ` · ${c.socialWorker}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: breakdowns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Resident status breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Resident Status Breakdown</h2>
          <div className="flex flex-col gap-3">
            {data.residentStatusCounts.map((s) => (
              <div key={s.status}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                    {s.status ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-slate-500">{s.count} / {totalResidents}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-safira-blue rounded-full"
                    style={{ width: `${(s.count / totalResidents) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Churn risk breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 text-sm mb-4">Donor Churn Risk Breakdown</h2>
          {data.churnCounts.length === 0 ? (
            <p className="text-xs text-slate-400">No churn predictions available.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {['High', 'Medium', 'Low'].map((level) => {
                const entry = data.churnCounts.find((c) => c.riskLevel === level)
                const count = entry?.count ?? 0
                const barColors: Record<string, string> = {
                  High: 'bg-red-500',
                  Medium: 'bg-yellow-400',
                  Low: 'bg-green-500',
                }
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CHURN_BADGE[level]}`}>
                        {level}
                      </span>
                      <span className="text-xs text-slate-500">{count} / {totalChurn}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColors[level]}`}
                        style={{ width: totalChurn > 0 ? `${(count / totalChurn) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Resident progress row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Health */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
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
                    <div className="h-full bg-safira-blue rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
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
                  <span className="text-xs font-medium text-slate-700">{data.educationAvg.avgAttendanceRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-safira-blue rounded-full" style={{ width: `${data.educationAvg.avgAttendanceRate}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-500">Avg Progress</span>
                  <span className="text-xs font-medium text-slate-700">{data.educationAvg.avgProgressPercent}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.educationAvg.avgProgressPercent}%` }} />
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
        <div className="bg-white rounded-xl border border-slate-200 p-5">
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
                {data.counselingCounts.reduce((s, c) => s + c.count, 0).toLocaleString()} total sessions recorded
              </p>
            </div>
          )}
        </div>

        {/* Active resident risk */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
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
                const riskColors: Record<string, string> = {
                  High: 'bg-red-500',
                  Medium: 'bg-yellow-400',
                  Low: 'bg-green-500',
                }
                const riskBadge: Record<string, string> = {
                  High: 'bg-red-100 text-red-700',
                  Medium: 'bg-yellow-100 text-yellow-700',
                  Low: 'bg-green-100 text-green-700',
                }
                return ['High', 'Medium', 'Low'].map((level) => {
                  const entry = data.activeRiskCounts.find((r) => r.riskLevel === level)
                  const count = entry?.count ?? 0
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadge[level]}`}>{level}</span>
                        <span className="text-xs text-slate-500">{count} / {total}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${riskColors[level]}`} style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 ${highlight ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span></div>
      <div className={`text-3xl font-bold ${highlight ? 'text-red-600' : 'text-[#0f172a]'}`}>{value}</div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
