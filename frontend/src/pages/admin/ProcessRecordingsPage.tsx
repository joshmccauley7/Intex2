import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'

interface ResidentOption {
  residentId: number
  internalCode: string | null
  assignedSocialWorker: string | null
}

interface ProcessRecording {
  recordingId: number
  residentId: number
  sessionDate: string | null
  socialWorker: string | null
  sessionType: string | null
  sessionDurationMinutes: number | null
  emotionalStateObserved: string | null
  emotionalStateEnd: string | null
  sessionNarrative: string | null
  interventionsApplied: string | null
  followUpActions: string | null
  progressNoted: boolean | null
  concernsFlagged: boolean | null
  referralMade: boolean | null
  notesRestricted: string | null
  createdAt: string
}

const SOCIAL_WORKERS = Array.from({ length: 20 }, (_, i) => `SW-${String(i + 1).padStart(2, '0')}`)

const PAGE_SIZE = 10

const SESSION_TYPE_BADGE: Record<string, string> = {
  Individual: 'bg-blue-100 text-blue-700',
  Group: 'bg-purple-100 text-purple-700',
}

export default function ProcessRecordingsPage() {
  const [residents, setResidents] = useState<ResidentOption[]>([])
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null)
  const [recordings, setRecordings] = useState<ProcessRecording[]>([])
  const [loadingResidents, setLoadingResidents] = useState(true)
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [currentPage, setCurrentPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [editRecording, setEditRecording] = useState<ProcessRecording | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    apiFetch('/api/residents')
      .then(setResidents)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingResidents(false))
  }, [])

  const fetchRecordings = (residentId: number) => {
    setLoadingRecordings(true)
    apiFetch(`/api/residents/${residentId}/process-recordings`)
      .then(setRecordings)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingRecordings(false))
  }

  const handleSelectResident = (id: number) => {
    setSelectedResidentId(id)
    setRecordings([])
    setError(null)
    setCurrentPage(1)
    fetchRecordings(id)
  }

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/process-recordings/${id}`, { method: 'DELETE' })
    setDeleteConfirmId(null)
    if (selectedResidentId) fetchRecordings(selectedResidentId)
  }

  const filteredResidents = residents.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.internalCode?.toLowerCase().includes(q) ||
      r.assignedSocialWorker?.toLowerCase().includes(q)
    )
  })

  const selectedResident = residents.find((r) => r.residentId === selectedResidentId)

  return (
    <div className="flex gap-6 h-full">

      {/* Resident sidebar */}
      <div className="w-64 shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select Resident</h2>
        <input
          placeholder="Search by code or worker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-safira-blue"
        />
        {loadingResidents ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : (
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {filteredResidents.map((r) => (
              <button
                key={r.residentId}
                onClick={() => handleSelectResident(r.residentId)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedResidentId === r.residentId
                    ? 'bg-navy text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <p className="font-medium">{r.internalCode ?? `Resident ${r.residentId}`}</p>
                {r.assignedSocialWorker && (
                  <p className={`text-xs mt-0.5 ${selectedResidentId === r.residentId ? 'text-blue-100' : 'text-slate-400'}`}>
                    {r.assignedSocialWorker}
                  </p>
                )}
              </button>
            ))}
            {filteredResidents.length === 0 && (
              <p className="text-slate-400 text-sm px-1">No residents found.</p>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {!selectedResidentId ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Select a resident to view their process recordings.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#0f172a]">Process Recordings</h1>
                <p className="text-sm text-slate-500 mt-0.5">{selectedResident?.internalCode ?? `Resident ${selectedResidentId}`}</p>
              </div>
              <button
                onClick={() => { setEditRecording(null); setShowForm(true) }}
                className="flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Recording
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {loadingRecordings && <p className="text-slate-500 text-sm">Loading...</p>}

            {/* Recording rows */}
            {(() => {
              const totalPages = Math.ceil(recordings.length / PAGE_SIZE)
              const paginated = recordings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
              return (
              <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_110px_90px_90px_90px_90px_72px_24px] items-center gap-4 px-4 py-2 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date · Worker</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Duration</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Progress</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Concern</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Referral</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</span>
                <span />
              </div>

              {paginated.map((rec, idx) => {
                const isExpanded = expandedId === rec.recordingId
                return (
                  <div key={rec.recordingId} className={idx > 0 ? 'border-t border-slate-100' : ''}>
                    {/* Row */}
                    <div
                      className="grid grid-cols-[1fr_110px_90px_90px_90px_90px_72px_24px] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : rec.recordingId)}
                    >
                      <div>
                        <p className="font-medium text-sm text-[#0f172a]">{rec.sessionDate ?? '—'}</p>
                        <p className="text-xs text-slate-400">{rec.socialWorker ?? '—'}</p>
                      </div>

                      <div>
                        {rec.sessionType ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SESSION_TYPE_BADGE[rec.sessionType] ?? 'bg-slate-100 text-slate-500'}`}>
                            {rec.sessionType}
                          </span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </div>

                      <div>
                        <span className="text-xs text-slate-500">
                          {rec.sessionDurationMinutes != null ? `${rec.sessionDurationMinutes} min` : '—'}
                        </span>
                      </div>

                      <div className="flex justify-center">
                        {rec.progressNoted
                          ? <CheckCircle2 size={18} className="text-green-500" />
                          : <span className="text-slate-300 text-sm">—</span>}
                      </div>

                      <div className="flex justify-center">
                        {rec.concernsFlagged
                          ? <CheckCircle2 size={18} className="text-red-400" />
                          : <span className="text-slate-300 text-sm">—</span>}
                      </div>

                      <div className="flex justify-center">
                        {rec.referralMade
                          ? <CheckCircle2 size={18} className="text-yellow-500" />
                          : <span className="text-slate-300 text-sm">—</span>}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditRecording(rec); setShowForm(true) }} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteConfirmId(rec.recordingId)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                      </div>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 text-sm border-t border-slate-100 bg-slate-50/50">
                        {(rec.emotionalStateObserved || rec.emotionalStateEnd) && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Emotional State</p>
                            <p className="text-slate-700">
                              {rec.emotionalStateObserved ?? '—'}
                              {rec.emotionalStateEnd && <span className="text-slate-400"> → {rec.emotionalStateEnd}</span>}
                            </p>
                          </div>
                        )}
                        {rec.sessionNarrative && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Session Narrative</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{rec.sessionNarrative}</p>
                          </div>
                        )}
                        {rec.interventionsApplied && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Interventions Applied</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{rec.interventionsApplied}</p>
                          </div>
                        )}
                        {rec.followUpActions && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Follow-Up Actions</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{rec.followUpActions}</p>
                          </div>
                        )}
                        {rec.notesRestricted && (
                          <div className="border-t border-slate-100 pt-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes (Restricted)</p>
                            <p className="text-slate-700 whitespace-pre-wrap">{rec.notesRestricted}</p>
                          </div>
                        )}
                        {!rec.emotionalStateObserved && !rec.emotionalStateEnd && !rec.sessionNarrative && !rec.interventionsApplied && !rec.followUpActions && !rec.notesRestricted && (
                          <p className="text-slate-400 text-xs italic">No additional details recorded.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {paginated.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-sm">No process recordings yet for this resident.</div>
              )}
            </div>
            <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} count={recordings.length} pageSize={PAGE_SIZE} />
              </>
              )
            })()}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <Modal onClose={() => setDeleteConfirmId(null)}>
          <h2 className="text-lg font-bold text-[#0f172a] mb-2">Delete Recording</h2>
          <p className="text-slate-600 text-sm mb-6">Are you sure you want to delete this process recording? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
          </div>
        </Modal>
      )}

      {/* Add/Edit form modal */}
      {showForm && selectedResidentId && (
        <RecordingFormModal
          residentId={selectedResidentId}
          existing={editRecording}
          onClose={() => { setShowForm(false); setEditRecording(null) }}
          onSaved={() => {
            setShowForm(false)
            setEditRecording(null)
            fetchRecordings(selectedResidentId)
          }}
        />
      )}
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-safira-blue"

