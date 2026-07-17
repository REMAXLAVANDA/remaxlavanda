import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, PhoneCall, Inbox, Target, CalendarDays, GraduationCap, Trophy, Users as UsersIcon, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import {
  callLogs as callLogsProvider,
  opportunities as opportunitiesProvider,
  calendarEvents as calendarProvider,
  education as educationProvider,
  league as leagueProvider,
  users as usersProvider,
} from '../lib/dataProvider'
import { canManageCalls, maskPhone } from '../lib/callLogs'
import { ROLES } from '../lib/roles'
import { canViewEvent, formatEventDate, formatEventTime, EVENT_TYPE_LABELS } from '../lib/calendar'
import { moduleProgressFor, checklistProgress } from '../lib/education'
import { formatPrice } from '../lib/opportunities'
import { categoryLabel } from '../lib/categories'
import { LEAGUE_CATEGORIES, latestUpdate, rankingsFor } from '../lib/league'
import { DATE_RANGES, isWithinRange } from '../lib/dateRange'
import { relativeTime } from '../lib/format'
import { LoadingState, ErrorState } from '../components/common/AsyncState'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'
import DateRangeFilter from '../components/common/DateRangeFilter'

const EDUCATION_MANAGE_ROLES = ['broker', 'owner']
const INITIAL_FILTERS = { dateRange: '7g', customFrom: '', customTo: '' }

async function loadAll() {
  const [calls, opps, events, attendance, modules, progress, checklistItems, checklistStatus, periods, scores, activity] =
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
      usersProvider.listActivity(),
    ])
  return { calls, opps, events, attendance, modules, progress, checklistItems, checklistStatus, periods, scores, activity }
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

// Broker'ın istediği "rapor odaklı" özet kartları — büyük sayı + kısa
// dağılım, tıklanınca ilgili modüle götürüyor. Aşağıdaki liste widget'ları
// "kim/ne" sorusuna cevap veriyor, bu kartlar "kaç tane" sorusuna.
function StatCard({ icon: Icon, to, label, value, detail }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-ink-100 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="mb-2 flex items-center gap-2 text-ink-400">
        <Icon size={16} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-ink-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-500">{detail}</p>}
    </Link>
  )
}

// "Dikkat Gerekiyor" satırı — broker/owner'ın sabah ilk açtığında görmesi
// gereken, müdahale gerektirebilecek istisnalar. Bilerek müşteri ismi/
// telefonu YOK — sadece sayı + genel özet, detay ilgili sayfada.
function AttentionRow({ icon: Icon, text, to }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 transition-colors hover:bg-amber-100"
    >
      <div className="flex items-center gap-2.5">
        <Icon size={16} className="shrink-0 text-amber-600" />
        <span className="text-sm font-medium text-ink-900">{text}</span>
      </div>
      <span className="shrink-0 text-xs font-medium text-amber-700">İncele →</span>
    </Link>
  )
}

