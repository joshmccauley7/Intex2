import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { Plus, Eye, Pencil, Trash2, ArrowRight, AlertTriangle, Heart, GraduationCap, Users } from 'lucide-react'
import ResidentStatusStrip, { type ResidentStatusIndicators, type StatusLight } from '../../components/admin/ResidentStatusStrip'

interface ResidentRow {
  residentId: number
  internalCode: string | null
  caseControlNo: string | null
  caseCategory: string | null
  caseStatus: string | null
  safehouseId: number | null
  assignedSocialWorker: string | null
  presentAge: string | null
  reintegrationStatus: string | null
  dateOfAdmission: string | null
  statusIndicators?: ResidentStatusIndicators
}

interface ResidentDetail {
  residentId: number
  caseControlNo: string | null
  internalCode: string | null
  safehouseId: number | null
  caseStatus: string | null
  sex: string | null
  dateOfBirth: string | null
  birthStatus: string | null
  placeOfBirth: string | null
  religion: string | null
  caseCategory: string | null
  subCatOrphaned: boolean
  subCatTrafficked: boolean
  subCatChildLabor: boolean
  subCatPhysicalAbuse: boolean
  subCatSexualAbuse: boolean
  subCatOsaec: boolean
  subCatCicl: boolean
  subCatAtRisk: boolean
  subCatStreetChild: boolean
  subCatChildWithHiv: boolean
  isPwd: boolean
  pwdType: string | null
  hasSpecialNeeds: boolean
  specialNeedsDiagnosis: string | null
  familyIs4ps: boolean
  familySoloParent: boolean
  familyIndigenous: boolean
  familyParentPwd: boolean
  familyInformalSettler: boolean
  dateOfAdmission: string | null
  ageUponAdmission: string | null
  presentAge: string | null
  lengthOfStay: string | null
  referralSource: string | null
  referringAgencyPerson: string | null
  dateColbRegistered: string | null
  dateColbObtained: string | null
  assignedSocialWorker: string | null
  initialCaseAssessment: string | null
  dateCaseStudyPrepared: string | null
  reintegrationType: string | null
  reintegrationStatus: string | null
  initialRiskLevel: string | null
  currentRiskLevel: string | null
  dateEnrolled: string | null
  dateClosed: string | null
  notesRestricted: string | null
}

interface HealthEvent {
  type: 'health'
  date: string
  generalHealthScore: number | null
  nutritionScore: number | null
  sleepQualityScore: number | null
  energyLevelScore: number | null
  medicalCheckupDone: boolean | null
  dentalCheckupDone: boolean | null
  psychologicalCheckupDone: boolean | null
}

interface SessionEvent {
  type: 'session'
  date: string
  sessionType: string | null
  socialWorker: string | null
  sessionDurationMinutes: number | null
  emotionalStateObserved: string | null
  emotionalStateEnd: string | null
  progressNoted: boolean | null
  concernsFlagged: boolean | null
  interventionsApplied: string | null
}

interface VisitationEvent {
  type: 'visitation'
  date: string
  visitType: string | null
  locationVisited: string | null
  familyCooperationLevel: string | null
  safetyConcernsNoted: boolean | null
  visitOutcome: string | null
}

interface EducationEvent {
  type: 'education'
  date: string
  enrollmentStatus: string | null
  attendanceRate: number | null
  progressPercent: number | null
  completionStatus: string | null
}

type LifecycleEvent = HealthEvent | SessionEvent | VisitationEvent | EducationEvent

interface LifecycleData {
  riskJourney: { initial: string | null; current: string | null }
  statusIndicators: ResidentStatusIndicators
  health: HealthEvent[]
  sessions: SessionEvent[]
  visitations: VisitationEvent[]
  education: EducationEvent[]
}

