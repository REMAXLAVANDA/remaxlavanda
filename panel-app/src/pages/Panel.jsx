import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, PhoneCall, Inbox, Target, CalendarDays, GraduationCap, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import {
  callLogs as callLogsProvider,
  opportunities as opportunitiesProvider,
  calendarEvents as calendarProvider,
  education as educationProvider,
  league as leagueProvider,
} from '../lib/dataProvider'
import { canManageCalls, maskPhone } from '../lib/callLogs'
import { canViewEvent, formatEventDate, formatEventTime, EVENT_TYPE_LABELS } from '../lib/calendar'
import { moduleProgressFor, checklistProgress } from '../lib/education'
import { formatPrice } from '../lib/opportunities'
import { categoryLabel } from '../lib/categories'
import { LEAGUE_CATEGORIES, latestUpdate, rankingsFor } from '../lib/league'
import { relativeTime } from '../lib/format'
import { LoadingState, ErrorState } from '../components/common/AsyncState'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'

const EDUCATION_MANAGE_ROLES = ['broker', 'owner']

async function loadAll() {
  const [calls, opps, events, attendance, modules, progress, checklistItems, checklistStatus, periods, scores] =
    await Promise.all([
      callLogsProvider.list(),
      opportunitiesProvider.list(),
      calendarProvider.list(),
      calendarProvider.listAttendance(),
      educationProvider.listModules(),
      educationProvider.listProgress(),
      educationProvider.listChecklistItems(),
      educationProvider.listChecklistStatus(),
      leagueProvider.listPeriods(),
      leagueProvider.listScores(),
    ])
  return { calls, opps, events, attendance, modules, progress, checklistItems, checklistStatus, periods, scores }
}

function Widget({ icon: Icon, title, count, description, to, linkLabel, className = '', children }) {
  return (
    <div className={`rounded-2xl border border-ink-100 bg-white p-5 ${className}`}>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {count > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{count}</span>
          )}
        </div>
        {to && (
          <Link to={to} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            {linkLabel} →
          </Link>
        )}
      </div>
      {description && <p className="mb-4 text-xs text-ink-400">{description}</p>}
      {children}
    </div>
  )
}

function EmptyRow({ text }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-6 text-sm text-ink-400">
      <Inbox size={16} /> {text}
    </div>
  )
}

// Panel'deki "Açık Fırsatlar" satırı — tek bakışta ne olduğu belli olsun
// diye kategori/konum/fiyat/tarih tek satırda yan yana gösterilir (tür
// rozeti YOK, zaten satıcı/alıcı bloğuna göre ayrılmış durumda).
function OpportunityMiniRow({ o }) {
  const priceLabel =
    o.type === 'alici' && (o.fiyatMin || o.fiyatMax)
      ? `${formatPrice(o.fiyatMin)} – ${formatPrice(o.fiyatMax)}`
      : formatPrice(o.fiyat)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          {categoryLabel(o.category)}
        </span>
        <span className="truncate text-sm font-medium text-ink-900">{o.konum ?? '—'}</span>
      </div>
      <div className="shrink-0 whitespace-nowrap text-right text-xs">
        <span className="font-medium text-ink-700">{priceLabel}</span>
        <span className="ml-2 text-ink-400">{relativeTime(o.createdAt)}</span>
      </div>
    </div>
  )
}

// Satıcı/Alıcı ayrı blok halinde gösterilsin diye tek bir liste bileşeni.
function OpportunityMiniBlock({ dotColor, label, items }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <h3 className="text-xs font-semibold text-ink-500">
          {label} <span className="font-normal text-ink-300">({items.length})</span>
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-ink-50 px-3 py-4 text-center text-xs text-ink-400">Yok</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 4).map((o) => (
            <OpportunityMiniRow key={o.id} o={o} />
          ))}
          {items.length > 4 && <p className="pt-0.5 text-center text-xs text-ink-400">+{items.length - 4} tane daha</p>}
        </div>
      )}
    </div>
  )
}