// Panel'deki "Açık Fırsatlar" satırı — tek bakışta ne olduğu belli olsun diye
// kategori/mahalle/detay(oda-m²)/fiyat/tarih tek satırda yan yana gösterilir
// (tür rozeti YOK, zaten satıcı/alıcı bloğuna göre ayrılmış durumda). İl/ilçe
// bilgisi bilerek yok — hepsi aynı bölgede olduğu için ayırt edici değil,
// mahalle ve oda sayısı/m² gibi detaylar çok daha anlamlı.
function OpportunityMiniRow({ o }) {
  const priceLabel =
    o.type === 'alici' && (o.fiyatMin || o.fiyatMax)
      ? `${formatPrice(o.fiyatMin)} – ${formatPrice(o.fiyatMax)}`
      : formatPrice(o.fiyat)
  const detailBits = [o.odaSayisi, o.m2 ? `${o.m2} m²` : null].filter(Boolean)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          {categoryLabel(o.category)}
        </span>
        <span className="truncate text-sm font-medium text-ink-900">{o.konum ?? '—'}</span>
        {detailBits.length > 0 && (
          <span className="shrink-0 text-xs text-ink-400">{detailBits.join(' · ')}</span>
        )}
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
  const isDanisman = role === ROLES.DANISMAN
  // Broker ve owner ikisi de "rapor odaklı" paneli görür — owner sadece
  // izler/müdahale etmez ama görebildiği detay broker ile aynı genişlikte
  // olmalı (kullanıcının tanımı: en yüksek görüntüleme yetkisi, sıfır
  // müdahale). Panel zaten salt-okunur bir özet olduğu için burada ek bir
  // kısıtlamaya gerek yok — asıl "müdahale edememe" ilgili sayfaların
  // (Operasyon/Fırsatlar/Ayarlar vb.) kendi RLS'lerinde uygulanıyor.
  const isBrokerOrOwner = role === ROLES.BROKER || role === ROLES.OWNER
  const isEducationManager = EDUCATION_MANAGE_ROLES.includes(role)
  const teamMembers = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')
  // Panel'in üstündeki tek tarih filtresi — dört rol için de aynı, varsayılan
  // her zaman "7 gün" (bkz. INITIAL_FILTERS). Operasyon/Fırsatlar listeleri
  // ve broker'ın özet kartları buna göre daralıyor.
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const selectedRange = DATE_RANGES.find((r) => r.key === filters.dateRange)
  const upcomingLabel = filters.dateRange === 'tumu' ? 'Tüm yaklaşan etkinlikler' : `Önümüzdeki ${selectedRange?.label ?? '7 gün'}`

  // --- Operasyon: atanmamış (yönetim) / sana atanan dönüşü bekleyen (danışman) ---
  const pendingCalls = useMemo(() => {
    if (!data) return []
    const list = isManager
      ? data.calls.filter((c) => !c.assignedTo)
      : data.calls.filter((c) => c.assignedTo === user.id && !c.donusYapildiMi)
    return list
      .filter((c) => isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data, isManager, user.id, filters])

  // --- Fırsatlar: havuzdaki (henüz kimsenin almadığı) açık fırsatlar —
  // satıcı/alıcı ayrı bloklarda gösterilsin diye ayrı listeleniyor.
  const openOpportunities = useMemo(() => {
    if (!data) return []
    return data.opps
      .filter((o) => o.status === 'acik')
      .filter((o) => isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data, filters])
  const openSatici = useMemo(() => openOpportunities.filter((o) => o.type === 'satici'), [openOpportunities])
  const openAlici = useMemo(() => openOpportunities.filter((o) => o.type === 'alici'), [openOpportunities])

  // --- Takvim: seçilen aralık kadar İLERİYE bakan (görebildiğin) etkinlikler
  // — diğerleri geriye bakıyor (ne zaman girildi), takvim doğası gereği
  // ileriye bakıyor ama aynı "7 gün" varsayılanını paylaşıyor.
  const upcomingEvents = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    let windowEnd
    if (filters.dateRange === 'tumu') {
      windowEnd = Infinity
    } else if (filters.dateRange === 'ozel' && filters.customTo) {
      windowEnd = new Date(filters.customTo).getTime() + 24 * 60 * 60 * 1000 - 1
    } else if (selectedRange?.days) {
      windowEnd = now + selectedRange.days * 24 * 60 * 60 * 1000
    } else {
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59)
      windowEnd = endOfYear.getTime()
    }
    return data.events
      .filter((e) => canViewEvent(e, user, data.attendance))
      .filter((e) => {
        const t = new Date(e.startAt).getTime()
        return t >= now && t <= windowEnd
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  }, [data, user, filters, selectedRange])

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

  // --- Broker raporu: Operasyon/Fırsatlar özet sayıları (bkz. StatCard) —
  // üstteki tarih filtresine göre daralıyor, panelin geri kalanıyla tutarlı.
  const callStats = useMemo(() => {
    if (!data) return { total: 0, assigned: 0, donusYapildi: 0, donusYapilmadi: 0 }
    const inRange = data.calls.filter((c) =>
      isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo),
    )
    const total = inRange.length
    const assigned = inRange.filter((c) => c.assignedTo).length
    const donusYapildi = inRange.filter((c) => c.assignedTo && c.donusYapildiMi).length
    const donusYapilmadi = inRange.filter((c) => c.assignedTo && !c.donusYapildiMi).length
    return { total, assigned, donusYapildi, donusYapilmadi }
  }, [data, filters])

  const opportunityStats = useMemo(() => {
    if (!data) return { total: 0, satici: 0, alici: 0 }
    const inRange = data.opps.filter((o) =>
      isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo),
    )
    const total = inRange.length
    const satici = inRange.filter((o) => o.type === 'satici').length
    const alici = inRange.filter((o) => o.type === 'alici').length
    return { total, satici, alici }
  }, [data, filters])

  // --- Broker raporu: portalı en çok/en az kullanan (Supabase Auth'un
  // gerçekten tuttuğu son giriş zamanına göre — mock/uydurma veri değil).
  // Sadece danışmanlar sıralanıyor, Takip'in ekip kapsamıyla aynı.
  const activityRanking = useMemo(() => {
    if (!data) return []
    const byUserId = {}
    for (const a of data.activity) byUserId[a.userId] = a.lastSignInAt
    return teamMembers
      .map((u) => ({ id: u.id, name: u.name, lastSignInAt: byUserId[u.id] ?? null }))
      .sort((a, b) => {
        if (!a.lastSignInAt && !b.lastSignInAt) return 0
        if (!a.lastSignInAt) return 1
        if (!b.lastSignInAt) return -1
        return new Date(b.lastSignInAt) - new Date(a.lastSignInAt)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, teamMembers])

  // --- Broker/owner raporu: "Dikkat Gerekiyor" — sabah ilk bakışta görülmesi
  // gereken istisnalar. Tarih filtresinden BAĞIMSIZ (gecikme/durgunluk her
  // zaman güncel olmalı, seçilen rapor aralığına göre değişmemeli).
  const attentionItems = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    const items = []

    const staleReturns = data.calls.filter(
      (c) => c.assignedTo && !c.donusYapildiMi && now - new Date(c.createdAt).getTime() > 2 * 24 * 60 * 60 * 1000,
    )
    if (staleReturns.length > 0) {
      items.push({
        id: 'stale-returns',
        icon: PhoneCall,
        to: '/operasyon',
        text: `${staleReturns.length} çağrıda 2 günden uzun süredir dönüş yapılmadı`,
      })
    }

    const staleOpps = data.opps.filter(
      (o) => o.status === 'acik' && now - new Date(o.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000,
    )
    if (staleOpps.length > 0) {
      items.push({
        id: 'stale-opps',
        icon: Target,
        to: '/firsatlar',
        text: `${staleOpps.length} fırsat 3 günden uzun süredir havuzda bekliyor`,
      })
    }

    const inactiveAgents = activityRanking.filter(
      (r) => !r.lastSignInAt || now - new Date(r.lastSignInAt).getTime() > 7 * 24 * 60 * 60 * 1000,
    )
    if (inactiveAgents.length > 0) {
      items.push({
        id: 'inactive-agents',
        icon: UsersIcon,
        to: '/takip',
        text: `${inactiveAgents.length} danışman 7 günden uzun süredir portala girmedi`,
      })
    }

    const behindEducation = educationGaps.filter((r) => r.modulePercent < 50 || r.checklistPercent < 50)
    if (behindEducation.length > 0) {
      items.push({
        id: 'behind-education',
        icon: GraduationCap,
        to: '/egitim',
        text: `${behindEducation.length} danışmanın eğitim/checklist tamamlama oranı %50'nin altında`,
      })
    }

    return items
  }, [data, activityRanking, educationGaps])

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

      <div className="mb-5">
        <DateRangeFilter value={filters} onChange={setFilters} />
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && isBrokerOrOwner && attentionItems.length > 0 && (
        <div className="mb-5 space-y-1.5">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <AlertTriangle size={14} /> Dikkat Gerekiyor
          </h2>
          {attentionItems.map((item) => (
            <AttentionRow key={item.id} icon={item.icon} text={item.text} to={item.to} />
          ))}
        </div>
      )}

      {!loading && !error && isBrokerOrOwner && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={PhoneCall}
            to="/operasyon"
            label="Operasyon"
            value={callStats.total}
            detail={`${callStats.assigned} atandı · ${callStats.donusYapildi} dönüş yapıldı · ${callStats.donusYapilmadi} bekliyor`}
          />
          <StatCard
            icon={Target}
            to="/firsatlar"
            label="Fırsatlar / Portföy"
            value={opportunityStats.total}
            detail={`${opportunityStats.satici} satıcı · ${opportunityStats.alici} alıcı adayı`}
          />
          <StatCard
            icon={CalendarDays}
            to="/takvim"
            label="Yaklaşan Etkinlikler"
            value={upcomingEvents.length}
            detail={upcomingLabel}
          />
          <StatCard
            icon={GraduationCap}
            to="/egitim"
            label="Eksik Eğitim / Checklist"
            value={educationGaps.length}
            detail="%100 altında olan kişi sayısı"
          />
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 md:grid-flow-row-dense">
          {!isBrokerOrOwner && (
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
          )}

          {!isBrokerOrOwner &&
            (isDanisman ? (
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
            ) : (
              <Widget
                icon={Target}
                title="Açık Fırsatlar"
                count={openOpportunities.length}
                description="Havuzda henüz kimsenin almadığı fırsatlar"
                to="/firsatlar"
                linkLabel="Fırsatlar'a git"
              >
                {openOpportunities.length === 0 ? (
                  <EmptyRow text="Havuzda bekleyen fırsat yok." />
                ) : (
                  <div className="space-y-2">
                    {openOpportunities.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-ink-900">{o.ozet ?? (o.type === 'satici' ? 'Satıcı' : 'Alıcı')}</p>
                          <p className="text-xs text-ink-400">{o.konum ?? '—'}</p>
                        </div>
                        <span className="text-xs text-ink-400">{relativeTime(o.createdAt)}</span>
                      </div>
                    ))}
                    {openOpportunities.length > 5 && (
                      <p className="pt-1 text-center text-xs text-ink-400">+{openOpportunities.length - 5} tane daha</p>
                    )}
                  </div>
                )}
              </Widget>
            ))}

          {isBrokerOrOwner && (
            <Widget
              icon={UsersIcon}
              title="Portal Kullanımı"
              description="Danışmanlar, en son giriş yaptıkları zamana göre sıralı"
              to="/takip"
              linkLabel="Takip'e git"
              className="md:col-span-2"
            >
              {activityRanking.length === 0 ? (
                <EmptyRow text="Henüz danışman yok." />
              ) : (
                <div className="space-y-1.5">
                  {activityRanking.map((r, index) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 shrink-0 text-center text-xs font-medium text-ink-300">{index + 1}</span>
                        <span className="text-sm font-medium text-ink-900">{r.name}</span>
                      </div>
                      <span className={`text-xs ${r.lastSignInAt ? 'text-ink-500' : 'text-amber-600'}`}>
                        {r.lastSignInAt ? `Son giriş: ${relativeTime(r.lastSignInAt)}` : 'Hiç giriş yapmadı'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Widget>
          )}

          {!isBrokerOrOwner && (
            <Widget
              icon={CalendarDays}
              title="Yaklaşan Etkinlikler"
              count={upcomingEvents.length}
              description={upcomingLabel}
              to="/takvim"
              linkLabel="Takvim'e git"
            >
              {upcomingEvents.length === 0 ? (
                <EmptyRow text="Bu aralıkta etkinlik yok." />
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
          )}

          {!isBrokerOrOwner && (
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
          )}

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
