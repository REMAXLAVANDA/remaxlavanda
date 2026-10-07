import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  calendarEvents as calendarProvider,
  callLogs as callLogsProvider,
  opportunities as opportunitiesProvider,
  users as usersProvider,
  league as leagueProvider,
  coachingNotes as coachingNotesProvider,
  education as educationProvider,
} from '../../lib/dataProvider'
import { computeHealthScore } from '../../lib/takip'
import { checklistProgress } from '../../lib/education'
import { isInactiveAgent } from '../../lib/attention'
import { canManageCoachingNotes } from '../../lib/roles'
import { buildYonlendirmeMap } from '../../lib/yonlendirme'
import HealthScoreTable from '../../components/takip/HealthScoreTable'
import HealthDetailModal from '../../components/takip/HealthDetailModal'
import YonlendirmeDurumuSection from '../../components/takip/YonlendirmeDurumuSection'
import KoclukRaporu from '../../components/takip/KoclukRaporu'
import FocusBanner from '../../components/common/FocusBanner'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

const CAN_SEE_TEAM_ROLES = ['broker', 'owner', 'ofis']

// Takip skoru, calendar/callLogs/users/league domain'lerinin kesişimidir —
// tek bir Promise.all ile hepsi birlikte yüklenir, tek loading/error
// durumu. Portal kullanımı ve müşteri memnuniyeti artık gerçek
// verilerden (son giriş zamanı, ciro_musterileri) hesaplanıyor — bkz.
// lib/takip.js.
//
// `opportunities` SADECE broker/owner için çekiliyor — danışman detay
// modalındaki "Fırsatlar ve Çağrı Kayıtları" bölümü (bkz. HealthDetailModal)
// sadece yönetime açık, ofis/danışman görmüyor, o yüzden onlara gereksiz
// veri çekmiyoruz (bkz. "yönetim olarak danışmanları filtreleyebilelim"
// isteği — önce Ayarlar'da ayrı bir sekmeydi, sonra Takip'e taşındı).
// `coachingNotes` SADECE broker/owner için çekiliyor — RLS'in zaten
// filtreleyeceği (ofis/danışman için boş dönen) bir sorguyu gereksiz yere
// yapmamak için (aynı sebep: `opportunities` ile paralel, bkz. yukarıdaki not).
// `checklistItems`/`checklistStatus` (2026-10-07 eklendi): broker'ın
// "checklist ilerlemesini danışman bloğunun içine ekleyelim" isteği —
// Sağlık Skoru tablosunda her danışmanın adının altında Checklist %'i de
// gösterilsin diye (bkz. HealthScoreTable).
async function loadAll(includeOpportunities, includeCoaching) {
  const [
    events,
    attendance,
    calls,
    activity,
    ciroMusterileri,
    users,
    ciroGirisleri,
    scores,
    periods,
    opportunities,
    coaching,
    checklistItems,
    checklistStatus,
  ] = await Promise.all([
    calendarProvider.list(),
    calendarProvider.listAttendance(),
    callLogsProvider.list(),
    usersProvider.listActivity(),
    leagueProvider.listCiroMusterileri(),
    usersProvider.listAll(),
    leagueProvider.listCiroGirisleri(),
    leagueProvider.listScores(),
    leagueProvider.listPeriods(),
    includeOpportunities ? opportunitiesProvider.list() : Promise.resolve([]),
    includeCoaching ? coachingNotesProvider.list() : Promise.resolve([]),
    educationProvider.listChecklistItems(),
    educationProvider.listChecklistStatus(),
  ])
  return {
    events,
    attendance,
    calls,
    activity,
    ciroMusterileri,
    users,
    ciroGirisleri,
    scores,
    periods,
    opportunities,
    coaching,
    checklistItems,
    checklistStatus,
  }
}

