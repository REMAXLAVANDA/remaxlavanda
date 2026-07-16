import { useCallback, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { league as leagueProvider } from '../lib/dataProvider'
import { LEAGUE_CATEGORIES, rankingsFor } from '../lib/league'
import LeagueBoard from '../components/league/LeagueBoard'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

async function loadAll() {
  const [period, scores] = await Promise.all([leagueProvider.getPeriod(), leagueProvider.listScores()])
  return { period, scores }
}

export default function Lig() {
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [tab, setTab] = useState(LEAGUE_CATEGORIES[0].key)
  const category = LEAGUE_CATEGORIES.find((c) => c.key === tab)
  const userName = useCallback((id) => knownUsers[id]?.name ?? '—', [knownUsers])

  const rankings = useMemo(() => rankingsFor(tab, data?.scores ?? [], userName), [tab, data, userName])

  return (
    <div>
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Trophy size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-900">Lig</h1>
          <p className="text-xs text-ink-400">{data?.period?.ad ?? (loading ? 'Yükleniyor...' : '')}</p>
        </div>
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
    </div>
  )
}