const SAFEHOUSES = [1,2,3,4,5,6,7,8,9].map(i => ({ id: i, name: `Lighthouse Safehouse ${i}` }))
const BIRTH_STATUS_OPTIONS = ['Marital', 'Non-Marital']
const INITIAL_CASE_ASSESSMENT_OPTIONS = [
  'For Adoption',
  'For Continued Care',
  'For Foster Care',
  'For Independent Living',
  'For Reunification',
]
const REFERRAL_SOURCE_OPTIONS = [
  'Community',
  'Court Order',
  'Government Agency',
  'NGO',
  'Police',
  'Self-Referral',
]
const REFERRING_AGENCY_PERSON_OPTIONS = [
  'Ana Cruz',
  'Ana Dizon',
  'Ana Reyes',
  'Ana Santos',
  'Elena Cruz',
  'Elena Flores',
  'Elena Reyes',
  'Elena Santos',
  'Grace Flores',
  'Grace Reyes',
  'Joy Cruz',
  'Joy Dizon',
  'Lina Cruz',
  'Lina Flores',
  'Lina Santos',
  'Maria Dizon',
  'Mark Dizon',
  'Mark Flores',
  'Noel Reyes',
  'Noel Santos',
  'Ramon Cruz',
  'Ramon Flores',
  'Ramon Garcia',
  'Ramon Reyes',
  'Ramon Santos',
  'Sofia Dizon',
  'Sofia Reyes',
]
const ASSIGNED_SOCIAL_WORKER_OPTIONS = [
  'SW-01',
  'SW-02',
  'SW-03',
  'SW-04',
  'SW-05',
  'SW-06',
  'SW-07',
  'SW-08',
  'SW-09',
  'SW-10',
  'SW-11',
  'SW-13',
  'SW-14',
  'SW-15',
  'SW-16',
  'SW-17',
  'SW-19',
  'SW-20',
]

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-500',
  Transferred: 'bg-blue-100 text-blue-700',
}

const PAGE_SIZE = 20

function normalizeStatusIndicators(raw: unknown): ResidentStatusIndicators {
  const o = raw as Record<string, string> | null | undefined
  const s = (v: string | undefined): StatusLight =>
    v === 'green' || v === 'yellow' || v === 'red' ? v : 'yellow'
  return {
    health: s(o?.health),
    education: s(o?.education),
    counseling: s(o?.counseling),
    risk: s(o?.risk),
  }
}

function formatAgeFromDates(startDateRaw: string | null | undefined, endDateRaw: string | null | undefined) {
  if (!startDateRaw || !endDateRaw) return ''
  const startDate = new Date(startDateRaw)
  const endDate = new Date(endDateRaw)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return ''

  let years = endDate.getFullYear() - startDate.getFullYear()
  let months = endDate.getMonth() - startDate.getMonth()
  const days = endDate.getDate() - startDate.getDate()

  if (days < 0) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }

  years = Math.max(0, years)
  months = Math.max(0, months)
  return `${years} Years ${months} months`
}

function generateResidentCodesFromExisting(residents: Array<{ caseControlNo: string | null; internalCode: string | null }>) {
  const maxInternal = residents.reduce((max, r) => {
    const match = r.internalCode?.match(/^LS-(\d+)$/i)
    if (!match) return max
    return Math.max(max, parseInt(match[1], 10))
  }, 0)

  const maxCaseControl = residents.reduce((max, r) => {
    const match = r.caseControlNo?.match(/^C(\d+)$/i)
    if (!match) return max
    return Math.max(max, parseInt(match[1], 10))
  }, 0)

  const nextInternal = maxInternal + 1
  const nextCaseControl = maxCaseControl + 1

  return {
    caseControlNo: `C${String(nextCaseControl).padStart(4, '0')}`,
    internalCode: `LS-${String(nextInternal).padStart(4, '0')}`,
  }
}

const blankForm = (): Partial<ResidentDetail> => ({
  caseStatus: 'Active',
  caseCategory: '',
  currentRiskLevel: 'Medium',
  initialRiskLevel: 'Medium',
  reintegrationStatus: 'Not Started',
  reintegrationType: 'None',
  subCatOrphaned: false,
  subCatTrafficked: false,
  subCatChildLabor: false,
  subCatPhysicalAbuse: false,
  subCatSexualAbuse: false,
  subCatOsaec: false,
  subCatCicl: false,
  subCatAtRisk: false,
  subCatStreetChild: false,
  subCatChildWithHiv: false,
  isPwd: false,
  hasSpecialNeeds: false,
  familyIs4ps: false,
  familySoloParent: false,
  familyIndigenous: false,
  familyParentPwd: false,
  familyInformalSettler: false,
})

