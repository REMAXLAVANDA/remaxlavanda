import { useMemo, useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { MOCK_CALLS } from '../data/mockCallLogs'
import { canManageCalls, canViewCall, computeCallStats } from '../lib/callLogs'
import { isWithinRange } from '../lib/dateRange'
import { KNOWN_USERS, userName } from '../lib/knownUsers'
import CallCard from '../components/operasyon/CallCard'
import CallFilters from '../components/operasyon/CallFilters'
import StatsCards from '../components/operasyon/StatsCards'
import NewCallModal from '../components/operasyon/NewCallModal'
import { mutate } from '../lib/api'

const INITIAL_FILTERS = { search: '', kaynak: 'tumu', dateRange: '30g', customFrom: '', customTo: '' }

export default function Operasyon() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [calls, setCalls] = useState(MOCK_CALLS)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isManager = canManageCalls(role)

  const visible = useMemo(() => {
    return calls
      .filter((c) => canViewCall(c, user))
      .filter((c) => filters.kaynak === 'tumu' || c.kaynak === filters.kaynak)
      .filter((c) => isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .filter((c) => !filters.search.trim() || c.arayanAd.toLowerCase().includes(filters.search.trim().toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [calls, user, filters])

  const stats = useMemo(() => computeCallStats(visible), [visible])

  const inviteeOptions = Object.values(KNOWN_USERS).filter((u) => !u.role || u.role === 'danisman')

  async function updateCall(id, patch) {
    try {
      await mutate('call_logs.update', { id, ...patch })
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    } catch (err) {
      showToast(err.message ?? 'Çağrı güncellenemedi, tekrar dene.', 'error')
    }
  }

  function handleAssign(id, assignedTo) {
    updateCall(id, { assignedTo })
  }

  function handleSetResult(id, sonuc) {
    updateCall(id, { sonuc })
  }

  function handleToggle(id, field) {
    const call = calls.find((c) => c.id === id)
    const patch = { [field]: !call[field] }
    if (field === 'donusYapildiMi') patch.donusAt = patch.donusYapildiMi ? new Date().toISOString() : null
    updateCall(id, patch)
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      await mutate('call_logs.create', form)
      setCalls((prev) => [
        {
          id: `call-${Date.now()}`,
          kaynak: form.kaynak,
          arayanAd: form.arayanAd,
          arayanTelefon: form.arayanTelefon,
          assignedTo: form.assignedTo,
          sonuc: null,
          portfoyAlindiMi: false,
          donusYapildiMi: false,
          donusAt: null,
          opportunityId: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setShowModal(false)
      showToast('Çağrı kaydedildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Çağrı kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Wrench size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Operasyon</h1>
            <p className="text-xs text-ink-400">Sponsorlu reklam ve çağrı kayıtları</p>
          </div>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Çağrı
          </button>
        )}
      </div>

      <div className="mb-5">
        <StatsCards stats={stats} />
      </div>

      <div className="mb-5">
        <CallFilters filters={filters} onChange={setFilters} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
          Bu filtrelere uyan çağrı yok.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              assignedName={call.assignedTo ? userName(call.assignedTo) : null}
              isManager={isManager}
              inviteeOptions={inviteeOptions}
              onAssign={(id) => handleAssign(call.id, id)}
              onSetResult={(sonuc) => handleSetResult(call.id, sonuc)}
              onToggle={(field) => handleToggle(call.id, field)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewCallModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          inviteeOptions={inviteeOptions}
        />
      )}
    </div>
  )
}