export default function TakipTab() {
  const { user, role } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { showToast } = useToast()
  const canSeeOpportunities = ['broker', 'owner'].includes(role)
  const canManageCoaching = canManageCoachingNotes(role)
  const { data, setData, loading, error, reload } = useAsyncList(
    () => loadAll(canSeeOpportunities, canManageCoaching),
    [canSeeOpportunities, canManageCoaching],
  )
  const [selectedId, setSelectedId] = useState(null)
  const [addingCoachingNote, setAddingCoachingNote] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const seeTeam = CAN_SEE_TEAM_ROLES.includes(role)

  // Panel'in "Dikkat Gerekiyor" bölümünden ?odak=1 ile gelindiğinde, SADECE
  // 7 günden uzun süredir giriş yapmayan danışmanları gösteriyoruz.
  const odakActive = searchParams.get('odak') === 'danisman'

  const people = useMemo(() => {
    if (!data) return []
    // Test hesabı sağlık skoru listesine karışmasın diye hariç tutuluyor
    // (bkz. Panel.jsx'teki aynı filtre).
    const list = seeTeam ? Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi) : [user]
    // İsim sırası yerine en yüksek sağlık skoru en üstte — broker/owner'ın
    // ilk bakışta kimin dikkat gerektirdiğini/öne çıktığını görmesi için.
    const rows = list
      .map((u) => ({
        user: u,
        ...computeHealthScore(u.id, data),
        checklistPercent: checklistProgress(u.id, 'baslangic', data.checklistItems, data.checklistStatus).percent,
      }))
      .sort((a, b) => b.score - a.score)
    if (!odakActive) return rows
    const lastSignInById = {}
    for (const a of data.activity) lastSignInById[a.userId] = a.lastSignInAt
    return rows.filter((p) => isInactiveAgent(lastSignInById[p.user.id]))
  }, [data, seeTeam, knownUsers, user, odakActive])

  // Yönlendirme Puanı — AYNI data bag'i (events/attendance/calls/activity/
  // users/ciroMusterileri/scores/periods), Sağlık Skoru için zaten yüklü,
  // yeni bir sorgu gerekmiyor (bkz. YonlendirmeDurumuSection notu).
  const yonlendirmeMap = useMemo(() => (data ? buildYonlendirmeMap(people.map((p) => p.user), data) : {}), [data, people])

  const selected = people.find((p) => p.user.id === selectedId)
  const selectedCoachingNotes = useMemo(
    () => (selected ? (data?.coaching ?? []).filter((n) => n.danismanId === selected.user.id) : []),
    [data, selected],
  )

  async function handleAddCoachingNote(danismanId, form) {
    setAddingCoachingNote(true)
    try {
      const created = await coachingNotesProvider.create({ ...form, danismanId, yazanId: user.id })
      setData((prev) => ({ ...prev, coaching: [created, ...(prev.coaching ?? [])] }))
      showToast('Koçluk notu kaydedildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Not kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setAddingCoachingNote(false)
    }
  }

  async function handleToggleCoachingDurum(id, durum, sonuc) {
    try {
      const updated = await coachingNotesProvider.update(id, { durum, sonuc: durum === 'tamamlandi' ? sonuc : null })
      setData((prev) => ({ ...prev, coaching: (prev.coaching ?? []).map((n) => (n.id === id ? updated : n)) }))
    } catch (err) {
      showToast(err.message ?? 'Durum güncellenemedi, tekrar dene.', 'error')
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-text-muted">{seeTeam ? 'Danışman 360° sağlık skoru' : 'Kendi performans özetin'}</p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && odakActive && (
        <FocusBanner
          text={`${people.length} danışman 7 günden uzun süredir portala girmedi — sadece bunlar gösteriliyor.`}
          onClear={() => setSearchParams({})}
        />
      )}

      {!loading && !error && (
        <YonlendirmeDurumuSection people={people} yonlendirmeMap={yonlendirmeMap} seeTeam={seeTeam} />
      )}

      {!loading && !error && canManageCoaching && <KoclukRaporu people={people} notes={data.coaching} />}

      {!loading && !error && <HealthScoreTable people={people} onRowClick={setSelectedId} />}

      {selected && (
        <HealthDetailModal
          user={selected.user}
          score={selected.score}
          status={selected.status}
          metrics={selected.metrics}
          onClose={() => setSelectedId(null)}
          canSeeOpportunities={canSeeOpportunities}
          opportunities={data.opportunities}
          calls={data.calls}
          canManageCoaching={canManageCoaching}
          coachingNotes={selectedCoachingNotes}
          onAddCoachingNote={handleAddCoachingNote}
          onToggleCoachingDurum={handleToggleCoachingDurum}
          addingCoachingNote={addingCoachingNote}
        />
      )}
    </div>
  )
}
