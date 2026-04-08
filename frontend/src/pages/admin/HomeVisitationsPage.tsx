import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { Plus, Pencil, Trash2, Home } from 'lucide-react'

interface ResidentOption {
  residentId: number
  internalCode: string | null
  assignedSocialWorker: string | null
}

interface HomeVisitation {
  visitationId: number
  residentId: number | null
  visitDate: string | null
  socialWorker: string | null
  visitType: string | null
  locationVisited: string | null
  familyMembersPresent: string | null
  purpose: string | null
  observations: string | null
  familyCooperationLevel: string | null
  safetyConcernsNoted: boolean | null
  followUpNeeded: boolean | null
  followUpNotes: string | null
  visitOutcome: string | null
}

const VISIT_TYPES = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
]

const COOPERATION_LEVELS = ['Cooperative', 'Partially Cooperative', 'Uncooperative']

const VISIT_TYPE_BADGE: Record<string, string> = {
  'Initial Assessment': 'bg-blue-100 text-blue-700',
  'Routine Follow-Up': 'bg-green-100 text-green-700',
  'Reintegration Assessment': 'bg-purple-100 text-purple-700',
  'Post-Placement Monitoring': 'bg-yellow-100 text-yellow-700',
  Emergency: 'bg-red-100 text-red-700',
}

const COOPERATION_BADGE: Record<string, string> = {
  Cooperative: 'bg-green-100 text-green-700',
  'Partially Cooperative': 'bg-yellow-100 text-yellow-700',
  Uncooperative: 'bg-red-100 text-red-700',
}

const PAGE_SIZE = 10

const blankVisit = (): Partial<HomeVisitation> => ({
  visitType: 'Routine Follow-Up',
  familyCooperationLevel: 'Cooperative',
  safetyConcernsNoted: false,
  followUpNeeded: false,
  visitDate: '',
  socialWorker: '',
  locationVisited: '',
  familyMembersPresent: '',
  purpose: '',
  observations: '',
  followUpNotes: '',
  visitOutcome: '',
})

