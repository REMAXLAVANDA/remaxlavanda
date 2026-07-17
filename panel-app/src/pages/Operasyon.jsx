import { useMemo, useState } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { callLogs as callLogsProvider } from '../lib/dataProvider'
import { canManageCalls, canViewCall, computeCallStats } from '../lib/callLogs'
import { isWithinRange } from '../lib/dateRange'
import CallTable from '../components/operasyon/CallTable'
import CallFilters from '../components/operasyon/CallFilters'
import StatsCards from '../components/operasyon/StatsCards'
import NewCallModal from '../components/operasyon/NewCallModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const INITIAL_FILTERS = { search: '', kaynak: 'tumu', dateRange: '7g', customFrom: '', customTo: '' }

export default function Operasyon() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data: calls, setData: setCalls, loading, error, reload } = useAsyncList(
    () => callLogsProvider.list(),
    [],
  )
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isManager = canManageCalls(role)
  const userName = (id) => knownUsers[id]?.name ?? '—'

  const visible = useMemo(() => {
    return (calls ?? [])
      .filter((c) => canViewCall(c, user))
      .filter((c) => filters.kaynak === 'tumu' || c.kaynak === filters.kaynak)
      .filter((c) => isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .filter((c) => !filters.search.trim() || c.arayanAd.toLowerCase().includes(filters.search.trim().toLowerCase()))
      .sort((a, b) => {
        if (a.donusYapildiMi !== b.donusYapildiMi) return a.donusYapildiMi ? 1 : -1
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
  }, [calls, user, filters])

  const stats = useMemo(() => computeCallStats(visible), [visible])

  const inviteeOptions = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')

  async function updateCall(id, patch) {
    try {
      const updated = await callLogsProvider.update(id, patch)
      setCalls((prev) => prev.map((c) => (c.id === id ? updated : c)))
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
    const call = (calls ?? []).find((c) => c.id === id)
    const patch = { [field]: !call[field] }
    if (field === 'donusYapildiMi') patch.donusAt = patch.donusYapildiMi ? new Date().toISOString() : null
    updateCall(id, patch)
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const created = await callLogsProvider.create(form)
      setCalls((prev) => [created, ...prev])
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
            <h1 className="text-base font-semibold text-ink-900">{isManager ? 'Operasyon' : 'Sana Atanan Çağrılar'}</h1>
            <p className="text-xs text-ink-400">
              {isManager ? 'Sponsorlu reklam ve çağrı kayıtları' : 'Santralden sana yönlendirilen çağrılar'}
            </p>
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

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="mb-5">
            <StatsCards stats={stats} />
          </div>

          <div className="mb-5">
            <CallFilters filters={filters} onChange={setFilters} />
          </div>

          <CallTable
            calls={visible}
            currentUserId={user.id}
            isManager={isManager}
            inviteeOptions={inviteeOptions}
            resolveName={userName}
            onAssign={handleAssign}
            onSetResult={handleSetResult}
            onToggle={handleToggle}
          />
        </>
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
