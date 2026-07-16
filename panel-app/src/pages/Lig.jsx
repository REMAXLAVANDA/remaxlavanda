import { useCallback, useMemo, useState } from 'react'
import { Trophy, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { league as leagueProvider } from '../lib/dataProvider'
import { LEAGUE_CATEGORIES, canManageScores, rankingsFor } from '../lib/league'
import LeagueBoard from '../components/league/LeagueBoard'
import AddScoreModal from '../components/league/AddScoreModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

async function loadAll() {
  const [period, scores] = await Promise.all([leagueProvider.getPeriod(), leagueProvider.listScores()])
  return { period, scores }
}

export default function Lig() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [tab, setTab] = useState(LEAGUE_CATEGORIES[0].key)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const category = LEAGUE_CATEGORIES.find((c) => c.key === tab)
  const userName = useCallback((id) => knownUsers[id]?.name ?? '—', [knownUsers])
  const isManager = canManageScores(role)

  const rankings = useMemo(() => rankingsFor(tab, data?.scores ?? [], userName), [tab, data, userName])
  const danismanOptions = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')

  async function handleAddScore(form) {
    setSubmitting(true)
    try {
      await leagueProvider.addScore({ ...form, periodId: data.period.id }, user.id)
      setShowModal(false)
      showToast('Skor kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Skor kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Lig</h1>
            <p className="text-xs text-ink-400">{data?.period?.ad ?? (loading ? 'Yükleniyor...' : '')}</p>
          </div>
        </div>
        {isManager && !loading && !error && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Skor Gir
          </button>
        )}
      </div>

      <div className="my-5 flex gap-1 border-b border-ink-100">
        {LEAGUE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === c.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && <LeagueBoard rankings={rankings} unit={category.unit} />}

      {showModal && (
        <AddScoreModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddScore}
          submitting={submitting}
          danismanOptions={danismanOptions}
          defaultType={tab}
        />
      )}
    </div>
  )
}
