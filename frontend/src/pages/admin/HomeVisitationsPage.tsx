import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../api'
import { Plus, Pencil, Trash2, Home, Calendar, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'

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

interface CaseConference {
  conferenceId: number
  residentId: number | null
  conferenceDate: string | null
  conferenceType: string | null
  participants: string | null
  summary: string | null
  decisionsMade: string | null
  nextConferenceDate: string | null
  socialWorker: string | null
}

const VISIT_TYPES = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
]

const CONFERENCE_TYPES = [
  'Initial Case Conference',
  'Quarterly Review',
  'Reintegration Planning',
  'Crisis Review',
  'Progress Assessment',
  'Family Involvement Conference',
  'Closing Conference',
]

const COOPERATION_LEVELS = ['Cooperative', 'Partially Cooperative', 'Uncooperative']

const VISIT_TYPE_BADGE: Record<string, string> = {
  'Initial Assessment': 'bg-blue-100 text-blue-700',
  'Routine Follow-Up': 'bg-green-100 text-green-700',
  'Reintegration Assessment': 'bg-purple-100 text-purple-700',
  'Post-Placement Monitoring': 'bg-yellow-100 text-yellow-700',
  Emergency: 'bg-red-100 text-red-700',
}

const CONFERENCE_TYPE_BADGE: Record<string, string> = {
  'Initial Case Conference': 'bg-blue-100 text-blue-700',
  'Quarterly Review': 'bg-green-100 text-green-700',
  'Reintegration Planning': 'bg-purple-100 text-purple-700',
  'Crisis Review': 'bg-red-100 text-red-700',
  'Progress Assessment': 'bg-teal-100 text-teal-700',
  'Family Involvement Conference': 'bg-orange-100 text-orange-700',
  'Closing Conference': 'bg-slate-100 text-slate-600',
}

const COOPERATION_BADGE: Record<string, string> = {
  Cooperative: 'bg-green-100 text-green-700',
  'Partially Cooperative': 'bg-yellow-100 text-yellow-700',
  Uncooperative: 'bg-red-100 text-red-700',
}

const SOCIAL_WORKERS = Array.from({ length: 20 }, (_, i) => `SW-${String(i + 1).padStart(2, '0')}`)

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

const blankConference = (): Partial<CaseConference> => ({
  conferenceType: 'Quarterly Review',
  conferenceDate: '',
  socialWorker: '',
  participants: '',
  summary: '',
  decisionsMade: '',
  nextConferenceDate: '',
})

