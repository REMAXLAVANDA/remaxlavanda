import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PhoneCall,
  Inbox,
  Target,
  CalendarDays,
  GraduationCap,
  Trophy,
  Users as UsersIcon,
  AlertTriangle,
  Megaphone,
  HeartPulse,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useKnownUsers } from '../context/UsersContext'
import { useToast } from '../context/ToastContext'
import { useAsyncList } from '../hooks/useAsyncList'
import {
  callLogs as callLogsProvider,
  opportunities as opportunitiesProvider,
  calendarEvents as calendarProvider,
  education as educationProvider,
  league as leagueProvider,
  users as usersProvider,
} from '../lib/dataProvider'
import { canManageCalls, computeSourceConversion, maskPhone } from '../lib/callLogs'
import { ROLES } from '../lib/roles'
import {
  canViewEvent,
  formatEventDate,
  formatEventTime,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_STYLES,
  MAZERET_STATUS_LABELS,
  MAZERET_STATUS_STYLES,
} from '../lib/calendar'
import { moduleProgressFor, checklistProgress } from '../lib/education'
import { computeHealthScore, STATUS_LABELS, STATUS_STYLES } from '../lib/takip'
import { formatPrice } from '../lib/opportunities'
import { categoryLabel } from '../lib/categories'
import { LEAGUE_CATEGORIES, latestUpdate, rankingsFor, wilsonScoreLowerBound } from '../lib/league'
import { DATE_RANGES, isWithinRange } from '../lib/dateRange'
import { relativeTime, isToday } from '../lib/format'
import { LoadingState, ErrorState } from '../components/common/AsyncState'
import DateRangeFilter from '../components/common/DateRangeFilter'
import SourceConversionBoard from '../components/operasyon/SourceConversionBoard'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'

const EDUCATION_MANAGE_ROLES = ['broker', 'owner']
const INITIAL_FILTERS = { dateRange: '7g', customFrom: '', customTo: '' }

async function loadAll() {
  const [
    calls,
    opps,
    events,
    attendance,
    modules,
    progress,
    checklistItems,
    checklistStatus,
    periods,
    scores,
    activity,
    ciroMusterileri,
    users,
    ciroGirisleri,
  ] = await Promise.all([
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
    leagueProvider.listCiroMusterileri(),
    usersProvider.listAll(),
    leagueProvider.listCiroGirisleri(),
  ])
  return {
    calls,
    opps,
    events,
    attendance,
    modules,
    progress,
    checklistItems,
    checklistStatus,
    periods,
    scores,
    activity,
    ciroMusterileri,
    users,
    ciroGirisleri,
  }
}