// ── Recording Form Modal ──────────────────────────────────────────────────────

interface RecordingFormModalProps {
  residentId: number
  existing: ProcessRecording | null
  onClose: () => void
  onSaved: () => void
}

function RecordingFormModal({ residentId, existing, onClose, onSaved }: RecordingFormModalProps) {
  const [form, setForm] = useState({
    sessionDate: existing?.sessionDate ?? new Date().toISOString().split('T')[0],
    socialWorker: existing?.socialWorker ?? '',
    sessionType: existing?.sessionType ?? 'Individual',
    sessionDurationMinutes: existing?.sessionDurationMinutes?.toString() ?? '',
    emotionalStateObserved: existing?.emotionalStateObserved ?? '',
    emotionalStateEnd: existing?.emotionalStateEnd ?? '',
    sessionNarrative: existing?.sessionNarrative ?? '',
    interventionsApplied: existing?.interventionsApplied ?? '',
    followUpActions: existing?.followUpActions ?? '',
    progressNoted: existing?.progressNoted ?? false,
    concernsFlagged: existing?.concernsFlagged ?? false,
    referralMade: existing?.referralMade ?? false,
    notesRestricted: existing?.notesRestricted ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        sessionDurationMinutes: form.sessionDurationMinutes !== '' ? parseInt(form.sessionDurationMinutes) : null,
      }
      if (existing) {
        await apiFetch(`/api/process-recordings/${existing.recordingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(`/api/residents/${residentId}/process-recordings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-[#0f172a] mb-4">
        {existing ? 'Edit Process Recording' : 'New Process Recording'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Session Date">
            <input className={inputClass} type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} required />
          </FormField>
          <FormField label="Session Type">
            <select className={inputClass} value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })}>
              <option value="Individual">Individual</option>
              <option value="Group">Group</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Social Worker">
            <select className={inputClass} value={form.socialWorker} onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}>
              <option value="">Select…</option>
              {SOCIAL_WORKERS.map((sw) => <option key={sw} value={sw}>{sw}</option>)}
            </select>
          </FormField>
          <FormField label="Duration (minutes)">
            <input className={inputClass} type="number" value={form.sessionDurationMinutes} onChange={(e) => setForm({ ...form, sessionDurationMinutes: e.target.value })} placeholder="e.g. 60" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Emotional State (Start)">
            <input className={inputClass} value={form.emotionalStateObserved} onChange={(e) => setForm({ ...form, emotionalStateObserved: e.target.value })} placeholder="e.g. Withdrawn, Anxious" />
          </FormField>
          <FormField label="Emotional State (End)">
            <input className={inputClass} value={form.emotionalStateEnd} onChange={(e) => setForm({ ...form, emotionalStateEnd: e.target.value })} placeholder="e.g. Calmer, Engaged" />
          </FormField>
        </div>

        <FormField label="Session Narrative">
          <textarea className={inputClass} rows={5} value={form.sessionNarrative} onChange={(e) => setForm({ ...form, sessionNarrative: e.target.value })} placeholder="Describe what happened during the session..." />
        </FormField>

        <FormField label="Interventions Applied">
          <textarea className={inputClass} rows={3} value={form.interventionsApplied} onChange={(e) => setForm({ ...form, interventionsApplied: e.target.value })} placeholder="Techniques, activities, or approaches used..." />
        </FormField>

        <FormField label="Follow-Up Actions">
          <textarea className={inputClass} rows={3} value={form.followUpActions} onChange={(e) => setForm({ ...form, followUpActions: e.target.value })} placeholder="Next steps, referrals, tasks to complete..." />
        </FormField>

        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.progressNoted} onChange={(e) => setForm({ ...form, progressNoted: e.target.checked })} className="rounded" />
            Progress Noted
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.concernsFlagged} onChange={(e) => setForm({ ...form, concernsFlagged: e.target.checked })} className="rounded" />
            Concerns Flagged
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.referralMade} onChange={(e) => setForm({ ...form, referralMade: e.target.checked })} className="rounded" />
            Referral Made
          </label>
        </div>

        <FormField label="Notes (Restricted)">
          <textarea className={inputClass} rows={2} value={form.notesRestricted} onChange={(e) => setForm({ ...form, notesRestricted: e.target.value })} />
        </FormField>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-safira-blue hover:bg-safira-blue-dark rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Recording'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