export default function HomeVisitationsPage() {
  const [searchParams] = useSearchParams()
  const [residents, setResidents] = useState<ResidentOption[]>([])
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'visits' | 'conferences'>('visits')

  // Visits state
  const [visits, setVisits] = useState<HomeVisitation[]>([])
  const [visitPage, setVisitPage] = useState(1)
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [editVisit, setEditVisit] = useState<HomeVisitation | null>(null)
  const [visitForm, setVisitForm] = useState<Partial<HomeVisitation>>(blankVisit())
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null)
  const [expandedVisitId, setExpandedVisitId] = useState<number | null>(null)

  // Conferences state
  const [conferences, setConferences] = useState<CaseConference[]>([])
  const [confPage, setConfPage] = useState(1)
  const [showConfForm, setShowConfForm] = useState(false)
  const [editConf, setEditConf] = useState<CaseConference | null>(null)
  const [confForm, setConfForm] = useState<Partial<CaseConference>>(blankConference())
  const [deleteConfId, setDeleteConfId] = useState<number | null>(null)
  const [expandedConfId, setExpandedConfId] = useState<number | null>(null)

  const [loadingResidents, setLoadingResidents] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch('/api/residents')
      .then((data: ResidentOption[]) => {
        setResidents(data)
        const paramId = searchParams.get('residentId')
        if (paramId) {
          const id = parseInt(paramId)
          if (data.some((r) => r.residentId === id)) handleSelectResident(id)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingResidents(false))
  }, [])

  const fetchVisits = (residentId: number) => {
    setLoadingData(true)
    apiFetch(`/api/residents/${residentId}/home-visitations`)
      .then(setVisits)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false))
  }

  const fetchConferences = (residentId: number) => {
    setLoadingData(true)
    apiFetch(`/api/residents/${residentId}/case-conferences`)
      .then(setConferences)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false))
  }

  const handleSelectResident = (id: number) => {
    setSelectedResidentId(id)
    setVisits([])
    setConferences([])
    setError(null)
    setVisitPage(1)
    setConfPage(1)
    fetchVisits(id)
    fetchConferences(id)
  }

  // ── Visit CRUD ──────────────────────────────────────────────────────────────
  const openNewVisit = () => { setEditVisit(null); setVisitForm(blankVisit()); setShowVisitForm(true) }
  const openEditVisit = (v: HomeVisitation) => { setEditVisit(v); setVisitForm({ ...v }); setShowVisitForm(true) }

  const handleSaveVisit = async () => {
    if (!selectedResidentId) return
    try {
      const payload = { ...visitForm, visitDate: visitForm.visitDate || null }
      if (editVisit) {
        await apiFetch(`/api/home-visitations/${editVisit.visitationId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(`/api/residents/${selectedResidentId}/home-visitations`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
      }
      setShowVisitForm(false)
      fetchVisits(selectedResidentId)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save visitation.')
    }
  }

  const handleDeleteVisit = async (id: number) => {
    await apiFetch(`/api/home-visitations/${id}`, { method: 'DELETE' })
    setDeleteVisitId(null)
    if (selectedResidentId) fetchVisits(selectedResidentId)
  }

  // ── Conference CRUD ─────────────────────────────────────────────────────────
  const openNewConf = () => { setEditConf(null); setConfForm(blankConference()); setShowConfForm(true) }
  const openEditConf = (c: CaseConference) => { setEditConf(c); setConfForm({ ...c }); setShowConfForm(true) }

  const handleSaveConf = async () => {
    if (!selectedResidentId) return
    try {
      const payload = {
        ...confForm,
        conferenceDate: confForm.conferenceDate || null,
        nextConferenceDate: confForm.nextConferenceDate || null,
      }
      if (editConf) {
        await apiFetch(`/api/case-conferences/${editConf.conferenceId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(`/api/residents/${selectedResidentId}/case-conferences`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
      }
      setShowConfForm(false)
      fetchConferences(selectedResidentId)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save conference.')
    }
  }

  const handleDeleteConf = async (id: number) => {
    await apiFetch(`/api/case-conferences/${id}`, { method: 'DELETE' })
    setDeleteConfId(null)
    if (selectedResidentId) fetchConferences(selectedResidentId)
  }

  const filteredResidents = residents.filter(
    (r) =>
      !search ||
      r.internalCode?.toLowerCase().includes(search.toLowerCase()) ||
      r.assignedSocialWorker?.toLowerCase().includes(search.toLowerCase())
  )

  const TODAY = new Date().toISOString().split('T')[0]
  const upcomingConferences = conferences.filter(
    (c) => c.nextConferenceDate && c.nextConferenceDate >= TODAY
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
            <p>Select a resident to view their records.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('visits')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'visits' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Home Visitations
                  {visits.length > 0 && (
                    <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{visits.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('conferences')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'conferences' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Case Conferences
                  {conferences.length > 0 && (
                    <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{conferences.length}</span>
                  )}
                </button>
              </div>

              {activeTab === 'visits' ? (
                <button onClick={openNewVisit} className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  <Plus size={16} /> Log Visit
                </button>
              ) : (
                <button onClick={openNewConf} className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  <Plus size={16} /> Add Conference
                </button>
              )}
            </div>

            {error && <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            {/* ── Home Visitations tab ── */}
            {activeTab === 'visits' && (
              loadingData ? <p className="text-slate-400 text-sm">Loading…</p> :
              visits.length === 0 ? <p className="text-slate-400 text-sm">No home visitations logged yet.</p> :
              (() => {
                const totalPages = Math.ceil(visits.length / PAGE_SIZE)
                const paginated = visits.slice((visitPage - 1) * PAGE_SIZE, visitPage * PAGE_SIZE)
                return (
                  <>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_150px_160px_100px_100px_72px_24px] items-center gap-4 px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date · Worker</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cooperation</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Safety</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Follow-Up</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</span>
                        <span />
                      </div>

                      {paginated.map((v, idx) => {
                        const isExpanded = expandedVisitId === v.visitationId
                        return (
                          <div key={v.visitationId} className={idx > 0 ? 'border-t border-slate-100' : ''}>
                            <div
                              className="grid grid-cols-[1fr_150px_160px_100px_100px_72px_24px] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setExpandedVisitId(isExpanded ? null : v.visitationId)}
                            >
                              <div>
                                <p className="font-medium text-sm text-[#0f172a]">{v.visitDate ?? '—'}</p>
                                <p className="text-xs text-slate-400">{v.socialWorker ?? '—'}</p>
                              </div>
                              <div>
                                {v.visitType ? (
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${VISIT_TYPE_BADGE[v.visitType] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {v.visitType}
                                  </span>
                                ) : <span className="text-xs text-slate-300">—</span>}
                              </div>
                              <div>
                                {v.familyCooperationLevel ? (
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${COOPERATION_BADGE[v.familyCooperationLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {v.familyCooperationLevel}
                                  </span>
                                ) : <span className="text-xs text-slate-300">—</span>}
                              </div>
                              <div className="flex justify-center">
                                {v.safetyConcernsNoted
                                  ? <CheckCircle2 size={18} className="text-red-400" />
                                  : <span className="text-slate-300 text-sm">—</span>}
                              </div>
                              <div className="flex justify-center">
                                {v.followUpNeeded
                                  ? <CheckCircle2 size={18} className="text-yellow-500" />
                                  : <span className="text-slate-300 text-sm">—</span>}
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => openEditVisit(v)} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors"><Pencil size={14} /></button>
                                <button onClick={() => setDeleteVisitId(v.visitationId)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              </div>
                              <div className="text-slate-400">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 space-y-3 text-sm border-t border-slate-100 bg-slate-50/50">
                                {v.locationVisited && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Location</p><p className="text-slate-700">{v.locationVisited}</p></div>}
                                {v.familyMembersPresent && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Family Members Present</p><p className="text-slate-700">{v.familyMembersPresent}</p></div>}
                                {v.purpose && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Purpose</p><p className="text-slate-700">{v.purpose}</p></div>}
                                {v.observations && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Observations</p><p className="text-slate-700 whitespace-pre-wrap">{v.observations}</p></div>}
                                {v.followUpNotes && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Follow-Up Notes</p><p className="text-slate-700 whitespace-pre-wrap">{v.followUpNotes}</p></div>}
                                {v.visitOutcome && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Outcome</p><p className="text-slate-700">{v.visitOutcome}</p></div>}
                                {!v.locationVisited && !v.familyMembersPresent && !v.purpose && !v.observations && !v.followUpNotes && !v.visitOutcome && (
                                  <p className="text-slate-400 text-xs italic">No additional details recorded.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <Pagination current={visitPage} total={totalPages} onChange={setVisitPage} count={visits.length} pageSize={PAGE_SIZE} />
                  </>
                )
              })()
            )}

            {/* ── Case Conferences tab ── */}
            {activeTab === 'conferences' && (
              loadingData ? <p className="text-slate-400 text-sm">Loading…</p> :
              conferences.length === 0 ? <p className="text-slate-400 text-sm">No case conferences recorded yet.</p> :
              (() => {
                const totalPages = Math.ceil(conferences.length / PAGE_SIZE)
                const paginated = conferences.slice((confPage - 1) * PAGE_SIZE, confPage * PAGE_SIZE)
                return (
                  <>
                    {/* Upcoming banner */}
                    {upcomingConferences.length > 0 && (
                      <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <Calendar size={16} className="text-blue-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800">
                            {upcomingConferences.length} upcoming conference{upcomingConferences.length > 1 ? 's' : ''} scheduled
                          </p>
                          <p className="text-xs text-blue-600">
                            Next: {upcomingConferences.sort((a, b) => (a.nextConferenceDate ?? '').localeCompare(b.nextConferenceDate ?? ''))[0].nextConferenceDate}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_200px_120px_72px_24px] items-center gap-4 px-4 py-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date · Worker</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Next Conference</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</span>
                        <span />
                      </div>

                      {paginated.map((c, idx) => {
                        const isExpanded = expandedConfId === c.conferenceId
                        return (
                          <div key={c.conferenceId} className={idx > 0 ? 'border-t border-slate-100' : ''}>
                            <div
                              className="grid grid-cols-[1fr_200px_120px_72px_24px] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setExpandedConfId(isExpanded ? null : c.conferenceId)}
                            >
                              <div>
                                <p className="font-medium text-sm text-[#0f172a]">{c.conferenceDate ?? '—'}</p>
                                <p className="text-xs text-slate-400">{c.socialWorker ?? '—'}</p>
                              </div>
                              <div>
                                {c.conferenceType ? (
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CONFERENCE_TYPE_BADGE[c.conferenceType] ?? 'bg-slate-100 text-slate-600'}`}>
                                    {c.conferenceType}
                                  </span>
                                ) : <span className="text-xs text-slate-300">—</span>}
                              </div>
                              <div>
                                {c.nextConferenceDate ? (
                                  <span className={`text-xs font-medium ${c.nextConferenceDate >= TODAY ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {c.nextConferenceDate}
                                    {c.nextConferenceDate >= TODAY && <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Upcoming</span>}
                                  </span>
                                ) : <span className="text-xs text-slate-300">—</span>}
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => openEditConf(c)} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors"><Pencil size={14} /></button>
                                <button onClick={() => setDeleteConfId(c.conferenceId)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              </div>
                              <div className="text-slate-400">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 space-y-3 text-sm border-t border-slate-100 bg-slate-50/50">
                                {c.participants && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Participants</p><p className="text-slate-700">{c.participants}</p></div>}
                                {c.summary && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Summary</p><p className="text-slate-700 whitespace-pre-wrap">{c.summary}</p></div>}
                                {c.decisionsMade && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Decisions Made</p><p className="text-slate-700 whitespace-pre-wrap">{c.decisionsMade}</p></div>}
                                {!c.participants && !c.summary && !c.decisionsMade && (
                                  <p className="text-slate-400 text-xs italic">No additional details recorded.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <Pagination current={confPage} total={totalPages} onChange={setConfPage} count={conferences.length} pageSize={PAGE_SIZE} />
                  </>
                )
              })()
            )}
          </>
        )}
      </div>

      {/* ── Visit form modal ── */}
      {showVisitForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">{editVisit ? 'Edit Home Visitation' : 'Log Home Visitation'}</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Visit Date</label>
                  <input type="date" value={visitForm.visitDate ?? ''} onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Social Worker</label>
                  <select value={visitForm.socialWorker ?? ''} onChange={(e) => setVisitForm({ ...visitForm, socialWorker: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue">
                    <option value="">Select…</option>
                    {SOCIAL_WORKERS.map((sw) => <option key={sw} value={sw}>{sw}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Visit Type</label>
                  <select value={visitForm.visitType ?? ''} onChange={(e) => setVisitForm({ ...visitForm, visitType: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue">
                    {VISIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Family Cooperation</label>
                  <select value={visitForm.familyCooperationLevel ?? ''} onChange={(e) => setVisitForm({ ...visitForm, familyCooperationLevel: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue">
                    {COOPERATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Location Visited</label>
                <input type="text" value={visitForm.locationVisited ?? ''} onChange={(e) => setVisitForm({ ...visitForm, locationVisited: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Family Members Present</label>
                <input type="text" value={visitForm.familyMembersPresent ?? ''} onChange={(e) => setVisitForm({ ...visitForm, familyMembersPresent: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
                <input type="text" value={visitForm.purpose ?? ''} onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observations</label>
                <textarea rows={3} value={visitForm.observations ?? ''} onChange={(e) => setVisitForm({ ...visitForm, observations: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue resize-none" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={visitForm.safetyConcernsNoted ?? false} onChange={(e) => setVisitForm({ ...visitForm, safetyConcernsNoted: e.target.checked })} className="rounded" />
                  Safety Concerns Noted
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={visitForm.followUpNeeded ?? false} onChange={(e) => setVisitForm({ ...visitForm, followUpNeeded: e.target.checked })} className="rounded" />
                  Follow-Up Needed
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Follow-Up Notes</label>
                <textarea rows={2} value={visitForm.followUpNotes ?? ''} onChange={(e) => setVisitForm({ ...visitForm, followUpNotes: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Visit Outcome</label>
                <input type="text" value={visitForm.visitOutcome ?? ''} onChange={(e) => setVisitForm({ ...visitForm, visitOutcome: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowVisitForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveVisit} className="px-5 py-2 bg-navy hover:bg-navy-light text-white text-sm font-medium rounded-lg transition-colors">{editVisit ? 'Save Changes' : 'Log Visit'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conference form modal ── */}
      {showConfForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">{editConf ? 'Edit Case Conference' : 'Add Case Conference'}</h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Conference Date</label>
                  <input type="date" value={confForm.conferenceDate ?? ''} onChange={(e) => setConfForm({ ...confForm, conferenceDate: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Social Worker</label>
                  <select value={confForm.socialWorker ?? ''} onChange={(e) => setConfForm({ ...confForm, socialWorker: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue">
                    <option value="">Select…</option>
                    {SOCIAL_WORKERS.map((sw) => <option key={sw} value={sw}>{sw}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conference Type</label>
                <select value={confForm.conferenceType ?? ''} onChange={(e) => setConfForm({ ...confForm, conferenceType: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue">
                  {CONFERENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Participants</label>
                <input type="text" value={confForm.participants ?? ''} onChange={(e) => setConfForm({ ...confForm, participants: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Summary</label>
                <textarea rows={3} value={confForm.summary ?? ''} onChange={(e) => setConfForm({ ...confForm, summary: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Decisions Made</label>
                <textarea rows={2} value={confForm.decisionsMade ?? ''} onChange={(e) => setConfForm({ ...confForm, decisionsMade: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Next Conference Date</label>
                <input type="date" value={confForm.nextConferenceDate ?? ''} onChange={(e) => setConfForm({ ...confForm, nextConferenceDate: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-safira-blue" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowConfForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveConf} className="px-5 py-2 bg-navy hover:bg-navy-light text-white text-sm font-medium rounded-lg transition-colors">{editConf ? 'Save Changes' : 'Add Conference'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirms ── */}
      {deleteVisitId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete Visitation?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteVisitId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={() => handleDeleteVisit(deleteVisitId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete Conference?</h3>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
              <button onClick={() => handleDeleteConf(deleteConfId)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Pagination({ current, total, onChange, count, pageSize }: {
  current: number; total: number; onChange: (page: number) => void; count: number; pageSize: number
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
        <button onClick={() => onChange(current - 1)} disabled={current === 1} className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
          ) : (
            <button key={p} onClick={() => onChange(p)} className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${p === current ? 'bg-safira-blue text-white border-safira-blue' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{p}</button>
          )
        )}
        <button onClick={() => onChange(current + 1)} disabled={current === total} className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
      </div>
    </div>
  )
}
