import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  education as educationProvider,
  calendarEvents as calendarProvider,
  callLogs as callLogsProvider,
  takip as takipProvider,
  users as usersProvider,
  league as leagueProvider,
} from '../../lib/dataProvider'
import { computeHealthScore } from '../../lib/takip'
import { isInactiveAgent } from '../../lib/attention'
import HealthScoreRow from '../../components/takip/HealthScoreRow'
import HealthDetailModal from '../../components/takip/HealthDetailModal'
import FocusBanner from '../../components/common/FocusBanner'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

const CAN_SEE_TEAM_ROLES = ['broker', 'owner', 'ofis']

// Takip skoru, education/calendar/callLogs/users/league domain'lerinin
// kesişimidir — tek bir Promise.all ile hepsi birlikte yüklenir, tek
// loading/error durumu. Portal kullanımı ve müşteri memnuniyeti artık
// gerçek verilerden (son giriş zamanı, ciro_musterileri) hesaplanıyor —
// bkz. lib/takip.js.
async function loadAll() {
  const [modules, progress, events, attendance, calls, activity, ciroMusterileri, brokerNotes, users, ciroGirisleri, scores, periods] =
    await Promise.all([
      educationProvider.listModules(),
      educationProvider.listProgress(),
      calendarProvider.list(),
      calendarProvider.listAttendance(),
      callLogsProvider.list(),
      usersProvider.listActivity(),
      leagueProvider.listCiroMusterileri(),
      takipProvider.listBrokerNotes(),
      usersProvider.listAll(),
      leagueProvider.listCiroGirisleri(),
      leagueProvider.listScores(),
      leagueProvider.listPeriods(),
    ])
  return { modules, progress, events, attendance, calls, activity, ciroMusterileri, brokerNotes, users, ciroGirisleri, scores, periods }
}

export default function TakipTab() {
  const { user, role } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [selectedId, setSelectedId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const seeTeam = CAN_SEE_TEAM_ROLES.includes(role)
  const userName = (id) => knownUsers[id]?.name ?? '—'

  // Panel'in "Dikkat Gerekiyor" bölümünden ?odak=1 ile gelindiğinde, SADECE
  // 7 günden uzun süredir giriş yapmayan danışmanları gösteriyoruz.
  const odakActive = searchParams.get('odak') === 'danisman'

  const people = useMemo(() => {
    if (!data) return []
    const list = seeTeam ? Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman') : [user]
    const rows = list.map((u) => ({ user: u, ...computeHealthScore(u.id, data) }))
    if (!odakActive) return rows
    const lastSignInById = {}
    for (const a of data.activity) lastSignInById[a.userId] = a.lastSignInAt
    return rows.filter((p) => isInactiveAgent(lastSignInById[p.user.id]))
  }, [data, seeTeam, knownUsers, user, odakActive])

  const selected = people.find((p) => p.user.id === selectedId)

  return (
    <div>
      <p className="mb-3 text-xs text-ink-400">{seeTeam ? 'Danışman 360° sağlık skoru' : 'Kendi performans özetin'}</p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && odakActive && (
        <FocusBanner
          text={`${people.length} danışman 7 günden uzun süredir portala girmedi — sadece bunlar gösteriliyor.`}
          onClear={() => setSearchParams({})}
        />
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {people.map((p) => (
            <HealthScoreRow
              key={p.user.id}
              user={p.user}
              score={p.score}
              status={p.status}
              onClick={() => setSelectedId(p.user.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <HealthDetailModal
          user={selected.user}
          score={selected.score}
          status={selected.status}
          metrics={selected.metrics}
          notes={data.brokerNotes[selected.user.id] ?? []}
          resolveName={userName}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