function Widget({ icon: Icon, title, count, description, to, linkLabel, className = '', children }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-ink-100 bg-white p-5 ${className}`}>
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

// Yüzdelik halka — SVG stroke-dasharray tekniğiyle, ortasında yüzde metni.
// Hem büyük StatCard'larda hem küçük satır ikonlarında (Portal Kullanımı,
// Eksik Eğitim kişi satırları) aynı bileşen kullanılıyor.
function ProgressRing({ percent, size = 88, strokeWidth = 8, color = '#003da5', fontSize }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-ink-900" style={{ fontSize: fontSize ?? size * 0.24 }}>
          %{clamped}
        </span>
      </div>
    </div>
  )
}

// Uygulamada profil fotoğrafı YOK — mevcut kural (bkz. ProfileMenu,
// HealthScoreRow) daireye baş harf koymak, mockup'taki avatar fotoğrafları
// yerine bu kullanılıyor.
function InitialsBadge({ name, size = 36 }) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}

// %100 tamamlanan yeşil, yarı yolda turuncu, geride kırmızı — Eksik Eğitim
// satırlarındaki modül/checklist halkalarında kullanılıyor.
function ringColorFor(percent) {
  if (percent >= 100) return '#16a34a'
  if (percent >= 50) return '#f59e0b'
  return '#dc1c2e'
}

// Broker'ın istediği "rapor odaklı" özet kartları — yüzdelik halka + kısa
// dağılım, tıklanınca ilgili modüle götürüyor.
function StatCard({ icon: Icon, to, label, percent, ratioLabel, ringColor, breakdown }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-ink-100 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
    >
      <div className="mb-4 flex items-center gap-2 text-ink-400">
        <Icon size={15} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex flex-col items-center">
        <ProgressRing percent={percent} color={ringColor} />
        {ratioLabel && <p className="mt-2 text-xs text-ink-400">{ratioLabel}</p>}
      </div>
      {breakdown?.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3">
          {breakdown.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-ink-500">{b.label}</span>
              <span className="ml-auto font-medium text-ink-800">{b.value}</span>
            </div>
          ))}
        </div>
      )}
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
    o.type === 'alici' && (o.fiyatMin != null || o.fiyatMax != null)
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
  const { showToast } = useToast()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [mazeretOpenEventId, setMazeretOpenEventId] = useState(null)
  const [mazeretDraft, setMazeretDraft] = useState('')
  const [rsvpBusyEventId, setRsvpBusyEventId] = useState(null)
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

  // --- Takvim: Panel'den, Takvim'e girmeden hızlı RSVP — "gd paneline
  // düşsün" isteği: davetli olduğun ama henüz cevap vermediğin etkinlikler
  // için Katılacağım/Mazeret Bildir doğrudan burada (bkz. EventDetailModal
  // aynı akışın Takvim tarafı).
  function myAttendanceFor(eventId) {
    return data?.attendance.find((a) => a.eventId === eventId && a.userId === user.id) ?? null
  }

  async function submitRsvp(eventId, status, extra) {
    setRsvpBusyEventId(eventId)
    try {
      const updated = await calendarProvider.updateAttendance(eventId, user.id, status, extra)
      setData((prev) => ({
        ...prev,
        attendance: prev.attendance.map((a) =>
          a.eventId === updated.eventId && a.userId === updated.userId ? updated : a,
        ),
      }))
      showToast(status === 'mazeretli' ? 'Mazeretin gönderildi, yönetim inceleyecek.' : 'Katılım durumun güncellendi.', 'success')
      setMazeretOpenEventId(null)
      setMazeretDraft('')
    } catch (err) {
      showToast(err.message ?? 'Katılım durumu güncellenemedi, tekrar dene.', 'error')
    } finally {
      setRsvpBusyEventId(null)
    }
  }

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

  // --- Broker raporu: "Reklamlardan kaç yetki aldık" — kaynak bazında
  // çağrı/portföy/satış dökümü. Operasyon'da (veri girişi sayfası) DEĞİL,
  // sadece burada (rapor sayfası) gösteriliyor.
  const sourceStats = useMemo(() => {
    if (!data) return []
    const inRange = data.calls.filter((c) =>
      isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo),
    )
    return computeSourceConversion(inRange)
  }, [data, filters])

  const opportunityStats = useMemo(() => {
    if (!data) return { total: 0, satici: 0, alici: 0, kapandi: 0 }
    const inRange = data.opps.filter((o) =>
      isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo),
    )
    const total = inRange.length
    const satici = inRange.filter((o) => o.type === 'satici').length
    const alici = inRange.filter((o) => o.type === 'alici').length
    const kapandi = inRange.filter((o) => o.status === 'kapandi').length
    return { total, satici, alici, kapandi }
  }, [data, filters])

  // --- Broker raporu: yaklaşan etkinliklerin ne kadarının katılım listesi
  // netleşmiş olduğu (herkes RSVP vermiş) — StatCard'daki halkanın oranı bu,
  // alttaki dağılım ise etkinlik türüne göre sayım.
  const eventReadiness = useMemo(() => {
    if (!data) return { ready: 0, total: 0 }
    const total = upcomingEvents.length
    const ready = upcomingEvents.filter((e) => {
      const invitees = data.attendance.filter((a) => a.eventId === e.id)
      return invitees.length > 0 && invitees.every((a) => a.status !== 'davetli')
    }).length
    return { ready, total }
  }, [data, upcomingEvents])

  const eventTypeBreakdown = useMemo(() => {
    const counts = {}
    for (const e of upcomingEvents) counts[e.type] = (counts[e.type] ?? 0) + 1
    return Object.entries(counts).map(([type, count]) => ({ type, count }))
  }, [upcomingEvents])

  // --- Broker raporu: ekip genelinde modül + checklist tamamlama oranı,
  // kişi kişi değil "kaç öğeden kaçı bitmiş" olarak toplanıyor.
  const educationCompletion = useMemo(() => {
    if (!data) return { completed: 0, total: 0 }
    const subjects = isEducationManager ? teamMembers : [user]
    let completed = 0
    let total = 0
    for (const u of subjects) {
      const mp = moduleProgressFor(u.id, data.modules, data.progress)
      const cp = checklistProgress(u.id, 'baslangic', data.checklistItems, data.checklistStatus)
      completed += mp.completed + cp.completed
      total += mp.total + cp.total
    }
    return { completed, total }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isEducationManager, teamMembers, user])

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

  // --- Broker raporu: "Portal Kullanımı"nı liste yerine son giriş zamanına
  // göre 4 kovaya ayırıyor (Bugün/Dün/3 gün içinde/7+ gün) — tek tek isim
  // yerine önce genel tabloyu görmek istendiği için.
  const usageBuckets = useMemo(() => {
    const buckets = { bugun: [], dun: [], uc_gun: [], yedi_gun: [] }
    for (const r of activityRanking) {
      if (!r.lastSignInAt) {
        buckets.yedi_gun.push(r)
        continue
      }
      if (isToday(r.lastSignInAt)) {
        buckets.bugun.push(r)
        continue
      }
      const diffDays = Math.floor((Date.now() - new Date(r.lastSignInAt).getTime()) / (24 * 60 * 60 * 1000))
      if (diffDays === 1) buckets.dun.push(r)
      else if (diffDays <= 3) buckets.uc_gun.push(r)
      else buckets.yedi_gun.push(r)
    }
    return buckets
  }, [activityRanking])

  // --- Broker raporu: sıradaki tek etkinliğin detayı + katılımcı listesi.
  const nextEvent = upcomingEvents[0] ?? null
  const nextEventAttendees = useMemo(() => {
    if (!nextEvent || !data) return []
    return data.attendance
      .filter((a) => a.eventId === nextEvent.id)
      .map((a) => knownUsers[a.userId])
      .filter(Boolean)
  }, [nextEvent, data, knownUsers])

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
  // Memnuniyet score_entries'e HİÇ yazılmaz (bkz. Lig.jsx) — Wilson skoru
  // her render'da ciro_musterileri'nden canlı hesaplanır. Panel eskiden bu
  // kategori için de periodScores'a bakıyordu, orada hiçbir zaman satır
  // olmadığı için Memnuniyet lideri hep "—" görünüyordu — Lig sayfasıyla
  // aynı hesaba geçildi.
  const memnuniyetScores = useMemo(() => {
    if (!activePeriod) return []
    const musteriler = (data?.ciroMusterileri ?? []).filter((m) => m.periodId === activePeriod.id)
    return teamMembers.map((u) => {
      const kendi = musteriler.filter((m) => m.userId === u.id)
      const hakSayisi = kendi.length
      const alinanSayisi = kendi.filter((m) => m.alindiMi).length
      return { userId: u.id, type: 'memnuniyet', value: Math.round(wilsonScoreLowerBound(alinanSayisi, hakSayisi) * 100) }
    })
  }, [data, activePeriod, teamMembers])
  const rankingsByCategory = useMemo(() => {
    const map = {}
    for (const c of LEAGUE_CATEGORIES) {
      map[c.key] = c.key === 'memnuniyet' ? rankingsFor(c.key, memnuniyetScores, resolveUserName) : rankingsFor(c.key, periodScores, resolveUserName)
    }
    return map
  }, [periodScores, memnuniyetScores, resolveUserName])
  const lastLeagueUpdate = useMemo(() => latestUpdate(periodScores), [periodScores])

  // --- Takip: en iyi/en kötü 360° sağlık skoru — Takip'e girmeden Panel'de
  // tek bakışta görülsün diye (bkz. lib/takip.js computeHealthScore).
  const healthRanking = useMemo(() => {
    if (!data) return []
    return teamMembers
      .map((u) => ({ user: u, ...computeHealthScore(u.id, data) }))
      .sort((a, b) => b.score - a.score)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, teamMembers])
  const bestHealth = healthRanking[0] ?? null
  const worstHealth = healthRanking.length > 1 ? healthRanking[healthRanking.length - 1] : null

  const callTitle = isManager ? 'Atanmamış Çağrılar' : 'Sana Atanan Çağrılar'
  const callDescription = isManager
    ? 'Henüz bir danışmana atanmamış, dağıtım bekleyen çağrılar'
    : 'Ofisten yönlendirilen, dönüş yapman gerekenler'

  return (
    <div>
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
            percent={callStats.total ? Math.round((callStats.donusYapildi / callStats.total) * 100) : 0}
            ratioLabel={`${callStats.donusYapildi} / ${callStats.total}`}
            ringColor="#003da5"
            breakdown={[
              { label: 'Atandı', value: callStats.assigned, color: '#003da5' },
              { label: 'Dönüş Yapıldı', value: callStats.donusYapildi, color: '#16a34a' },
              { label: 'Bekliyor', value: callStats.donusYapilmadi, color: '#f59e0b' },
            ]}
          />
          <StatCard
            icon={Target}
            to="/firsatlar"
            label="Fırsatlar / Portföy"
            percent={opportunityStats.total ? Math.round((opportunityStats.kapandi / opportunityStats.total) * 100) : 0}
            ratioLabel={`${opportunityStats.kapandi} / ${opportunityStats.total} kapandı`}
            ringColor="#0369a1"
            breakdown={[
              { label: 'Satıcı', value: opportunityStats.satici, color: '#16a34a' },
              { label: 'Alıcı Adayı', value: opportunityStats.alici, color: '#0369a1' },
            ]}
          />
          <StatCard
            icon={CalendarDays}
            to="/takvim"
            label="Yaklaşan Etkinlikler"
            percent={eventReadiness.total ? Math.round((eventReadiness.ready / eventReadiness.total) * 100) : 0}
            ratioLabel={`${eventReadiness.ready} / ${eventReadiness.total} netleşti`}
            ringColor="#7c3aed"
            breakdown={eventTypeBreakdown.map((b) => ({
              label: EVENT_TYPE_LABELS[b.type],
              value: b.count,
              color: EVENT_TYPE_COLORS[b.type],
            }))}
          />
          <StatCard
            icon={GraduationCap}
            to="/egitim"
            label="Eksik Eğitim / Checklist"
            percent={educationCompletion.total ? Math.round((educationCompletion.completed / educationCompletion.total) * 100) : 0}
            ratioLabel={`${educationCompletion.completed} / ${educationCompletion.total}`}
            ringColor="#16a34a"
            breakdown={[{ label: '%100 altında olan kişi', value: educationGaps.length, color: '#dc1c2e' }]}
          />
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-flow-row-dense">
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
              description="Danışmanlar, en son giriş yaptıkları zamana göre"
              to="/takip"
              linkLabel="Takip'e git"
            >
              {activityRanking.length === 0 ? (
                <EmptyRow text="Henüz danışman yok." />
              ) : (
                <div className="space-y-1.5">
                  {[
                    { key: 'bugun', label: 'Bugün giriş yapanlar', color: '#16a34a' },
                    { key: 'dun', label: 'Dün giriş yapanlar', color: '#f59e0b' },
                    { key: 'uc_gun', label: '3 gün içinde giriş yapanlar', color: '#003da5' },
                    { key: 'yedi_gun', label: '7 günden uzun süredir giriş yapmayanlar', color: '#dc1c2e' },
                  ].map((b) => {
                    const people = usageBuckets[b.key]
                    const percent = activityRanking.length ? (people.length / activityRanking.length) * 100 : 0
                    return (
                      <div key={b.key} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                        <ProgressRing percent={percent} size={38} strokeWidth={4} color={b.color} fontSize={9} />
                        <span className="min-w-0 flex-1 text-sm text-ink-700">{b.label}</span>
                        <span className="shrink-0 text-sm font-semibold text-ink-900">{people.length}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Widget>
          )}

          {isBrokerOrOwner && sourceStats.length > 0 && (
            <Widget
              icon={Megaphone}
              title="Reklam Kaynakları"
              description="Çağrı → yetki → satış dönüşümü, kaynak bazında"
              to="/operasyon"
              linkLabel="Operasyon'a git"
              className="md:col-span-2"
            >
              <SourceConversionBoard rows={sourceStats} />
            </Widget>
          )}

          {isBrokerOrOwner && (
            <Widget icon={CalendarDays} title="Yaklaşan Etkinlik" description={upcomingLabel} to="/takvim" linkLabel="Takvim'e git">
              {!nextEvent ? (
                <EmptyRow text="Bu aralıkta etkinlik yok." />
              ) : (
                <>
                  <div className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-red-50 py-1.5 text-red-600">
                        <span className="text-lg font-bold leading-none">{new Date(nextEvent.startAt).getDate()}</span>
                        <span className="text-[10px] font-medium uppercase">
                          {new Date(nextEvent.startAt).toLocaleDateString('tr-TR', { month: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{nextEvent.title}</p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {EVENT_TYPE_LABELS[nextEvent.type]} · {formatEventDate(nextEvent.startAt)} {formatEventTime(nextEvent.startAt)}
                        </p>
                      </div>
                    </div>
                    {nextEventAttendees.length > 0 && (
                      <div className="mt-3 flex items-center -space-x-2">
                        {nextEventAttendees.slice(0, 5).map((u) => (
                          <div key={u.id} className="rounded-full ring-2 ring-white">
                            <InitialsBadge name={u.name} size={28} />
                          </div>
                        ))}
                        {nextEventAttendees.length > 5 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-500 ring-2 ring-white">
                            +{nextEventAttendees.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {upcomingEvents.length > 1 && (
                    <p className="mt-3 text-center text-xs text-ink-400">+{upcomingEvents.length - 1} etkinlik daha bu aralıkta</p>
                  )}
                </>
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
                  {upcomingEvents.slice(0, 5).map((e) => {
                    const myAttendance = myAttendanceFor(e.id)
                    const needsResponse = myAttendance?.status === 'davetli'
                    const busy = rsvpBusyEventId === e.id
                    return (
                      <div key={e.id} className="rounded-xl border border-ink-100 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-900">{e.title}</p>
                            <p className="text-xs text-ink-400">
                              {EVENT_TYPE_LABELS[e.type]} · {formatEventDate(e.startAt)} {formatEventTime(e.startAt)}
                            </p>
                          </div>
                          {myAttendance && !needsResponse && myAttendance.status !== 'mazeretli' && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ATTENDANCE_STATUS_STYLES[myAttendance.status]}`}
                            >
                              {ATTENDANCE_STATUS_LABELS[myAttendance.status]}
                            </span>
                          )}
                          {myAttendance?.status === 'mazeretli' && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${MAZERET_STATUS_STYLES[myAttendance.mazeretStatus]}`}
                            >
                              Mazeret: {MAZERET_STATUS_LABELS[myAttendance.mazeretStatus]}
                            </span>
                          )}
                        </div>

                        {needsResponse && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                disabled={busy}
                                onClick={() => submitRsvp(e.id, 'onayladi')}
                                className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                              >
                                Katılacağım
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => setMazeretOpenEventId((v) => (v === e.id ? null : e.id))}
                                className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50"
                              >
                                Mazeretim Var, Katılamayacağım
                              </button>
                            </div>
                            {mazeretOpenEventId === e.id && (
                              <div className="mt-2 space-y-1.5">
                                <textarea
                                  value={mazeretDraft}
                                  onChange={(ev) => setMazeretDraft(ev.target.value)}
                                  placeholder="Neden katılamıyorsun?"
                                  rows={2}
                                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
                                />
                                <button
                                  disabled={busy || !mazeretDraft.trim()}
                                  onClick={() => submitRsvp(e.id, 'mazeretli', { mazeretText: mazeretDraft.trim() })}
                                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                                >
                                  Gönder
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
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

          {isBrokerOrOwner && (
            <Widget
              icon={GraduationCap}
              title="Eksik Eğitim / Checklist"
              description="Modül veya checklist tamamlama %100 altında olanlar"
              to="/egitim"
              linkLabel="Tümünü gör"
            >
              {educationGaps.length === 0 ? (
                <EmptyRow text="Herkes tamamlamış, harika!" />
              ) : (
                <div className="space-y-1.5">
                  {educationGaps.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2">
                      <InitialsBadge name={r.name} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{r.name}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <ProgressRing percent={r.modulePercent} size={32} strokeWidth={4} color={ringColorFor(r.modulePercent)} fontSize={8} />
                          <span className="text-[9px] text-ink-400">Modül</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <ProgressRing percent={r.checklistPercent} size={32} strokeWidth={4} color={ringColorFor(r.checklistPercent)} fontSize={8} />
                          <span className="text-[9px] text-ink-400">Checklist</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {educationGaps.length > 5 && (
                    <p className="pt-1 text-center text-xs text-ink-400">+{educationGaps.length - 5} tane daha</p>
                  )}
                </div>
              )}
            </Widget>
          )}

        </div>
      )}

      {/* Lig Durumu: Lig sayfasındaki podyum (PeriodSummaryBoard) ile BİREBİR
          aynı — herkese açık (danışman dahil, Lig sayfasında zaten aynı
          podyumu görüyor). Kriter/"Nasıl Hesaplanır?" panelleri kasıtlı
          olarak burada YOK, sadece Lig menüsüne girince gösteriliyor. */}
      {!loading && !error && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Trophy size={16} className="text-brand-600" /> Lig Durumu
            </h2>
            <Link to="/lig" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Lig'e git →
            </Link>
          </div>
          {!activePeriod ? (
            <EmptyRow text="Henüz bir Lig dönemi oluşturulmamış." />
          ) : (
            <>
              <PeriodSummaryBoard categories={LEAGUE_CATEGORIES} rankingsByCategory={rankingsByCategory} />
              <p className="-mt-3 text-xs text-ink-400">
                {lastLeagueUpdate
                  ? `Son güncelleme: ${relativeTime(lastLeagueUpdate)}`
                  : 'Bu dönemde henüz veri girilmedi.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Danışman Sağlık Skoru: broker/owner'ın gördüğü büyük yönetim panosundan
          (isBrokerOrOwner) AYRI tutuluyor — ofis de bu widget'ı görmeli ama
          çağrı/fırsat/eğitim istatistiklerinin tamamını görmemeli. */}
      {!loading && !error && (isBrokerOrOwner || role === ROLES.OFIS) && (
        <Widget
          icon={HeartPulse}
          title="Danışman Sağlık Skoru"
          description="360° skor — en iyi ve en dikkat gereken"
          to="/takip"
          linkLabel="Takip'e git"
          className="mt-4"
        >
          {!bestHealth ? (
            <EmptyRow text="Henüz danışman yok." />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                <span className="shrink-0 text-lg">🏆</span>
                <span className="min-w-0 flex-1 text-sm text-ink-700">{bestHealth.user.name}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[bestHealth.status]}`}>
                  {bestHealth.score} · {STATUS_LABELS[bestHealth.status]}
                </span>
              </div>
              {worstHealth && (
                <div className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                  <span className="shrink-0 text-lg">⚠️</span>
                  <span className="min-w-0 flex-1 text-sm text-ink-700">{worstHealth.user.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[worstHealth.status]}`}>
                    {worstHealth.score} · {STATUS_LABELS[worstHealth.status]}
                  </span>
                </div>
              )}
            </div>
          )}
        </Widget>
      )}
    </div>
  )
}