export default function Panel() {
  const { user, role } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const isManager = canManageCalls(role)
  const isEducationManager = EDUCATION_MANAGE_ROLES.includes(role)
  const teamMembers = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')

  // --- Operasyon: atanmamış (yönetim) / sana atanan dönüşü bekleyen (danışman) ---
  const pendingCalls = useMemo(() => {
    if (!data) return []
    const list = isManager
      ? data.calls.filter((c) => !c.assignedTo)
      : data.calls.filter((c) => c.assignedTo === user.id && !c.donusYapildiMi)
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data, isManager, user.id])

  // --- Fırsatlar: havuzdaki (henüz kimsenin almadığı) açık fırsatlar —
  // satıcı/alıcı ayrı bloklarda gösterilsin diye ayrı listeleniyor.
  const openOpportunities = useMemo(() => {
    if (!data) return []
    return data.opps
      .filter((o) => o.status === 'acik')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data])
  const openSatici = useMemo(() => openOpportunities.filter((o) => o.type === 'satici'), [openOpportunities])
  const openAlici = useMemo(() => openOpportunities.filter((o) => o.type === 'alici'), [openOpportunities])

  // --- Takvim: önümüzdeki 48 saat içindeki (görebildiğin) etkinlikler ---
  const upcomingEvents = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    const in48h = now + 48 * 60 * 60 * 1000
    return data.events
      .filter((e) => canViewEvent(e, user, data.attendance))
      .filter((e) => {
        const t = new Date(e.startAt).getTime()
        return t >= now && t <= in48h
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  }, [data, user])

  // --- Eğitim/Checklist: eksik olanlar (yönetim: ekip, danışman: kendisi) ---
  const educationGaps = useMemo(() => {
    if (!data) return []
    const subjects = isEducationManager ? teamMembers : [user]
    return subjects
      .map((u) => {
        const mp = moduleProgressFor(u.id, data.modules, data.progress)
        const cp = checklistProgress(u.id, 'baslangic', data.checklistItems, data.checklistStatus)
        return { id: u.id, name: u.name ?? user.name, modulePercent: mp.percent, checklistPercent: cp.percent }
      })
      .filter((r) => r.modulePercent < 100 || r.checklistPercent < 100)
      .sort((a, b) => a.modulePercent + a.checklistPercent - (b.modulePercent + b.checklistPercent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isEducationManager, teamMembers, user])

  // --- Lig: en güncel dönemin üç kategorisindeki sıralama + son güncelleme ---
  const resolveUserName = useMemo(() => (id) => knownUsers[id]?.name ?? '—', [knownUsers])
  const activePeriod = data?.periods?.[0] ?? null
  const periodScores = useMemo(
    () => (data?.scores ?? []).filter((s) => s.periodId === activePeriod?.id),
    [data, activePeriod],
  )
  const rankingsByCategory = useMemo(() => {
    const map = {}
    for (const c of LEAGUE_CATEGORIES) map[c.key] = rankingsFor(c.key, periodScores, resolveUserName)
    return map
  }, [periodScores, resolveUserName])
  const lastLeagueUpdate = useMemo(() => latestUpdate(periodScores), [periodScores])

  const callTitle = isManager ? 'Atanmamış Çağrılar' : 'Sana Atanan Çağrılar'
  const callDescription = isManager
    ? 'Henüz bir danışmana atanmamış, dağıtım bekleyen çağrılar'
    : 'Santralden sana yönlendirilen, dönüş yapman gereken çağrılar'

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-900">Panel</h1>
          <p className="text-xs text-ink-400">Ofiste şu an neler oluyor</p>
        </div>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 md:grid-flow-row-dense">
          <Widget
            icon={PhoneCall}
            title={callTitle}
            count={pendingCalls.length}
            description={callDescription}
            to="/operasyon"
            linkLabel="Operasyon'a git"
          >
            {pendingCalls.length === 0 ? (
              <EmptyRow text="Bekleyen çağrı yok, harika!" />
            ) : (
              <div className="space-y-2">
                {pendingCalls.slice(0, 5).map((call) => (
                  <div key={call.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{call.arayanAd}</p>
                      <p className="text-xs text-ink-400">
                        {call.kaynak} · {maskPhone(call.arayanTelefon)}
                      </p>
                    </div>
                    <span className="text-xs text-ink-400">{relativeTime(call.createdAt)}</span>
                  </div>
                ))}
                {pendingCalls.length > 5 && (
                  <p className="pt-1 text-center text-xs text-ink-400">+{pendingCalls.length - 5} tane daha</p>
                )}
              </div>
            )}
          </Widget>

          <Widget
            icon={Target}
            title="Açık Fırsatlar"
            count={openOpportunities.length}
            description="Havuzda henüz kimsenin almadığı fırsatlar"
            to="/firsatlar"
            linkLabel="Fırsatlar'a git"
            className="md:col-span-2"
          >
            {openOpportunities.length === 0 ? (
              <EmptyRow text="Havuzda bekleyen fırsat yok." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <OpportunityMiniBlock dotColor="bg-emerald-500" label="Satıcılar" items={openSatici} />
                <OpportunityMiniBlock dotColor="bg-blue-500" label="Alıcılar" items={openAlici} />
              </div>
            )}
          </Widget>

          <Widget
            icon={CalendarDays}
            title="Yaklaşan Etkinlikler"
            count={upcomingEvents.length}
            description="Önümüzdeki 48 saat"
            to="/takvim"
            linkLabel="Takvim'e git"
          >
            {upcomingEvents.length === 0 ? (
              <EmptyRow text="Önümüzdeki 48 saatte etkinlik yok." />
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{e.title}</p>
                      <p className="text-xs text-ink-400">
                        {EVENT_TYPE_LABELS[e.type]} · {formatEventDate(e.startAt)} {formatEventTime(e.startAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Widget>

          <Widget
            icon={GraduationCap}
            title={isEducationManager ? 'Eksik Eğitim / Checklist' : 'Eğitim / Checklist Durumun'}
            count={isEducationManager ? educationGaps.length : 0}
            description={
              isEducationManager
                ? 'Modül veya checklist tamamlama %100 altında olanlar'
                : 'Modül ve checklist tamamlama oranın'
            }
            to="/egitim"
            linkLabel="Eğitim'e git"
          >
            {educationGaps.length === 0 ? (
              <EmptyRow text={isEducationManager ? 'Herkes tamamlamış, harika!' : 'Her şeyi tamamladın!'} />
            ) : (
              <div className="space-y-2">
                {educationGaps.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                    <p className="text-sm font-medium text-ink-900">{r.name}</p>
                    <span className="text-xs text-ink-400">
                      Modül %{r.modulePercent} · Checklist %{r.checklistPercent}
                    </span>
                  </div>
                ))}
                {educationGaps.length > 5 && (
                  <p className="pt-1 text-center text-xs text-ink-400">+{educationGaps.length - 5} tane daha</p>
                )}
              </div>
            )}
          </Widget>

          <Widget
            icon={Trophy}
            title="Lig Durumu"
            description={activePeriod ? activePeriod.ad : 'Henüz bir dönem oluşturulmamış'}
            to="/lig"
            linkLabel="Lig'e git"
            className="md:col-span-2"
          >
            {!activePeriod ? (
              <EmptyRow text="Henüz bir Lig dönemi oluşturulmamış." />
            ) : (
              <>
                <PeriodSummaryBoard categories={LEAGUE_CATEGORIES} rankingsByCategory={rankingsByCategory} />
                <p className="text-xs text-ink-400">
                  {lastLeagueUpdate
                    ? `Son güncelleme: ${relativeTime(lastLeagueUpdate)}`
                    : 'Bu dönemde henüz veri girilmedi.'}
                </p>
              </>
            )}
          </Widget>
        </div>
      )}
    </div>
  )
}
