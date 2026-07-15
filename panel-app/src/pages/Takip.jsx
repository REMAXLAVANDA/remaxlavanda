import { useMemo, useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { KNOWN_USERS, userName } from '../lib/knownUsers'
import { computeHealthScore } from '../lib/takip'
import { MOCK_BROKER_NOTES } from '../data/mockTakip'
import HealthScoreRow from '../components/takip/HealthScoreRow'
import HealthDetailModal from '../components/takip/HealthDetailModal'

const CAN_SEE_TEAM_ROLES = ['broker', 'owner', 'ofis']

export default function Takip() {
  const { user, role } = useAuth()
  const [selectedId, setSelectedId] = useState(null)

  const seeTeam = CAN_SEE_TEAM_ROLES.includes(role)

  const people = useMemo(() => {
    const list = seeTeam
      ? Object.values(KNOWN_USERS).filter((u) => !u.role || u.role === 'danisman')
      : [user]
    return list.map((u) => ({ user: u, ...computeHealthScore(u.id) }))
  }, [seeTeam, user])

  const selected = people.find((p) => p.user.id === selectedId)

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <HeartPulse size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-900">Takip</h1>
          <p className="text-xs text-ink-400">
            {seeTeam ? 'Danışman 360° sağlık skoru' : 'Kendi performans özetin'}
          </p>
        </div>
      </div>

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

      {selected && (
        <HealthDetailModal
          user={selected.user}
          score={selected.score}
          status={selected.status}
          metrics={selected.metrics}
          notes={MOCK_BROKER_NOTES[selected.user.id] ?? []}
          resolveName={userName}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
