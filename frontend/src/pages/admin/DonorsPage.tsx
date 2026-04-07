import { useEffect, useState } from 'react'
import { apiFetch } from '../../api'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'

interface Supporter {
  supporterId: number
  displayName: string
  supporterType: string
  status: string
  region: string | null
  email: string | null
  firstDonationDate: string | null
}

interface Donation {
  donationId: number
  donationType: string
  donationDate: string
  isRecurring: boolean
  campaignName: string | null
  channelSource: string | null
  amount: number | null
  estimatedValue: number | null
  impactUnit: string | null
  notes: string | null
}

interface SupporterDetail extends Supporter {
  firstName: string
  lastName: string
  organizationName: string | null
  relationshipType: string | null
  country: string | null
  phone: string | null
  acquisitionChannel: string | null
  createdAt: string
  donations: Donation[]
}

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-slate-100 text-slate-500',
}

const PAGE_SIZE = 20

export default function DonorsPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedSupporter, setSelectedSupporter] = useState<SupporterDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editSupporter, setEditSupporter] = useState<SupporterDetail | null>(null)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const fetchSupporters = () => {
    setLoading(true)
    setCurrentPage(1)
    const params = new URLSearchParams()
    if (typeFilter) params.append('type', typeFilter)
    if (statusFilter) params.append('status', statusFilter)
    apiFetch(`/api/supporters?${params.toString()}`)
      .then(setSupporters)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSupporters() }, [typeFilter, statusFilter])

  const openDetail = (id: number) => {
    setDetailLoading(true)
    apiFetch(`/api/supporters/${id}`)
      .then(setSelectedSupporter)
      .catch((e) => setError(e.message))
      .finally(() => setDetailLoading(false))
  }

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/supporters/${id}`, { method: 'DELETE' })
    setDeleteConfirmId(null)
    fetchSupporters()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-DEFAULT">Donors &amp; Contributors</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-safira-blue hover:bg-safira-blue-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Supporter
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-safira-blue"
        >
          <option value="">All Types</option>
          <option value="MonetaryDonor">Monetary Donor</option>
          <option value="InKindDonor">In-Kind Donor</option>
          <option value="Volunteer">Volunteer</option>
          <option value="SocialMediaAdvocate">Social Media Advocate</option>
          <option value="SkillsContributor">Skills Contributor</option>
          <option value="PartnerOrganization">Partner Organization</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-safira-blue"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading && <p className="text-slate-500 text-sm">Loading...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && (() => {
        const totalPages = Math.ceil(supporters.length / PAGE_SIZE)
        const paginated = supporters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
        return (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">First Donation</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((s) => (
                    <tr key={s.supporterId} onClick={() => openDetail(s.supporterId)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-medium text-navy-DEFAULT">{s.displayName}</td>
                      <td className="px-4 py-3 text-slate-600">{s.supporterType}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.region ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{s.email ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{s.firstDonationDate ?? '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openDetail(s.supporterId)} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors" title="View"><Eye size={15} /></button>
                          <button onClick={() => openDetail(s.supporterId)} className="p-1.5 text-slate-400 hover:text-safira-blue transition-colors" title="Edit"><Pencil size={15} /></button>
                          <button onClick={() => setDeleteConfirmId(s.supporterId)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {supporters.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No supporters found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} count={supporters.length} pageSize={PAGE_SIZE} />
          </>
        )
      })()}

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <Modal onClose={() => setDeleteConfirmId(null)}>
          <h2 className="text-lg font-bold text-navy-DEFAULT mb-2">Delete Supporter</h2>
          <p className="text-slate-600 text-sm mb-6">Are you sure you want to delete this supporter? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {selectedSupporter && !editSupporter && (
        <Modal onClose={() => setSelectedSupporter(null)} wide>
          {detailLoading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-DEFAULT">{selectedSupporter.displayName}</h2>
                  <p className="text-sm text-slate-500">{selectedSupporter.supporterType}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[selectedSupporter.status] ?? ''}`}>
                  {selectedSupporter.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                <DetailRow label="Email" value={selectedSupporter.email} />
                <DetailRow label="Phone" value={selectedSupporter.phone} />
                <DetailRow label="Region" value={selectedSupporter.region} />
                <DetailRow label="Country" value={selectedSupporter.country} />
                <DetailRow label="Acquisition Channel" value={selectedSupporter.acquisitionChannel} />
                <DetailRow label="First Donation" value={selectedSupporter.firstDonationDate} />
              </div>

              <div className="border-t border-slate-100 pt-4 mb-4">
                <h3 className="text-sm font-semibold text-navy-DEFAULT mb-3">Donations ({selectedSupporter.donations?.length ?? 0})</h3>
                {selectedSupporter.donations?.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Type</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Date</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Value</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Campaign</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Recurring</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSupporter.donations.map((d) => (
                          <tr key={d.donationId}>
                            <td className="px-3 py-2 text-slate-700">{d.donationType}</td>
                            <td className="px-3 py-2 text-slate-600">{d.donationDate}</td>
                            <td className="px-3 py-2 text-slate-600">
                              {d.amount != null ? `${d.amount} ${d.impactUnit ?? ''}` : d.estimatedValue != null ? `${d.estimatedValue} ${d.impactUnit ?? ''}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{d.campaignName ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{d.isRecurring ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No donations recorded.</p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                <button onClick={() => setShowDonationModal(true)} className="px-4 py-2 text-sm font-medium text-safira-blue border border-safira-blue rounded-lg hover:bg-blue-50 transition-colors">+ Add Donation</button>
                <button onClick={() => setEditSupporter(selectedSupporter)} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Edit</button>
                <button onClick={() => setSelectedSupporter(null)} className="px-4 py-2 text-sm font-medium text-white bg-safira-blue hover:bg-safira-blue-dark rounded-lg transition-colors">Close</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Create/Edit modal */}
      {(showCreateModal || editSupporter) && (
        <SupporterFormModal
          existing={editSupporter}
          onClose={() => { setShowCreateModal(false); setEditSupporter(null) }}
          onSaved={() => { setShowCreateModal(false); setEditSupporter(null); fetchSupporters() }}
        />
      )}

      {/* Add donation modal */}
      {showDonationModal && selectedSupporter && (
        <DonationFormModal
          supporterId={selectedSupporter.supporterId}
          onClose={() => setShowDonationModal(false)}
          onSaved={() => { setShowDonationModal(false); openDetail(selectedSupporter.supporterId) }}
        />
      )}
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

// ── Supporter Form Modal ──────────────────────────────────────────────────────

interface SupporterFormModalProps {
  existing: SupporterDetail | null
  onClose: () => void
  onSaved: () => void
}

function SupporterFormModal({ existing, onClose, onSaved }: SupporterFormModalProps) {
  const [form, setForm] = useState({
    supporterType: existing?.supporterType ?? '',
    displayName: existing?.displayName ?? '',
    organizationName: existing?.organizationName ?? '',
    firstName: existing?.firstName ?? '',
    lastName: existing?.lastName ?? '',
    relationshipType: existing?.relationshipType ?? '',
    region: existing?.region ?? '',
    country: existing?.country ?? '',
    email: existing?.email ?? '',
    phone: existing?.phone ?? '',
    status: existing?.status ?? 'Active',
    acquisitionChannel: existing?.acquisitionChannel ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (existing) {
        await apiFetch(`/api/supporters/${existing.supporterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch('/api/supporters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
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
      <h2 className="text-lg font-bold text-navy-DEFAULT mb-4">{existing ? 'Edit Supporter' : 'Add Supporter'}</h2>
      <form onSubmit={handleSubmit}>
        <FormField label="Type">
          <select className={inputClass} value={form.supporterType} onChange={(e) => setForm({ ...form, supporterType: e.target.value })}>
            <option value="">Select type</option>
            <option value="MonetaryDonor">Monetary Donor</option>
            <option value="InKindDonor">In-Kind Donor</option>
            <option value="Volunteer">Volunteer</option>
            <option value="SocialMediaAdvocate">Social Media Advocate</option>
            <option value="SkillsContributor">Skills Contributor</option>
            <option value="PartnerOrganization">Partner Organization</option>
          </select>
        </FormField>
        <FormField label="Display Name">
          <input className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name">
            <input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </FormField>
          <FormField label="Last Name">
            <input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Organization">
          <input className={inputClass} value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Region">
            <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </FormField>
          <FormField label="Country">
            <input className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Email">
          <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label="Phone">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
        <FormField label="Acquisition Channel">
          <input className={inputClass} value={form.acquisitionChannel} onChange={(e) => setForm({ ...form, acquisitionChannel: e.target.value })} />
        </FormField>
        <FormField label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
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

// ── Donation Form Modal ───────────────────────────────────────────────────────

interface DonationFormModalProps {
  supporterId: number
  onClose: () => void
  onSaved: () => void
}

function DonationFormModal({ supporterId, onClose, onSaved }: DonationFormModalProps) {
  const [form, setForm] = useState({
    donationType: '',
    donationDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    campaignName: '',
    channelSource: '',
    currencyCode: 'PHP',
    amount: '',
    estimatedValue: '',
    impactUnit: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/supporters/${supporterId}/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: form.amount !== '' ? parseFloat(form.amount) : null,
          estimatedValue: form.estimatedValue !== '' ? parseFloat(form.estimatedValue) : null,
        }),
      })
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-navy-DEFAULT mb-4">Add Donation</h2>
      <form onSubmit={handleSubmit}>
        <FormField label="Type">
          <select className={inputClass} value={form.donationType} onChange={(e) => setForm({ ...form, donationType: e.target.value })} required>
            <option value="">Select type</option>
            <option value="Monetary">Monetary</option>
            <option value="InKind">In-Kind</option>
            <option value="Time">Time</option>
            <option value="Skills">Skills</option>
            <option value="SocialMedia">Social Media</option>
          </select>
        </FormField>
        <FormField label="Date">
          <input className={inputClass} type="date" value={form.donationDate} onChange={(e) => setForm({ ...form, donationDate: e.target.value })} required />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount">
            <input className={inputClass} type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </FormField>
          <FormField label="Estimated Value">
            <input className={inputClass} type="number" step="0.01" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Impact Unit">
            <input className={inputClass} value={form.impactUnit} onChange={(e) => setForm({ ...form, impactUnit: e.target.value })} placeholder="e.g. hours, pesos" />
          </FormField>
          <FormField label="Currency">
            <input className={inputClass} value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Campaign">
          <input className={inputClass} value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} />
        </FormField>
        <FormField label="Channel">
          <input className={inputClass} value={form.channelSource} onChange={(e) => setForm({ ...form, channelSource: e.target.value })} />
        </FormField>
        <FormField label="Notes">
          <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FormField>
        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded" />
          <label htmlFor="recurring" className="text-sm text-slate-700">Recurring donation</label>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-safira-blue hover:bg-safira-blue-dark rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Donation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