export default function HomeVisitationsPage() {
  const [residents, setResidents] = useState<ResidentOption[]>([])
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null)
  const [visits, setVisits] = useState<HomeVisitation[]>([])
  const [loadingResidents, setLoadingResidents] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [visitPage, setVisitPage] = useState(1)

  const [showVisitForm, setShowVisitForm] = useState(false)
  const [editVisit, setEditVisit] = useState<HomeVisitation | null>(null)
  const [visitForm, setVisitForm] = useState<Partial<HomeVisitation>>(blankVisit())
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null)

  useEffect(() => {
    apiFetch('/api/residents')
      .then(setResidents)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingResidents(false))
  }, [])

  const fetchData = (residentId: number) => {
    setLoadingData(true)
    apiFetch(`/api/residents/${residentId}/home-visitations`)
      .then(setVisits)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false))
  }

  const handleSelectResident = (id: number) => {
    setSelectedResidentId(id)
    setVisits([])
    setError(null)
    setVisitPage(1)
    fetchData(id)
  }

  const openNewVisit = () => {
    setEditVisit(null)
    setVisitForm(blankVisit())
    setShowVisitForm(true)
  }

  const openEditVisit = (v: HomeVisitation) => {
    setEditVisit(v)
    setVisitForm({ ...v })
    setShowVisitForm(true)
  }

  const handleSaveVisit = async () => {
    if (!selectedResidentId) return
    if (editVisit) {
      await apiFetch(`/api/home-visitations/${editVisit.visitationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitForm),
      })
    } else {
      await apiFetch(`/api/residents/${selectedResidentId}/home-visitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitForm),
      })
    }
    setShowVisitForm(false)
    fetchData(selectedResidentId)
  }

  const handleDeleteVisit = async (id: number) => {
    await apiFetch(`/api/home-visitations/${id}`, { method: 'DELETE' })
    setDeleteVisitId(null)
    if (selectedResidentId) fetchData(selectedResidentId)
  }

  const filteredResidents = residents.filter(
    (r) =>
      !search ||
      r.internalCode?.toLowerCase().includes(search.toLowerCase()) ||
      r.assignedSocialWorker?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex gap-6 h-full">
      {/* ── Resident selector ── */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Residents</h2>
        <input
          type="text"
          placeholder="Search by code or worker…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
        />
        <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {loadingResidents ? (
            <p className="text-sm text-slate-400 px-2">Loading…</p>
          ) : filteredResidents.length === 0 ? (
            <p className="text-sm text-slate-400 px-2">No residents found.</p>
          ) : (
            filteredResidents.map((r) => (
              <button
                key={r.residentId}
                onClick={() => handleSelectResident(r.residentId)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedResidentId === r.residentId
                    ? 'bg-navy text-white'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="font-medium">{r.internalCode ?? `Resident ${r.residentId}`}</div>
                {r.assignedSocialWorker && (
                  <div className="text-xs opacity-70 mt-0.5">{r.assignedSocialWorker}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 min-w-0">
        {!selectedResidentId ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Home size={40} className="mb-3 opacity-30" />
            <p>Select a resident to view their home visitations.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Home Visitation Log</h3>
              <button
                onClick={openNewVisit}
                className="flex items-center gap-2 bg-navy-DEFAULT hover:bg-navy-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Log Visit
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {loadingData ? (
              <p className="text-slate-400 text-sm">Loading…</p>
            ) : visits.length === 0 ? (
              <p className="text-slate-400 text-sm">No home visitations logged yet.</p>
            ) : (() => {
              const totalPages = Math.ceil(visits.length / PAGE_SIZE)
              const paginated = visits.slice((visitPage - 1) * PAGE_SIZE, visitPage * PAGE_SIZE)
              return (
                <>
                  <div className="flex flex-col gap-3">
                    {paginated.map((v) => (
                      <div
                        key={v.visitationId}
                        className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  VISIT_TYPE_BADGE[v.visitType ?? ''] ?? 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {v.visitType ?? 'Unknown'}
                              </span>
                              {v.familyCooperationLevel && (
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    COOPERATION_BADGE[v.familyCooperationLevel] ?? 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {v.familyCooperationLevel}
                                </span>
                              )}
                              {v.safetyConcernsNoted && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                  Safety Concern
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                {v.visitDate ?? 'No date'} · {v.socialWorker ?? 'Unknown worker'}
                              </span>
                            </div>
                            {v.locationVisited && (
                              <p className="text-sm text-slate-600 mb-1">
                                <span className="font-medium">Location: </span>
                                {v.locationVisited}
                              </p>
                            )}
                            {v.observations && (
                              <p className="text-sm text-slate-700 mb-1">
                                <span className="font-medium">Observations: </span>
                                {v.observations}
                              </p>
                            )}
                            {v.followUpNotes && (
                              <p className="text-sm text-slate-600">
                                <span className="font-medium">Follow-up: </span>
                                {v.followUpNotes}
                              </p>
                            )}
                            {v.visitOutcome && (
                              <p className="text-sm text-slate-600">
                                <span className="font-medium">Outcome: </span>
                                {v.visitOutcome}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => openEditVisit(v)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteVisitId(v.visitationId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination current={visitPage} total={totalPages} onChange={setVisitPage} count={visits.length} pageSize={PAGE_SIZE} />
                </>
              )
            })()}
          </>
        )}
      </div>

      {/* ── Visit form modal ── */}
      {showVisitForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">
              {editVisit ? 'Edit Home Visitation' : 'Log Home Visitation'}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={visitForm.visitDate ?? ''}
                    onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Social Worker</label>
                  <input
                    type="text"
                    value={visitForm.socialWorker ?? ''}
                    onChange={(e) => setVisitForm({ ...visitForm, socialWorker: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Visit Type</label>
                  <select
                    value={visitForm.visitType ?? ''}
                    onChange={(e) => setVisitForm({ ...visitForm, visitType: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                  >
                    {VISIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Family Cooperation</label>
                  <select
                    value={visitForm.familyCooperationLevel ?? ''}
                    onChange={(e) => setVisitForm({ ...visitForm, familyCooperationLevel: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                  >
                    {COOPERATION_LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Location Visited</label>
                <input
                  type="text"
                  value={visitForm.locationVisited ?? ''}
                  onChange={(e) => setVisitForm({ ...visitForm, locationVisited: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Family Members Present</label>
                <input
                  type="text"
                  value={visitForm.familyMembersPresent ?? ''}
                  onChange={(e) => setVisitForm({ ...visitForm, familyMembersPresent: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
                <input
                  type="text"
                  value={visitForm.purpose ?? ''}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observations</label>
                <textarea
                  rows={3}
                  value={visitForm.observations ?? ''}
                  onChange={(e) => setVisitForm({ ...visitForm, observations: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue resize-none"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visitForm.safetyConcernsNoted ?? false}
                    onChange={(e) => setVisitForm({ ...visitForm, safetyConcernsNoted: e.target.checked })}
                    className="rounded"
                  />
                  Safety Concerns Noted
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visitForm.followUpNeeded ?? false}
                    onChange={(e) => setVisitForm({ ...visitForm, followUpNeeded: e.target.checked })}
                    className="rounded"
                  />
                  Follow-Up Needed
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Follow-Up Notes</label>
                <textarea
                  rows={2}
                  value={visitForm.followUpNotes ?? ''}
                  onChange={(e) => setVisitForm({ ...visitForm, followUpNotes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Visit Outcome</label>
                <input
                  type="text"
                  value={visitForm.visitOutcome ?? ''}
                  onChange={(e) => setVisitForm({ ...visitForm, visitOutcome: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowVisitForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVisit}
                className="px-5 py-2 bg-navy-DEFAULT hover:bg-navy-light text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editVisit ? 'Save Changes' : 'Log Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteVisitId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete Visitation?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteVisitId(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVisit(deleteVisitId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Pagination({ current, total, onChange, count, pageSize }: {
  current: number
  total: number
  onChange: (page: number) => void
  count: number
  pageSize: number
}) {
  if (total <= 1) return null
  const from = (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, count)

  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-slate-500">{from}–{to} of {count}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                p === current
                  ? 'bg-safira-blue text-white border-safira-blue'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current === total}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