export default function ResidentsPage() {
  const [residents, setResidents] = useState<ResidentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [safehouseFilter, setSafehouseFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedResident, setSelectedResident] = useState<ResidentDetail | null>(null)
  const [lifecycle, setLifecycle] = useState<LifecycleData | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editResident, setEditResident] = useState<ResidentDetail | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const fetchResidents = () => {
    setLoading(true)
    setCurrentPage(1)
    const params = new URLSearchParams()
    if (statusFilter) params.append('status', statusFilter)
    if (safehouseFilter) params.append('safehouseId', safehouseFilter)
    if (categoryFilter) params.append('category', categoryFilter)
    if (riskFilter) params.append('riskLevel', riskFilter)
    if (search) params.append('search', search)
    apiFetch(`/api/residents?${params.toString()}`)
      .then((rows: ResidentRow[]) =>
        setResidents(
          rows.map((r) => ({
            ...r,
            statusIndicators: normalizeStatusIndicators(r.statusIndicators),
          }))
        )
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchResidents() }, [statusFilter, safehouseFilter, categoryFilter, riskFilter, search])

  const openDetail = (id: number) => {
    setLifecycle(null)
    Promise.all([
      apiFetch(`/api/residents/${id}`),
      apiFetch(`/api/residents/${id}/lifecycle`),
    ])
      .then(([detail, lc]) => {
        setSelectedResident(detail)
        const raw = lc as LifecycleData & { statusIndicators?: unknown }
        setLifecycle({
          ...raw,
          statusIndicators: normalizeStatusIndicators(raw.statusIndicators),
        })
      })
      .catch((e) => setError(e.message))
  }

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/residents/${id}`, { method: 'DELETE' })
    setDeleteConfirmId(null)
    fetchResidents()
  }

  const safehouseName = (id: number | null) =>
    id ? `Safehouse ${id}` : '—'

  const filterClass = "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-safira-blue"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0f172a]">Caseload Inventory</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Resident
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <label htmlFor="resident-search-filter" className="sr-only">Search residents by internal code</label>
        <input
          id="resident-search-filter"
          placeholder="Search by code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={filterClass}
        />
        <label htmlFor="resident-status-filter" className="sr-only">Filter by resident status</label>
        <select
          id="resident-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterClass}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
          <option value="Transferred">Transferred</option>
        </select>
        <label htmlFor="resident-safehouse-filter" className="sr-only">Filter by safehouse</label>
        <select
          id="resident-safehouse-filter"
          value={safehouseFilter}
          onChange={(e) => setSafehouseFilter(e.target.value)}
          className={filterClass}
        >
          <option value="">All Safehouses</option>
          {SAFEHOUSES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label htmlFor="resident-category-filter" className="sr-only">Filter by case category</label>
        <select
          id="resident-category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={filterClass}
        >
          <option value="">All Categories</option>
          <option value="Abandoned">Abandoned</option>
          <option value="Foundling">Foundling</option>
          <option value="Neglected">Neglected</option>
          <option value="Surrendered">Surrendered</option>
        </select>
        <label htmlFor="resident-risk-filter" className="sr-only">Filter by risk level</label>
        <select
          id="resident-risk-filter"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className={filterClass}
        >
          <option value="">All Risk Levels</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Table */}
      {loading && <p className="text-slate-500 text-sm">Loading...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && (() => {
        const totalPages = Math.ceil(residents.length / PAGE_SIZE)
        const paginated = residents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
        return (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Internal Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-0 whitespace-nowrap">Indicators</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Safehouse</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Social Worker</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reintegration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((r) => (
                    <tr key={r.residentId} onClick={() => openDetail(r.residentId)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-medium text-[#0f172a]">{r.internalCode ?? '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ResidentStatusStrip levels={r.statusIndicators ?? normalizeStatusIndicators(undefined)} variant="compact" />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.caseCategory ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.caseStatus ?? ''] ?? 'bg-slate-100 text-slate-500'}`}>
                          {r.caseStatus ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{safehouseName(r.safehouseId)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.assignedSocialWorker ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.presentAge ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.reintegrationStatus ?? '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openDetail(r.residentId)} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors" title="View"><Eye size={15} /></button>
                          <button onClick={() => apiFetch(`/api/residents/${r.residentId}`).then(d => setEditResident(d))} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors" title="Edit"><Pencil size={15} /></button>
                          <button onClick={() => setDeleteConfirmId(r.residentId)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {residents.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No residents found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} count={residents.length} pageSize={PAGE_SIZE} />
          </>
        )
      })()}

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <Modal onClose={() => setDeleteConfirmId(null)}>
          <h2 className="text-lg font-bold text-[#0f172a] mb-2">Delete Resident</h2>
          <p className="text-slate-600 text-sm mb-6">Are you sure you want to delete this resident record? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {selectedResident && !editResident && (
        <Modal onClose={() => { setSelectedResident(null); setLifecycle(null) }} wide>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#0f172a]">{selectedResident.internalCode ?? 'Resident'}</h2>
              <p className="text-sm text-slate-500">{selectedResident.caseCategory ?? '—'}</p>
            </div>
            {selectedResident.caseStatus && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[selectedResident.caseStatus] ?? 'bg-slate-100 text-slate-500'}`}>
                {selectedResident.caseStatus}
              </span>
            )}
          </div>

          {lifecycle && (
            <div className="mb-6 pb-4 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Health · Education · Counseling · Risk</p>
              <ResidentStatusStrip variant="labeled" levels={lifecycle.statusIndicators} className="justify-start" />
            </div>
          )}

          <SectionHeading>Demographics</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="Case Control No" value={selectedResident.caseControlNo} />
            <DetailRow label="Sex" value={selectedResident.sex} />
            <DetailRow label="Date of Birth" value={selectedResident.dateOfBirth} />
            <DetailRow label="Birth Status" value={selectedResident.birthStatus} />
            <DetailRow label="Place of Birth" value={selectedResident.placeOfBirth} />
            <DetailRow label="Religion" value={selectedResident.religion} />
          </div>

          <SectionHeading>Case Info</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="Initial Risk Level" value={selectedResident.initialRiskLevel} />
            <DetailRow label="Current Risk Level" value={selectedResident.currentRiskLevel} />
            <DetailRow label="Initial Assessment" value={selectedResident.initialCaseAssessment} />
            <div className="col-span-2">
              <span className="text-slate-400 font-medium">Subcategories: </span>
              <span className="text-slate-700">
                {[
                  selectedResident.subCatOrphaned && 'Orphaned',
                  selectedResident.subCatTrafficked && 'Trafficked',
                  selectedResident.subCatChildLabor && 'Child Labor',
                  selectedResident.subCatPhysicalAbuse && 'Physical Abuse',
                  selectedResident.subCatSexualAbuse && 'Sexual Abuse',
                  selectedResident.subCatOsaec && 'OSAEC',
                  selectedResident.subCatCicl && 'CICL',
                  selectedResident.subCatAtRisk && 'At Risk',
                  selectedResident.subCatStreetChild && 'Street Child',
                  selectedResident.subCatChildWithHiv && 'Child w/ HIV',
                ].filter(Boolean).join(', ') || '—'}
              </span>
            </div>
          </div>

          <SectionHeading>Disability &amp; Special Needs</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="PWD" value={selectedResident.isPwd ? `Yes — ${selectedResident.pwdType ?? 'unspecified'}` : 'No'} />
            <DetailRow label="Special Needs" value={selectedResident.hasSpecialNeeds ? `Yes — ${selectedResident.specialNeedsDiagnosis ?? 'unspecified'}` : 'No'} />
          </div>

          <SectionHeading>Family Profile</SectionHeading>
          <div className="text-sm mb-4">
            <span className="text-slate-700">
              {[
                selectedResident.familyIs4ps && '4Ps Beneficiary',
                selectedResident.familySoloParent && 'Solo Parent',
                selectedResident.familyIndigenous && 'Indigenous Group',
                selectedResident.familyParentPwd && 'Parent PWD',
                selectedResident.familyInformalSettler && 'Informal Settler',
              ].filter(Boolean).join(', ') || 'None noted'}
            </span>
          </div>

          <SectionHeading>Admission &amp; Referral</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="Safehouse" value={safehouseName(selectedResident.safehouseId)} />
            <DetailRow label="Date of Admission" value={selectedResident.dateOfAdmission} />
            <DetailRow label="Age upon Admission" value={selectedResident.ageUponAdmission} />
            <DetailRow label="Present Age" value={selectedResident.presentAge} />
            <DetailRow label="Length of Stay" value={selectedResident.lengthOfStay ? `${selectedResident.lengthOfStay} days` : null} />
            <DetailRow label="Referral Source" value={selectedResident.referralSource} />
            <DetailRow label="Referring Agency/Person" value={selectedResident.referringAgencyPerson} />
          </div>

          <SectionHeading>Legal</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="COLB Registered" value={selectedResident.dateColbRegistered} />
            <DetailRow label="COLB Obtained" value={selectedResident.dateColbObtained} />
          </div>

          <SectionHeading>Social Worker</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="Assigned Social Worker" value={selectedResident.assignedSocialWorker} />
            <DetailRow label="Case Study Prepared" value={selectedResident.dateCaseStudyPrepared} />
          </div>

          <SectionHeading>Reintegration</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <DetailRow label="Type" value={selectedResident.reintegrationType} />
            <DetailRow label="Status" value={selectedResident.reintegrationStatus} />
            <DetailRow label="Date Enrolled" value={selectedResident.dateEnrolled} />
            <DetailRow label="Date Closed" value={selectedResident.dateClosed} />
          </div>

          {selectedResident.notesRestricted && (
            <>
              <SectionHeading>Notes (Restricted)</SectionHeading>
              <p className="text-sm text-slate-700 mb-4">{selectedResident.notesRestricted}</p>
            </>
          )}

          {lifecycle && (
            <>
              <RiskJourney
                initial={lifecycle.riskJourney.initial}
                current={lifecycle.riskJourney.current}
              />
              <ResidentTimeline lifecycle={lifecycle} />
            </>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button onClick={() => setEditResident(selectedResident)} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Edit</button>
            <button onClick={() => { setSelectedResident(null); setLifecycle(null) }} className="px-4 py-2 text-sm font-medium text-white bg-safira-blue hover:bg-safira-blue-dark rounded-lg transition-colors">Close</button>
          </div>
        </Modal>
      )}

      {/* Create/Edit modal */}
      {(showCreateModal || editResident) && (
        <ResidentFormModal
          existing={editResident}
          onClose={() => { setShowCreateModal(false); setEditResident(null) }}
          onSaved={() => { setShowCreateModal(false); setEditResident(null); setSelectedResident(null); fetchResidents() }}
        />
      )}
    </div>
  )
}

// ── Risk Journey ─────────────────────────────────────────────────────────────

const RISK_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const RISK_COLOR: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
}

function RiskJourney({ initial, current }: { initial: string | null; current: string | null }) {
  if (!initial && !current) return null
  const improved =
    initial && current ? RISK_RANK[current] < RISK_RANK[initial] : false
  const worsened =
    initial && current ? RISK_RANK[current] > RISK_RANK[initial] : false

  return (
    <div className="mt-6 mb-2">
      <SectionHeading>Risk Journey</SectionHeading>
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${RISK_COLOR[initial ?? ''] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          {initial ?? '—'}
          <span className="block text-xs font-normal opacity-70">at admission</span>
        </div>
        <ArrowRight
          size={18}
          className={improved ? 'text-green-500' : worsened ? 'text-red-400' : 'text-slate-300'}
        />
        <div className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${RISK_COLOR[current ?? ''] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          {current ?? '—'}
          <span className="block text-xs font-normal opacity-70">current</span>
        </div>
        {improved && <span className="text-xs text-green-600 font-medium ml-1">Improving</span>}
        {worsened && <span className="text-xs text-red-500 font-medium ml-1">Escalated</span>}
        {!improved && !worsened && initial && current && (
          <span className="text-xs text-slate-400 font-medium ml-1">Unchanged</span>
        )}
      </div>
    </div>
  )
}

// ── Resident Timeline ─────────────────────────────────────────────────────────

function fmtShortDate(d: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scoreBar(value: number | null) {
  if (value == null) return null
  const pct = Math.round((value / 5) * 100)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-safira-blue rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function ResidentTimeline({ lifecycle }: { lifecycle: LifecycleData }) {
  const events: LifecycleEvent[] = [
    ...lifecycle.health,
    ...lifecycle.sessions,
    ...lifecycle.visitations,
    ...lifecycle.education,
  ].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  if (events.length === 0) return null

  const TYPE_META = {
    health: { label: 'Health Check', color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-100', icon: <Heart size={12} className="text-emerald-600" /> },
    session: { label: 'Counseling Session', color: 'bg-purple-500', light: 'bg-purple-50 border-purple-100', icon: <Users size={12} className="text-purple-600" /> },
    visitation: { label: 'Home Visit', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-100', icon: <AlertTriangle size={12} className="text-blue-600" /> },
    education: { label: 'Education Record', color: 'bg-yellow-500', light: 'bg-yellow-50 border-yellow-100', icon: <GraduationCap size={12} className="text-yellow-600" /> },
  }

  return (
    <div className="mt-6">
      <SectionHeading>Case Timeline</SectionHeading>
      <div className="relative pl-6">
        {/* Vertical guide line */}
        <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />

        <div className="space-y-3">
          {events.map((ev, i) => {
            const meta = TYPE_META[ev.type]
            return (
              <div key={i} className="relative">
                {/* Dot */}
                <div className={`absolute -left-4 top-3 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-200 ${meta.color}`} />

                <div className={`rounded-lg border p-3 ${meta.light}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {meta.icon}
                      <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
                    </div>
                    <span className="text-xs text-slate-400">{fmtShortDate(ev.date)}</span>
                  </div>

                  {ev.type === 'health' && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <div><span className="text-xs text-slate-400">Health</span>{scoreBar(ev.generalHealthScore)}</div>
                        <div><span className="text-xs text-slate-400">Nutrition</span>{scoreBar(ev.nutritionScore)}</div>
                        <div><span className="text-xs text-slate-400">Sleep</span>{scoreBar(ev.sleepQualityScore)}</div>
                        <div><span className="text-xs text-slate-400">Energy</span>{scoreBar(ev.energyLevelScore)}</div>
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {[
                          [ev.medicalCheckupDone, 'Medical'],
                          [ev.dentalCheckupDone, 'Dental'],
                          [ev.psychologicalCheckupDone, 'Psych'],
                        ].map(([done, label]) => (
                          <span
                            key={label as string}
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {done ? '✓' : '✗'} {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ev.type === 'session' && (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex gap-3 flex-wrap">
                        {ev.sessionType && <span className="font-medium">{ev.sessionType}</span>}
                        {ev.socialWorker && <span className="text-slate-400">{ev.socialWorker}</span>}
                        {ev.sessionDurationMinutes && <span className="text-slate-400">{ev.sessionDurationMinutes} min</span>}
                      </div>
                      {ev.emotionalStateObserved && ev.emotionalStateEnd && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">{ev.emotionalStateObserved}</span>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span className="text-slate-700 font-medium">{ev.emotionalStateEnd}</span>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {ev.progressNoted && <span className="text-emerald-600 font-medium">✓ Progress noted</span>}
                        {ev.concernsFlagged && <span className="text-orange-500 font-medium">⚠ Concerns flagged</span>}
                        {ev.interventionsApplied && <span className="text-slate-400">{ev.interventionsApplied}</span>}
                      </div>
                    </div>
                  )}

                  {ev.type === 'visitation' && (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex gap-3 flex-wrap">
                        {ev.visitType && <span className="font-medium">{ev.visitType}</span>}
                        {ev.locationVisited && <span className="text-slate-400">{ev.locationVisited}</span>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {ev.familyCooperationLevel && (
                          <span className={`px-1.5 py-0.5 rounded font-medium ${
                            ev.familyCooperationLevel === 'Cooperative' ? 'bg-emerald-100 text-emerald-700' :
                            ev.familyCooperationLevel === 'Non-Cooperative' ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{ev.familyCooperationLevel}</span>
                        )}
                        {ev.safetyConcernsNoted && <span className="text-orange-500 font-medium">⚠ Safety concerns</span>}
                        {ev.visitOutcome && <span className="text-slate-400">{ev.visitOutcome}</span>}
                      </div>
                    </div>
                  )}

                  {ev.type === 'education' && (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <div className="flex gap-3 flex-wrap">
                        {ev.enrollmentStatus && <span className={`font-medium ${ev.enrollmentStatus === 'Enrolled' ? 'text-emerald-600' : 'text-slate-500'}`}>{ev.enrollmentStatus}</span>}
                        {ev.completionStatus && <span className="text-slate-400">{ev.completionStatus}</span>}
                      </div>
                      {ev.attendanceRate != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 w-20">Attendance</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.round(ev.attendanceRate * 100)}%` }} />
                          </div>
                          <span className="text-slate-500 w-8 text-right">{Math.round(ev.attendanceRate * 100)}%</span>
                        </div>
                      )}
                      {ev.progressPercent != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 w-20">Progress</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.round(ev.progressPercent)}%` }} />
                          </div>
                          <span className="text-slate-500 w-8 text-right">{Math.round(ev.progressPercent)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full max-h-[85vh] overflow-y-auto p-6 ${wide ? 'max-w-2xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[#0f172a] mb-2 mt-4 first:mt-0">{children}</h3>
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-slate-400 font-medium">{label}: </span>
      <span className="text-slate-700">{value ?? '—'}</span>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-safira-blue"

// ── Resident Form Modal ───────────────────────────────────────────────────────

interface ResidentFormModalProps {
  existing: ResidentDetail | null
  onClose: () => void
  onSaved: () => void
}

function ResidentFormModal({ existing, onClose, onSaved }: ResidentFormModalProps) {
  const [form, setForm] = useState<Partial<ResidentDetail>>(existing ?? blankForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) return
    if (form.caseControlNo || form.internalCode) return

    apiFetch('/api/residents')
      .then((rows: Array<{ caseControlNo: string | null; internalCode: string | null }>) => {
        const generated = generateResidentCodesFromExisting(rows)
        setForm((f) => ({ ...f, ...generated }))
      })
      .catch(() => null)
  }, [existing, form.caseControlNo, form.internalCode])

  useEffect(() => {
    if (!form.dateOfBirth) return

    const presentAge = formatAgeFromDates(form.dateOfBirth, new Date().toISOString().slice(0, 10))
    const ageUponAdmission = formatAgeFromDates(form.dateOfBirth, form.dateOfAdmission ?? null)

    setForm((f) => ({
      ...f,
      presentAge,
      ageUponAdmission,
    }))
  }, [form.dateOfBirth, form.dateOfAdmission])

  const set = (field: keyof ResidentDetail, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  const textField = (label: string, field: keyof ResidentDetail) => (
    <FormField label={label}>
      <input className={inputClass} value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value)} />
    </FormField>
  )

  const dateField = (label: string, field: keyof ResidentDetail) => (
    <FormField label={label}>
      <input className={inputClass} type="date" value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value)} />
    </FormField>
  )

  const selectField = (label: string, field: keyof ResidentDetail, options: string[]) => (
    <FormField label={label}>
      <select className={inputClass} value={(form[field] as string) ?? ''} onChange={(e) => set(field, e.target.value || null)}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </FormField>
  )

  const checkbox = (label: string, field: keyof ResidentDetail) => (
    <label key={field} className="flex items-center gap-2 text-sm text-slate-700 mb-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!form[field]}
        onChange={(e) => set(field, e.target.checked)}
        className="rounded"
      />
      {label}
    </label>
  )

  const buildPayload = () => {
    const normalized = Object.fromEntries(
      Object.entries(form).map(([key, value]) => {
        if (typeof value === 'string') {
          const trimmed = value.trim()
          return [key, trimmed === '' ? null : trimmed]
        }
        return [key, value]
      })
    )
    return normalized
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = buildPayload()
    try {
      if (existing) {
        await apiFetch(`/api/residents/${existing.residentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/residents', {
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
    <Modal onClose={onClose} wide>
      <h2 className="text-lg font-bold text-[#0f172a] mb-4">{existing ? 'Edit Resident' : 'Add Resident'}</h2>
      <form onSubmit={handleSubmit}>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Identifiers</p>
        {textField('Case Control No', 'caseControlNo')}
        {textField('Internal Code', 'internalCode')}
        <FormField label="Safehouse">
          <select className={inputClass} value={form.safehouseId ?? ''} onChange={(e) => set('safehouseId', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">Select safehouse</option>
            {SAFEHOUSES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Demographics</p>
        <FormField label="Sex">
          <select className={inputClass} value={form.sex ?? ''} onChange={(e) => set('sex', e.target.value)}>
            <option value="">Select</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </FormField>
        {dateField('Date of Birth', 'dateOfBirth')}
        {selectField('Birth Status', 'birthStatus', BIRTH_STATUS_OPTIONS)}
        {textField('Place of Birth', 'placeOfBirth')}
        {textField('Religion', 'religion')}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Case Info</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Case Status">
            <select className={inputClass} value={form.caseStatus ?? ''} onChange={(e) => set('caseStatus', e.target.value)}>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Transferred">Transferred</option>
            </select>
          </FormField>
          <FormField label="Case Category">
            <select className={inputClass} value={form.caseCategory ?? ''} onChange={(e) => set('caseCategory', e.target.value)}>
              <option value="">Select</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Foundling">Foundling</option>
              <option value="Neglected">Neglected</option>
              <option value="Surrendered">Surrendered</option>
            </select>
          </FormField>
          <FormField label="Initial Risk Level">
            <select className={inputClass} value={form.initialRiskLevel ?? ''} onChange={(e) => set('initialRiskLevel', e.target.value)}>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </FormField>
          <FormField label="Current Risk Level">
            <select className={inputClass} value={form.currentRiskLevel ?? ''} onChange={(e) => set('currentRiskLevel', e.target.value)}>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </FormField>
        </div>
        {selectField('Initial Case Assessment', 'initialCaseAssessment', INITIAL_CASE_ASSESSMENT_OPTIONS)}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Subcategories</p>
        <div className="grid grid-cols-2">
          {checkbox('Orphaned', 'subCatOrphaned')}
          {checkbox('Trafficked', 'subCatTrafficked')}
          {checkbox('Child Labor', 'subCatChildLabor')}
          {checkbox('Physical Abuse', 'subCatPhysicalAbuse')}
          {checkbox('Sexual Abuse', 'subCatSexualAbuse')}
          {checkbox('OSAEC', 'subCatOsaec')}
          {checkbox('CICL', 'subCatCicl')}
          {checkbox('At Risk', 'subCatAtRisk')}
          {checkbox('Street Child', 'subCatStreetChild')}
          {checkbox('Child with HIV', 'subCatChildWithHiv')}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Disability &amp; Special Needs</p>
        {checkbox('PWD', 'isPwd')}
        {form.isPwd && textField('PWD Type', 'pwdType')}
        {checkbox('Has Special Needs', 'hasSpecialNeeds')}
        {form.hasSpecialNeeds && textField('Diagnosis', 'specialNeedsDiagnosis')}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Family Profile</p>
        <div className="grid grid-cols-2">
          {checkbox('4Ps Beneficiary', 'familyIs4ps')}
          {checkbox('Solo Parent', 'familySoloParent')}
          {checkbox('Indigenous Group', 'familyIndigenous')}
          {checkbox('Parent PWD', 'familyParentPwd')}
          {checkbox('Informal Settler', 'familyInformalSettler')}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Admission &amp; Referral</p>
        {dateField('Date of Admission', 'dateOfAdmission')}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Age upon Admission">
            <input className={inputClass} value={form.ageUponAdmission ?? ''} onChange={(e) => set('ageUponAdmission', e.target.value || null)} placeholder="e.g. 15 Years 9 months" />
          </FormField>
          <FormField label="Present Age">
            <input className={inputClass} value={form.presentAge ?? ''} onChange={(e) => set('presentAge', e.target.value || null)} placeholder="e.g. 17 Years 6 months" />
          </FormField>
        </div>
        <FormField label="Length of Stay">
          <input className={inputClass} value={form.lengthOfStay ?? ''} onChange={(e) => set('lengthOfStay', e.target.value || null)} placeholder="e.g. 2 Years 3 months" />
        </FormField>
        {selectField('Referral Source', 'referralSource', REFERRAL_SOURCE_OPTIONS)}
        {selectField('Referring Agency/Person', 'referringAgencyPerson', REFERRING_AGENCY_PERSON_OPTIONS)}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Legal</p>
        <div className="grid grid-cols-2 gap-3">
          {dateField('COLB Registered', 'dateColbRegistered')}
          {dateField('COLB Obtained', 'dateColbObtained')}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Social Worker</p>
        {selectField('Assigned Social Worker', 'assignedSocialWorker', ASSIGNED_SOCIAL_WORKER_OPTIONS)}
        {dateField('Case Study Prepared', 'dateCaseStudyPrepared')}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Reintegration</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <select className={inputClass} value={form.reintegrationType ?? ''} onChange={(e) => set('reintegrationType', e.target.value)}>
              <option value="None">None</option>
              <option value="Adoption (Domestic)">Adoption (Domestic)</option>
              <option value="Adoption (Inter-Country)">Adoption (Inter-Country)</option>
              <option value="Family Reunification">Family Reunification</option>
              <option value="Foster Care">Foster Care</option>
              <option value="Independent Living">Independent Living</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={form.reintegrationStatus ?? ''} onChange={(e) => set('reintegrationStatus', e.target.value)}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {dateField('Date Enrolled', 'dateEnrolled')}
          {dateField('Date Closed', 'dateClosed')}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-2">Notes (Restricted)</p>
        <FormField label="">
          <textarea
            className={inputClass}
            rows={3}
            value={form.notesRestricted ?? ''}
            onChange={(e) => set('notesRestricted', e.target.value)}
          />
        </FormField>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-safira-blue hover:bg-safira-blue-dark rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
