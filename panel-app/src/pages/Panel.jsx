import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PhoneCall,
  Inbox,
  Target,
  UserPlus,
  CalendarDays,
  GraduationCap,
  Trophy,
  Users as UsersIcon,
  AlertTriangle,
  Megaphone,
  HeartPulse,
  Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useKnownUsers } from '../context/UsersContext'
import { useToast } from '../context/ToastContext'
import { useAsyncList, fetchWithRetry } from '../hooks/useAsyncList'
import {
  callLogs as callLogsProvider,
  opportunities as opportunitiesProvider,
  calendarEvents as calendarProvider,
  education as educationProvider,
  league as leagueProvider,
  users as usersProvider,
  leads as leadsProvider,
  recruiting as recruitingProvider,
  tasks as tasksProvider,
} from '../lib/dataProvider'
import { canManageCalls, computeReklamKoduConversion, maskPhone } from '../lib/callLogs'
import { matchesKayitTipiFilter, computeRecruitingReklamConversion } from '../lib/recruiting'
import { ROLES } from '../lib/roles'
import {
  canViewEvent,
  formatEventDate,
  formatEventTime,
  EVENT_TYPE_LABELS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_STYLES,
  MAZERET_STATUS_LABELS,
  MAZERET_STATUS_STYLES,
  KATILIM_TIPI_SELF_LABELS,
  KATILIM_TIPI_STYLES,
} from '../lib/calendar'
import { moduleProgressFor, checklistProgress } from '../lib/education'
import { computeHealthScore, STATUS_LABELS, STATUS_STYLES } from '../lib/takip'
import { formatPrice } from '../lib/opportunities'
import { categoryLabel } from '../lib/categories'
import { LEAGUE_CATEGORIES, latestUpdate, periodEffectiveDurum, periodScoresFor, rankingsByCategoryFor } from '../lib/league'
import { DATE_RANGES, isWithinRange } from '../lib/dateRange'
import { isStaleReturn, isStaleOpp, isInactiveAgent, isBehindEducation, isRecruitingStalled } from '../lib/attention'
import { isOverdue } from '../lib/tasks'
import { relativeTime, isToday, capitalizeFirst } from '../lib/format'
import { LoadingState, ErrorState } from '../components/common/AsyncState'
import DateRangeFilter from '../components/common/DateRangeFilter'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'
import OfisinNabziGrid from '../components/panel/OfisinNabziGrid'
import DikkatGerekiyorList from '../components/panel/DikkatGerekiyorList'
import WeeklyLeadersCard from '../components/panel/WeeklyLeadersCard'
import Avatar from '../components/common/Avatar'

const EDUCATION_MANAGE_ROLES = ['broker', 'owner']
const INITIAL_FILTERS = { dateRange: '7g', customFrom: '', customTo: '' }

// Sıra, aşağıdaki Promise.allSettled dizisiyle BİREBİR aynı olmalı —
// hangi sonucun hangi anahtara ait olduğunu buradan eşleştiriyoruz.
const LOAD_ALL_KEYS = [
  'calls',
  'opps',
  'events',
  'attendance',
  'modules',
  'progress',
  'checklistItems',
  'checklistStatus',
  'periods',
  'scores',
  'activity',
  'ciroMusterileri',
  'users',
  'ciroGirisleri',
  'musteriReviewCounts',
  'leads',
  'recruitingCandidates',
  'tasks',
]

// Eğitim/checklist widget'larının EmptyRow'u bu 4 sorgudan HERHANGİ biri
// başarısız olduğunda "failed" göstersin diye (educationGaps bu 4'ünün
// birleşiminden hesaplanıyor, bkz. lib/education.js).
const EDUCATION_KEYS = ['modules', 'progress', 'checklistItems', 'checklistStatus']

// "Hiç donma yaşanmasın" isteği (2026-09-24) — 17 sorgudan biri gerçekten
// çökse bile (useAsyncList'in kendi zaman aşımı/yeniden denemesi tükenirse)
// Promise.all yerine Promise.allSettled kullanılıyor: geri kalan 16 sorgu
// yine dolduruyor, Panel'in geri kalanı normal çalışıyor. Başarısız olan
// bölüm boş dizi (`[]`) ile dolduruluyor — her yerde zaten `data.xxx`
// doğrudan `.filter()/.map()` ile kullanıldığı için (bkz. bileşenin geri
// kalanı) bu güvenli bir varsayılan. `hasPartialFailure` true ise Panel'in
// üstünde küçük bir "bazı veriler eksik" şeridi çıkıyor (bkz. aşağıda
// PartialFailureBanner) — sayfayı BLOKLAMIYOR, sadece bilgilendiriyor.
//
// Her sorgu AYRICA kendi fetchWithRetry'siyle sarmalanıyor (bkz. "portal
// açılmıyor" şikayeti araştırması, 2026-10-04) — eskiden bu sarmalama
// SADECE dıştaki useAsyncList seviyesindeydi: 17 sorgudan biri ara sıra
// 5-8sn'ye sıçradığında (pg_stat_statements'ta doğrulandı — ortalama
// 50-350ms ama en kötüsü 5-8sn, muhtemelen sabah yoğun giriş saatinde
// bağlantı havuzu sıkışması), Promise.allSettled TÜMÜ bitene kadar
// beklediği için dıştaki 8sn'lik tek sınır tüm sayfayı aşağı çekiyordu —
// tek bir yavaş sorgu, hiçbiri gerçekten çökmemiş olsa bile, "zaman aşımı"
// hatasıyla TÜM paneli götürüyordu. Artık her sorgu kendi payına düşen
// süreyi aşarsa SADECE o veri boş kalıp PartialFailureBanner çıkıyor,
// diğer 16 sorgu zaten bitmiş oluyor — sayfa anında açılıyor.
async function loadAll() {
  const results = await Promise.allSettled([
    // Panel sadece özet sayılar/uyarılar için kullanıyor — tam kayıt
    // (arayanAd/telefon/notlar) yerine hafif listSummary() (bkz. o
    // fonksiyonun notu, "açılışta donma" geri bildirimi 2026-09-28).
    fetchWithRetry(() => callLogsProvider.listSummary()),
    fetchWithRetry(() => opportunitiesProvider.list()),
    fetchWithRetry(() => calendarProvider.list()),
    fetchWithRetry(() => calendarProvider.listAttendance()),
    fetchWithRetry(() => educationProvider.listModules()),
    fetchWithRetry(() => educationProvider.listProgress()),
    fetchWithRetry(() => educationProvider.listChecklistItems()),
    fetchWithRetry(() => educationProvider.listChecklistStatus()),
    fetchWithRetry(() => leagueProvider.listPeriods()),
    fetchWithRetry(() => leagueProvider.listScores()),
    fetchWithRetry(() => usersProvider.listActivity()),
    fetchWithRetry(() => leagueProvider.listCiroMusterileri()),
    fetchWithRetry(() => usersProvider.listAll()),
    fetchWithRetry(() => leagueProvider.listCiroGirisleri()),
    fetchWithRetry(() => leagueProvider.listMusteriReviewCounts()),
    // leads_select/recruiting_candidates_select RLS'i broker/owner
    // dışındaki rollerde boş dizi döner (hata değil) — Süreç Özeti
    // tablosu zaten sadece isBrokerOrOwner'da render ediliyor, ama veri
    // burada koşulsuz çekiliyor (Panel'in geri kalanıyla aynı desen).
    fetchWithRetry(() => leadsProvider.list()),
    fetchWithRetry(() => recruitingProvider.list()),
    fetchWithRetry(() => tasksProvider.list()),
  ])

  const data = { hasPartialFailure: false, failedKeys: new Set() }
  results.forEach((result, i) => {
    const key = LOAD_ALL_KEYS[i]
    if (result.status === 'fulfilled') {
      data[key] = result.value
    } else {
      data[key] = []
      data.hasPartialFailure = true
      data.failedKeys.add(key)
    }
  })
  return data
}

// Dıştaki useAsyncList sarmalayıcısının zaman aşımı — loadAll() artık her
// sorguyu kendi içinde ayrı ayrı 8sn+1 yeniden deneme ile sarmaladığı için
// (en kötü ihtimalle TEK bir sorgu ~16sn'ye kadar sürebilir, diğerleri
// paralelde çoktan bitmiş olur) dıştaki sınır bunun altında kalırsa
// loadAll() daha kendi işini bitirmeden iptal edilip aynı soruna geri
// dönülür. 20sn, 16sn'lik en kötü senaryoya yeterli pay bırakıyor.
const PANEL_LOAD_TIMEOUT_MS = 20000

// accent="navy": broker dashboard'daki yeni bölümler için — kırmızı SADECE
// kritik durumlarda kullanılmalı, normal "git →" linkleri kurumsal
// lacivert olmalı (bkz. brief madde 8). Danışman/ofis widget'ları
// (accent varsayılanı "red") mevcut marka rengini (RE/MAX kırmızısı)
// aynen koruyor — bu, uygulamanın geri kalanındaki (Lead Havuzu, Operasyon
// vb.) yerleşik kırmızı-link kuralıyla tutarlı, sadece bu yeni dashboard
// bölümü farklı bir kural izliyor.
function Widget({ icon: Icon, title, count, description, to, linkLabel, className = '', accent = 'red', children }) {
  const iconColor = accent === 'navy' ? 'text-text-primary' : 'text-brand-600'
  const linkColor = accent === 'navy' ? 'text-text-primary hover:text-brand-700' : 'text-brand-600 hover:text-brand-700'
  return (
    <div className={`min-w-0 rounded-2xl border border-border-default bg-surface-raised p-5 ${className}`}>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.75} className={iconColor} />
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {count > 0 && (
            <span className="rounded-full bg-tint-red px-2 py-0.5 text-xs font-semibold text-brand-700">{count}</span>
          )}
        </div>
        {to && (
          <Link to={to} className={`text-xs font-medium ${linkColor}`}>
            {linkLabel} →
          </Link>
        )}
      </div>
      {description && <p className="mb-4 text-xs text-text-muted">{description}</p>}
      {children}
    </div>
  )
}

// loadAll()'daki 17 sorgudan biri (yeniden denemesine rağmen) kalıcı olarak
// başarısız olursa gösterilir — sayfanın geri kalanı normal çalıştığı için
// tam sayfa ErrorState yerine küçük, bilgilendirici bir şerit (bkz.
// loadAll() notu).
function PartialFailureBanner({ onRetry }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <span className="flex items-center gap-2">
        <AlertTriangle size={15} className="shrink-0" />
        Bazı veriler yüklenemedi, panel eksik görünüyor olabilir.
      </span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm hover:bg-amber-100"
      >
        Tekrar Dene
      </button>
    </div>
  )
}

// `failed` true iken bu widget'ın asıl verisi çekilemediği için boş
// kaldı (loadAll()'daki Promise.allSettled bir sorguyu başarısız sayıp
// [] döndürdü) — "harika, bekleyen yok!" gibi olumlu bir boş-durum
// mesajı burada YANILTICI olurdu, hata ile gerçek boşluk görsel olarak
// ayrışsın diye ayrı stil/metin (bkz. /kurul "danışman takip menüleri"
// denetimi, görsel+kullanılabilirlik bulgusu — bu, sayfa üstündeki genel
// PartialFailureBanner'dan BAĞIMSIZ, widget'ın kendi içinde de belli olsun diye).
function EmptyRow({ text, failed }) {
  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-6 text-sm text-amber-700">
        <AlertTriangle size={16} /> Bu veri şu an yüklenemedi — sayfayı yenile.
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-sunken px-4 py-6 text-sm text-text-muted">
      <Inbox size={16} /> {text}
    </div>
  )
}

// Yüzdelik halka — SVG stroke-dasharray tekniğiyle, ortasında yüzde metni.
// Hem büyük StatCard'larda hem küçük satır ikonlarında (Portal Kullanımı,
// Eksik Eğitim kişi satırları) aynı bileşen kullanılıyor.
function ProgressRing({ percent, size = 88, strokeWidth = 8, color = 'var(--color-remax-blue)', fontSize }) {
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
        <span className="font-bold text-text-primary" style={{ fontSize: fontSize ?? size * 0.24 }}>
          %{clamped}
        </span>
      </div>
    </div>
  )
}

// %100 tamamlanan yeşil, yarı yolda turuncu, geride kırmızı — Eksik Eğitim
// satırlarındaki modül/checklist halkalarında kullanılıyor.
function ringColorFor(percent) {
  if (percent >= 100) return '#16a34a'
  if (percent >= 50) return '#f59e0b'
  return 'var(--color-brand-600)'
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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-border-default px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          {categoryLabel(o.category)}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-text-primary">{o.konum ?? '—'}</span>
        {detailBits.length > 0 && (
          <span className="shrink-0 text-xs text-text-muted">{detailBits.join(' · ')}</span>
        )}
      </div>
      <div className="ml-auto shrink-0 whitespace-nowrap text-right text-xs">
        <span className="font-medium text-text-secondary">{priceLabel}</span>
        <span className="ml-2 text-text-muted">{relativeTime(o.createdAt)}</span>
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
        <h3 className="text-xs font-semibold text-text-muted">
          {label} <span className="font-normal text-text-muted">({items.length})</span>
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg bg-surface-sunken px-3 py-4 text-center text-xs text-text-muted">Yok</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 4).map((o) => (
            <OpportunityMiniRow key={o.id} o={o} />
          ))}
          {items.length > 4 && <p className="pt-0.5 text-center text-xs text-text-muted">+{items.length - 4} tane daha</p>}
        </div>
      )}
    </div>
  )
}

export default function Panel() {
  const { user, role } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { showToast } = useToast()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [], { timeoutMs: PANEL_LOAD_TIMEOUT_MS })
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
  // Test hesabı (broker'ın kendi inceleme/deneme amaçlı açtığı hesap)
  // Lig/Takip/Portal Kullanımı gibi ekip performans listelerine hiç
  // karışmasın diye burada da hariç tutuluyor (bkz. "test hesabı açtım,
  // tablolarda görünmesin" isteği).
  const teamMembers = Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi)
  // Panel'in üstündeki tek tarih filtresi — dört rol için de aynı, varsayılan
  // her zaman "7 gün" (bkz. INITIAL_FILTERS). Operasyon/Fırsatlar listeleri
  // ve broker'ın özet kartları buna göre daralıyor.
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const selectedRange = DATE_RANGES.find((r) => r.key === filters.dateRange)
  const upcomingLabel = filters.dateRange === 'tumu' ? 'Tüm yaklaşan etkinlikler' : `Önümüzdeki ${selectedRange?.label ?? '7 gün'}`

  // --- Operasyon: atanmamış (yönetim) / sana atanan dönüşü bekleyen (danışman) ---
  // Üstteki tarih filtresinden BİLEREK bağımsız — "Dikkat Gerekiyor" ile
  // aynı mantık (bkz. o bloğun notu): bu bir "bekleyen iş" listesi, rapor
  // aralığı değil. Eskiden 7 günlük varsayılan filtreye tabiydi; bazı
  // danışmanlarda bekleyen işlerin %76'sı bu yüzden hiç görünmüyordu ve
  // ekran "Bekleyen çağrı yok, harika!" diyordu (bkz. /kurul "danışman
  // takip menüleri" denetimi, 2026-10-04).
  const pendingCalls = useMemo(() => {
    if (!data) return []
    const list = isManager
      ? data.calls.filter((c) => !c.assignedTo)
      : data.calls.filter((c) => c.assignedTo === user.id && !c.donusYapildiMi)
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data, isManager, user.id])

  // --- Fırsatlar: havuzdaki (henüz kimsenin almadığı) açık fırsatlar —
  // satıcı/alıcı ayrı bloklarda gösterilsin diye ayrı listeleniyor.
  // Aynı sebeple tarih filtresinden bağımsız (bkz. yukarıdaki not).
  const openOpportunities = useMemo(() => {
    if (!data) return []
    return data.opps
      .filter((o) => o.status === 'acik')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [data])
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

  // --- Broker/owner raporu: "Yaklaşan Etkinlik" kartı üstteki tarih
  // filtresinden BAĞIMSIZ (bkz. "Tarih Filtresi Kararları" — bu, danışman/
  // ofis'in kullandığı yukarıdaki filtreli `upcomingEvents`'ten AYRI bir
  // liste, üst bileşenler etkilenmesin diye). Üst sınır yok — sadece
  // gelecekteki tüm etkinlikler, en yakın olan en üstte.
  const nextEventsAlways = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    return data.events
      .filter((e) => canViewEvent(e, user, data.attendance))
      .filter((e) => new Date(e.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  }, [data, user])

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
  // overallPercent: modül+checklist toplam madde sayısına göre AĞIRLIKLI
  // tek yüzde — Panel'deki tek ilerleme çubuğu (bkz. "Eğitim — Geride
  // Kalanlar") bunu kullanıyor, iki ayrı yüzdeyi basit ortalamak yerine
  // (ör. 20 modül + 3 checklist maddesi eşit ağırlıkta sayılmasın diye).
  const educationGaps = useMemo(() => {
    if (!data) return []
    const subjects = isEducationManager ? teamMembers : [user]
    return subjects
      .map((u) => {
        const mp = moduleProgressFor(u.id, data.modules, data.progress)
        const cp = checklistProgress(u.id, 'baslangic', data.checklistItems, data.checklistStatus)
        const totalItems = mp.total + cp.total
        const overallPercent = totalItems === 0 ? 0 : Math.round(((mp.completed + cp.completed) / totalItems) * 100)
        return { id: u.id, name: u.name ?? user.name, modulePercent: mp.percent, checklistPercent: cp.percent, overallPercent }
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

  // --- Broker raporu: Reklam Kaynakları artık tek satır huni özeti DEĞİL —
  // en iyi 3 Portföy + en iyi 3 Recruiting reklamı (tam liste artık Lead
  // Havuzu'nun altında, bkz. "ayarlardaki detayların özetini panele taşı"
  // isteği). Tarih filtresinden BAĞIMSIZ (tüm zamanların en iyi reklamları,
  // Dikkat Gerekiyor gibi diğer "durum" kartlarıyla tutarlı).
  const topPortfoyReklamlari = useMemo(() => computeReklamKoduConversion(data?.calls ?? []).slice(0, 3), [data])
  const topRecruitingReklamlari = useMemo(
    () => computeRecruitingReklamConversion(data?.recruitingCandidates ?? []).slice(0, 3),
    [data],
  )

  const opportunityStats = useMemo(() => {
    if (!data) return { total: 0, acik: 0, claimed: 0, kapandi: 0, iptal: 0 }
    const inRange = data.opps.filter((o) =>
      isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo),
    )
    const total = inRange.length
    const acik = inRange.filter((o) => o.status === 'acik').length
    const claimed = inRange.filter((o) => o.status === 'claimed').length
    const kapandi = inRange.filter((o) => o.status === 'kapandi').length
    const iptal = inRange.filter((o) => o.status === 'iptal').length
    return { total, acik, claimed, kapandi, iptal }
  }, [data, filters])

  // --- Broker raporu: "Ofisin Nabzı" kutuları — "Tarih filtresi Kararları"
  // (bkz. AI_NOTLARI.md) uyarınca Lead Havuzu/Recruiting artık Operasyon/
  // Recruiting'in bir parçası olarak üstteki tarih filtresini dinliyor
  // (önceki "her zaman anlık durum" kararı bilerek tersine çevrildi —
  // Dikkat Gerekiyor/Portal Kullanımı/Dönem Liderleri/Yaklaşan Etkinlik
  // gibi "durum" kartlarından farklı olarak bunlar "kaç yeni kayıt girildi"
  // türünden bir AKIŞ metriği, dolayısıyla filtreye göre anlamlı şekilde
  // hesaplanabiliyor).
  const leadStats = useMemo(() => {
    if (!data) return { yeni: 0 }
    const yeni = data.leads
      .filter((l) => l.durum === 'yeni')
      .filter((l) => isWithinRange(l.createdAt, filters.dateRange, filters.customFrom, filters.customTo)).length
    return { yeni }
  }, [data, filters])

  const recruitingStats = useMemo(() => {
    if (!data) return { yeniBasvuru: 0 }
    const yeniBasvuru = data.recruitingCandidates
      .filter((c) => matchesKayitTipiFilter(c, 'aktif'))
      .filter((c) => c.durum === 'yeni_basvuru')
      .filter((c) => isWithinRange(c.createdAt, filters.dateRange, filters.customFrom, filters.customTo)).length
    return { yeniBasvuru }
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

  // --- Broker raporu: "Portal Kullanımı"nı liste yerine son giriş zamanına
  // göre 3 kovaya ayırıyor — Bugün / Son 7 gün (bugün HARİÇ, 1-7 gün önce) /
  // 7+ gün (7 günden fazla ya da hiç girmemiş). Kovalar birbirini
  // KAPSAMAZ — bir danışman sadece bir satırda sayılır (bkz. brief:
  // "kategoriler birbirine karışmamalı").
  const usageBuckets = useMemo(() => {
    const buckets = { bugun: [], son7gun: [], uzunSuredir: [] }
    for (const r of activityRanking) {
      if (!r.lastSignInAt) {
        buckets.uzunSuredir.push(r)
        continue
      }
      if (isToday(r.lastSignInAt)) {
        buckets.bugun.push(r)
        continue
      }
      const diffDays = Math.floor((Date.now() - new Date(r.lastSignInAt).getTime()) / (24 * 60 * 60 * 1000))
      if (diffDays <= 7) buckets.son7gun.push(r)
      else buckets.uzunSuredir.push(r)
    }
    return buckets
  }, [activityRanking])

  // --- Broker raporu: sıradaki tek etkinliğin detayı + katılımcı listesi.
  const nextEventAlways = nextEventsAlways[0] ?? null
  // --- Broker/owner raporu: "Dikkat Gerekiyor" — sabah ilk bakışta görülmesi
  // gereken istisnalar. Tarih filtresinden BAĞIMSIZ (gecikme/durgunluk her
  // zaman güncel olmalı, seçilen rapor aralığına göre değişmemeli).
  const attentionItems = useMemo(() => {
    if (!data) return []
    const now = Date.now()
    const items = []

    // Kriterler lib/attention.js'te paylaşılıyor — "İncele" linki gittiği
    // sayfada da AYNI fonksiyonlarla filtreliyor, iki yerde ayrı ayrı yazılıp
    // birbirinden sapmasınlar diye (bkz. geçmişte 528 fırsat kafa karışıklığı).
    // Link'lere eklenen ?odak=1, hedef sayfada "sadece bunları göster" moduna
    // geçiriyor.
    // severity: kritik (kırmızı) müşteri/iş kaybı riski taşıyan, zamana
    // duyarlı durumlar; uyarı (turuncu) daha çok iç operasyonel gecikmeler
    // (bkz. brief örnekleri — "fırsat bekliyor" kritik, "danışman girmedi"
    // ve "eğitimde geride" uyarı olarak verilmişti).
    const staleReturns = data.calls.filter((c) => isStaleReturn(c, now))
    if (staleReturns.length > 0) {
      items.push({
        id: 'stale-returns',
        severity: 'kritik',
        to: '/operasyon?odak=cagri',
        text: `${staleReturns.length} çağrıda 2 günden uzun süredir dönüş yapılmadı`,
      })
    }

    const staleOpps = data.opps.filter((o) => isStaleOpp(o, now))
    if (staleOpps.length > 0) {
      items.push({
        id: 'stale-opps',
        severity: 'kritik',
        to: '/firsatlar?odak=firsat',
        text: `${staleOpps.length} fırsat 3 günden uzun süredir havuzda bekliyor`,
      })
    }

    const inactiveAgents = activityRanking.filter((r) => isInactiveAgent(r.lastSignInAt, now))
    if (inactiveAgents.length > 0) {
      items.push({
        id: 'inactive-agents',
        severity: 'uyari',
        to: '/takip?odak=danisman',
        text: `${inactiveAgents.length} danışman 7 günden uzun süredir portala girmedi`,
      })
    }

    const behindEducation = educationGaps.filter(isBehindEducation)
    if (behindEducation.length > 0) {
      items.push({
        id: 'behind-education',
        severity: 'uyari',
        to: '/egitim?odak=egitim',
        text: `${behindEducation.length} danışmanın eğitim/checklist tamamlama oranı %50'nin altında`,
      })
    }

    if (isRecruitingStalled(data.recruitingCandidates, now)) {
      items.push({
        id: 'recruiting-stalled',
        severity: 'kritik',
        to: '/recruiting',
        text: '7 gündür yeni recruiting başvurusu yok',
      })
    }

    return items
  }, [data, activityRanking, educationGaps])

  // --- Danışman: broker/owner'ın "Dikkat Gerekiyor"una eşdeğer, ama
  // SADECE kendi kayıtlarına bakıyor. 2026-10-04 /kurul bulgusu ("Sapma",
  // 3 denetçi): danışman kendi gecikmelerini (bekleyen çağrı, süresi
  // geçmiş görev, eski açık fırsat) görmek için birkaç ayrı sayfaya
  // girmeyi hatırlamak zorundaydı, Panel'de hiçbir eşdeğer sinyal yoktu.
  // Fırsatlar için ownerId (kendi listelediği) kullanılıyor — claimerId
  // değil, çünkü üstlenilen bir fırsat 'claimed' durumuna geçiyor,
  // isStaleOpp sadece hâlâ 'acik' olanı yakalıyor (kendi girip de
  // ilerletmediği bir kayıt).
  const myAttentionItems = useMemo(() => {
    if (!data || !isDanisman) return []
    const now = Date.now()
    const items = []

    const myStaleReturns = data.calls.filter((c) => c.assignedTo === user.id && isStaleReturn(c, now))
    if (myStaleReturns.length > 0) {
      items.push({
        id: 'my-stale-returns',
        severity: 'kritik',
        to: '/operasyon?odak=cagri',
        text: `${myStaleReturns.length} çağrıda 2 günden uzun süredir dönüş yapmadın`,
      })
    }

    const myStaleOpps = data.opps.filter((o) => o.ownerId === user.id && isStaleOpp(o, now))
    if (myStaleOpps.length > 0) {
      items.push({
        id: 'my-stale-opps',
        severity: 'uyari',
        to: '/firsatlar?odak=firsat',
        text: `${myStaleOpps.length} fırsatın 3 günden uzun süredir hareketsiz`,
      })
    }

    const myOverdueTasks = (data.tasks ?? []).filter((t) => t.assigneeId === user.id && isOverdue(t))
    if (myOverdueTasks.length > 0) {
      items.push({
        id: 'my-overdue-tasks',
        severity: 'uyari',
        to: '/gorevler',
        text: `${myOverdueTasks.length} görevinin süresi geçti`,
      })
    }

    return items
  }, [data, isDanisman, user.id])

  // --- Broker raporu: "Ofisin Nabzı" — 6 küçük KPI kutusu (bkz.
  // OfisinNabziGrid). Lead Havuzu ayrı kutu DEĞİL, Operasyon'un detay
  // satırına dahil edildi (bkz. brief). Kritik Uyarılar kutusu bir sayfaya
  // değil, aynı sayfadaki "Dikkat Gerekiyor" bölümüne kaydırıyor.
  const nabziTiles = useMemo(
    () => [
      {
        label: 'Operasyon',
        icon: PhoneCall,
        to: '/operasyon',
        value: callStats.total,
        detail: `${leadStats.yeni} yeni lead · ${callStats.total - callStats.assigned} atanmamış`,
        accent: 'navy',
      },
      {
        label: 'Portföy',
        icon: Target,
        to: '/firsatlar',
        value: opportunityStats.acik,
        detail: 'açık fırsat',
        accent: 'red',
      },
      {
        label: 'Recruiting',
        icon: UserPlus,
        to: '/recruiting',
        value: recruitingStats.yeniBasvuru,
        detail: 'yeni başvuru',
        accent: 'blue',
      },
      {
        label: 'Etkinlik',
        icon: CalendarDays,
        to: '/takvim',
        // "Yaklaşan Etkinlik" kartıyla aynı sayıyı göstersin diye bilerek
        // upcomingEvents (filtreli) değil nextEventsAlways (tarih
        // filtresinden bağımsız) kullanılıyor — aksi halde aynı ekranda
        // aynı kavram için iki farklı sayı görünürdü.
        value: nextEventsAlways.length,
        detail: 'yaklaşan',
        accent: 'navy',
      },
      {
        label: 'Eğitim',
        icon: GraduationCap,
        to: '/egitim',
        value: educationGaps.length,
        detail: 'kişi eksik',
        accent: 'blue',
      },
      {
        label: 'Kritik Uyarılar',
        icon: AlertTriangle,
        value: attentionItems.length,
        detail: 'dikkat gerekiyor',
        onClick: () => document.getElementById('dikkat-gerekiyor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        accent: 'red',
      },
    ],
    [callStats, leadStats, opportunityStats, recruitingStats, nextEventsAlways, educationGaps, attentionItems],
  )

  // --- Lig: en güncel dönemin üç kategorisindeki sıralama + son güncelleme ---
  // Hesaplama artık lib/league.js'teki periodScoresFor/rankingsByCategoryFor
  // üzerinden — Lig sayfasıyla AYNI fonksiyonlar (2026-10-04 /kurul bulgusu:
  // Panel eskiden kendi kopyasını tutuyordu — saf Wilson formülü (katkı
  // terimi yok) ve hakSayisi=0 olanı da dahil eden bir filtre kullanıyordu,
  // ayrıca pasif kullanıcıları periodScores'tan çıkarmıyordu — iki ekran
  // farklı kişiye "lider" tacı verebiliyordu).
  const resolveUserName = useMemo(() => (id) => knownUsers[id]?.name ?? '—', [knownUsers])
  const activePeriod = data?.periods?.[0] ?? null
  const periodScores = useMemo(
    () => periodScoresFor(data?.scores, activePeriod?.id, knownUsers),
    [data, activePeriod, knownUsers],
  )
  const rankingsByCategory = useMemo(
    () =>
      rankingsByCategoryFor({
        periodScores,
        musteriReviewCounts: data?.musteriReviewCounts,
        periodId: activePeriod?.id,
        danismanOptions: teamMembers,
        userName: resolveUserName,
      }),
    [periodScores, data, activePeriod, teamMembers, resolveUserName],
  )
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

  // Danışman panelinde sıralama açıkça istendi: Lig Durumu, Açık Fırsatlar,
  // Sana Atanan Çağrılar, Yaklaşan Etkinlikler, Eğitim/Checklist Durumun —
  // bu yüzden bu widget'lar tek sütunlu, sabit sırayla render edilebilsin
  // diye (md:grid-flow-row-dense'in sırayı karıştırmaması için) değişkene
  // ayrıldı. Ofis aynı widget'ları eski (2 sütunlu) düzende görmeye devam
  // ediyor, sadece danışman için sıra değişti.
  const callsWidget = (
    <Widget
      icon={PhoneCall}
      title={callTitle}
      count={pendingCalls.length}
      description={callDescription}
      to="/operasyon"
      linkLabel="Operasyon'a git"
    >
      {pendingCalls.length === 0 ? (
        <EmptyRow text="Bekleyen çağrı yok, harika!" failed={data?.failedKeys?.has('calls')} />
      ) : (
        <div className="space-y-2">
          {pendingCalls.slice(0, 5).map((call) => (
            <div key={call.id} className="flex items-center justify-between rounded-xl border border-border-default px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{call.arayanAd}</p>
                <p className="text-xs text-text-muted">
                  {call.kaynak} · {maskPhone(call.arayanTelefon)}
                </p>
              </div>
              <span className="text-xs text-text-muted">{relativeTime(call.createdAt)}</span>
            </div>
          ))}
          {pendingCalls.length > 5 && (
            <p className="pt-1 text-center text-xs text-text-muted">+{pendingCalls.length - 5} tane daha</p>
          )}
        </div>
      )}
    </Widget>
  )

  const opportunitiesWidgetDanisman = (
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
        <EmptyRow text="Havuzda bekleyen fırsat yok." failed={data?.failedKeys?.has('opps')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <OpportunityMiniBlock dotColor="bg-brand-600" label="Satıcılar" items={openSatici} />
          <OpportunityMiniBlock dotColor="bg-remax-blue" label="Alıcılar" items={openAlici} />
        </div>
      )}
    </Widget>
  )

  const opportunitiesWidgetOfis = (
    <Widget
      icon={Target}
      title="Açık Fırsatlar"
      count={openOpportunities.length}
      description="Havuzda henüz kimsenin almadığı fırsatlar"
      to="/firsatlar"
      linkLabel="Fırsatlar'a git"
    >
      {openOpportunities.length === 0 ? (
        <EmptyRow text="Havuzda bekleyen fırsat yok." failed={data?.failedKeys?.has('opps')} />
      ) : (
        <div className="space-y-2">
          {openOpportunities.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-border-default px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{o.ozet ?? (o.type === 'satici' ? 'Satıcı' : 'Alıcı')}</p>
                <p className="text-xs text-text-muted">
                  {categoryLabel(o.category)} · {o.konum}
                  {(o.fiyatMin != null || o.fiyatMax != null) &&
                    ` · ${formatPrice(o.type === 'alici' ? o.fiyatMin : o.fiyat ?? o.fiyatMin)}`}
                </p>
              </div>
              <span className="text-xs text-text-muted">{relativeTime(o.createdAt)}</span>
            </div>
          ))}
          {openOpportunities.length > 5 && (
            <p className="pt-1 text-center text-xs text-text-muted">+{openOpportunities.length - 5} tane daha</p>
          )}
        </div>
      )}
    </Widget>
  )

  const eventsWidget = (
    <Widget
      icon={CalendarDays}
      title="Yaklaşan Etkinlikler"
      count={upcomingEvents.length}
      description={upcomingLabel}
      to="/takvim"
      linkLabel="Takvim'e git"
    >
      {upcomingEvents.length === 0 ? (
        <EmptyRow text="Bu aralıkta etkinlik yok." failed={data?.failedKeys?.has('events')} />
      ) : (
        <div className="space-y-2">
          {upcomingEvents.slice(0, 5).map((e) => {
            const myAttendance = myAttendanceFor(e.id)
            const needsResponse = myAttendance?.status === 'davetli'
            const busy = rsvpBusyEventId === e.id
            return (
              <div key={e.id} className="rounded-xl border border-border-default px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-text-primary">{e.title}</p>
                      {myAttendance && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${KATILIM_TIPI_STYLES[myAttendance.katilimTipi]}`}
                        >
                          {KATILIM_TIPI_SELF_LABELS[myAttendance.katilimTipi] ?? KATILIM_TIPI_SELF_LABELS.zorunlu}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      {EVENT_TYPE_LABELS[e.type]} · {formatEventDate(e.startAt)} {formatEventTime(e.startAt)}
                    </p>
                  </div>
                  {myAttendance && !needsResponse && myAttendance.status !== 'mazeretli' && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ATTENDANCE_STATUS_STYLES[myAttendance.status]}`}
                    >
                      {ATTENDANCE_STATUS_LABELS[myAttendance.status]}
                    </span>
                  )}
                  {myAttendance?.status === 'mazeretli' && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${MAZERET_STATUS_STYLES[myAttendance.mazeretStatus]}`}
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
                        onClick={() => setMazeretOpenEventId((v) => (v === e.id ? null : e.id))}
                        className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-text-secondary hover:bg-border-subtle disabled:opacity-50"
                      >
                        Mazeretim Var, Katılamayacağım
                      </button>
                    </div>
                    {mazeretOpenEventId === e.id && (
                      <div className="mt-2 space-y-1.5">
                        <textarea
                          value={mazeretDraft}
                          onChange={(ev) => setMazeretDraft(ev.target.value)}
                          onBlur={(ev) => setMazeretDraft(capitalizeFirst(ev.target.value))}
                          placeholder="Neden katılamıyorsun?"
                          rows={2}
                          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                        />
                        <button
                          disabled={busy || !mazeretDraft.trim()}
                          onClick={() => submitRsvp(e.id, 'mazeretli', { mazeretText: capitalizeFirst(mazeretDraft.trim()) })}
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
  )

  const educationWidget = (
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
        <EmptyRow
          text={isEducationManager ? 'Herkes tamamlamış, harika!' : 'Her şeyi tamamladın!'}
          failed={EDUCATION_KEYS.some((k) => data?.failedKeys?.has(k))}
        />
      ) : (
        <div className="space-y-2">
          {educationGaps.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border-default px-3 py-2">
              <p className="text-sm font-medium text-text-primary">{r.name}</p>
              <span className="text-xs text-text-muted">
                Modül %{r.modulePercent} · Checklist %{r.checklistPercent}
              </span>
            </div>
          ))}
          {educationGaps.length > 5 && (
            <p className="pt-1 text-center text-xs text-text-muted">+{educationGaps.length - 5} tane daha</p>
          )}
        </div>
      )}
    </Widget>
  )

  // Lig Durumu: Lig sayfasındaki podyum (PeriodSummaryBoard) ile BİREBİR
  // aynı — herkese açık (danışman dahil, Lig sayfasında zaten aynı podyumu
  // görüyor). Kriter/"Nasıl Hesaplanır?" panelleri kasıtlı olarak burada
  // YOK, sadece Lig menüsüne girince gösteriliyor.
  // Bu blok SADECE danışman/ofis'e gösteriliyor (bkz. render sırası
  // aşağıda — broker/owner için hiç render edilmiyor), bu yüzden "dönem
  // kapalı" kilidi her zaman geçerli. 2026-10-04 /kurul bulgusu: Lig
  // sayfası dönem kapanınca danışmana "sonuçlar hazırlanıyor, sürpriz
  // kalsın" derken Panel aynı anda tam podyumu gösteriyordu — artık
  // Lig'deki AYNI `periodEffectiveDurum` kontrolü ve kilit mesajı burada da var.
  const effectivePeriodDurum = periodEffectiveDurum(activePeriod)
  const isLeagueLocked = activePeriod && effectivePeriodDurum === 'kapali'
  const ligDurumuBlock = (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Trophy size={16} className="text-brand-600" /> Lig Durumu
        </h2>
        <Link to="/lig" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Lig'e git →
        </Link>
      </div>
      {!activePeriod ? (
        <EmptyRow text="Henüz bir Lig dönemi oluşturulmamış." failed={data?.failedKeys?.has('periods')} />
      ) : isLeagueLocked ? (
        <div className="rounded-2xl border border-border-default bg-surface-raised p-6 text-center">
          <Lock size={20} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">Bu dönemin sonuçları hazırlanıyor</p>
          <p className="mt-1 text-xs text-text-muted">Yakında açıklanacak — o zamana kadar sürpriz kalsın!</p>
        </div>
      ) : (
        <>
          <PeriodSummaryBoard categories={LEAGUE_CATEGORIES} rankingsByCategory={rankingsByCategory} />
          <p className="-mt-3 text-xs text-text-muted">
            {lastLeagueUpdate ? `Son güncelleme: ${relativeTime(lastLeagueUpdate)}` : 'Bu dönemde henüz veri girilmedi.'}
          </p>
        </>
      )}
    </div>
  )

  return (
    <div>
      <div className="mb-5">
        <DateRangeFilter value={filters} onChange={setFilters} />
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && data?.hasPartialFailure && <PartialFailureBanner onRetry={reload} />}

      {/* Broker/owner yönetim merkezi — "panele girer girmez 30 saniyede
          ofisin durumuna hakim olmak" isteği (bkz. AI_NOTLARI.md). Sabit
          sıra: Ofisin Nabzı → Dikkat Gerekiyor → Portal Kullanımı →
          Dönem Liderleri → Yaklaşan Etkinlik → Eğitim → Reklam
          Kaynakları. Kartlar arası boşluk bilerek dar (space-y-3) —
          "aynı ekranda daha fazla bilgi görülsün" isteği. */}
      {!loading && !error && isBrokerOrOwner && (
        <div className="space-y-3">
          <OfisinNabziGrid tiles={nabziTiles} />
          <DikkatGerekiyorList items={attentionItems} />
        </div>
      )}

      {/* Danışman: açıkça istenen sabit sıra — Dikkat Gerekiyor (kendi
          gecikmeleri), Lig Durumu, Açık Fırsatlar, Sana Atanan Çağrılar,
          Yaklaşan Etkinlikler, Eğitim/Checklist Durumun. Tek sütun
          kullanılıyor ki md:grid-flow-row-dense sırayı karıştırmasın. */}
      {!loading && !error && isDanisman && (
        <div className="flex flex-col gap-4">
          <DikkatGerekiyorList items={myAttentionItems} />
          {ligDurumuBlock}
          {opportunitiesWidgetDanisman}
          {callsWidget}
          {eventsWidget}
          {educationWidget}
        </div>
      )}

      {/* Ofis: eski (2 sütunlu, sıkı paketlenmiş) düzen aynen korunuyor —
          sadece danışman için sıralama değişti. */}
      {!loading && !error && !isBrokerOrOwner && !isDanisman && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-flow-row-dense">
          {callsWidget}
          {opportunitiesWidgetOfis}
          {eventsWidget}
          {educationWidget}
        </div>
      )}

      {/* Broker/owner yönetim merkezinin devamı — sabit sıra: Portal
          Kullanımı → Dönem Liderleri → Yaklaşan Etkinlik → Eğitim →
          Reklam Kaynakları (bkz. brief "Nihai sıralama"). */}
      {!loading && !error && isBrokerOrOwner && (
        <div className="mt-3 space-y-3">
          {/* Desktop'ta Portal Kullanımı + Dönem Liderleri yan yana
              (bkz. brief "Mobil Öncelik" > Desktop notu), mobilde alt
              alta (grid-cols-1). */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Widget
              icon={UsersIcon}
              title="Portal Kullanımı"
              description="Güncel giriş durumu · danışmanlar en son giriş zamanına göre"
              to="/takip"
              linkLabel="Takip'e git"
              accent="navy"
            >
              {activityRanking.length === 0 ? (
                <EmptyRow text="Henüz danışman yok." failed={data?.failedKeys?.has('activity')} />
              ) : (
                <div className="space-y-1.5">
                  {[
                    { key: 'bugun', label: 'Bugün giriş yapanlar', color: '#16a34a' },
                    { key: 'son7gun', label: 'Son 7 gün içinde giriş yapanlar', color: 'var(--color-remax-blue)' },
                    { key: 'uzunSuredir', label: '7 günden uzun süredir giriş yapmayanlar', color: 'var(--color-brand-600)' },
                  ].map((b) => {
                    const people = usageBuckets[b.key]
                    const percent = activityRanking.length ? (people.length / activityRanking.length) * 100 : 0
                    return (
                      <div key={b.key} className="flex items-center gap-3 rounded-xl border border-border-default px-3 py-2.5">
                        <ProgressRing percent={percent} size={34} strokeWidth={4} color={b.color} fontSize={9} />
                        <span className="min-w-0 flex-1 text-sm text-text-secondary">{b.label}</span>
                        <span className="shrink-0 text-sm font-semibold text-text-primary">{people.length}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Widget>

            <WeeklyLeadersCard categories={LEAGUE_CATEGORIES} rankingsByCategory={rankingsByCategory} />
          </div>

          {/* Desktop'ta Eğitim + Yaklaşan Etkinlik yan yana. Yaklaşan
              Etkinlik: kart yüksekliği eskisinin yaklaşık yarısı —
              katılımcı avatar satırı kaldırıldı, sadece tarih/başlık/saat
              + "+N tane daha" (bkz. brief). */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Widget icon={CalendarDays} title="Yaklaşan Etkinlik" description="En yakın etkinlik" to="/takvim" linkLabel="Takvim'e git" accent="navy">
              {!nextEventAlways ? (
                <EmptyRow text="Yaklaşan etkinlik yok." failed={data?.failedKeys?.has('events')} />
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-border-default p-3">
                    <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-tint-red py-1 text-brand-700">
                      <span className="text-base font-bold leading-none">{new Date(nextEventAlways.startAt).getDate()}</span>
                      <span className="text-[9px] font-medium uppercase">
                        {new Date(nextEventAlways.startAt).toLocaleDateString('tr-TR', { month: 'short' })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{nextEventAlways.title}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {EVENT_TYPE_LABELS[nextEventAlways.type]} · {formatEventDate(nextEventAlways.startAt)} {formatEventTime(nextEventAlways.startAt)}
                      </p>
                    </div>
                  </div>
                  {nextEventsAlways.length > 1 && (
                    <p className="mt-2 text-center text-xs text-text-muted">+{nextEventsAlways.length - 1} etkinlik daha</p>
                  )}
                </>
              )}
            </Widget>

            <Widget
              icon={GraduationCap}
              title="Eğitim — Geride Kalanlar"
              description="Modül + checklist tamamlama %100 altında olanlar"
              to="/egitim"
              linkLabel="Tümünü gör"
              accent="navy"
            >
              {educationGaps.length === 0 ? (
                <EmptyRow text="Herkes tamamlamış, harika!" failed={EDUCATION_KEYS.some((k) => data?.failedKeys?.has(k))} />
              ) : (
                <div className="space-y-2.5">
                  {educationGaps.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <Avatar name={r.name} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-text-primary">{r.name}</span>
                          <span className="shrink-0 text-xs font-semibold text-text-muted">%{r.overallPercent}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-chart-track">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${r.overallPercent}%`, backgroundColor: ringColorFor(r.overallPercent) }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {educationGaps.length > 3 && (
                    <Link to="/egitim" className="block pt-1 text-center text-xs font-medium text-text-primary hover:text-brand-700">
                      +{educationGaps.length - 3} kişi daha →
                    </Link>
                  )}
                </div>
              )}
            </Widget>
          </div>

          {/* Reklam Kaynakları: en iyi 3 Portföy + en iyi 3 Recruiting
              reklamı — tam liste artık Lead Havuzu'nun altında (bkz.
              "ayarlardaki detayların özetini panele taşı, tüm detayları
              lead menüsünün altına yerleştir" isteği). İkisi de boşsa kart
              tamamen gizli (boş kart gösterme kuralı). */}
          {(topPortfoyReklamlari.length > 0 || topRecruitingReklamlari.length > 0) && (
            <Widget icon={Megaphone} title="Reklam Kaynakları" to="/leads" linkLabel="Tümünü gör" accent="navy">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <h3 className="mb-2 text-xs font-semibold text-text-muted">Portföy</h3>
                  {topPortfoyReklamlari.length === 0 ? (
                    <p className="rounded-lg bg-surface-sunken px-3 py-4 text-center text-xs text-text-muted">Yok</p>
                  ) : (
                    <div className="space-y-1.5">
                      {topPortfoyReklamlari.map((r) => (
                        <div key={r.reklamKodu} className="flex items-center justify-between gap-2 rounded-lg border border-border-default px-3 py-2">
                          <span className="min-w-0 truncate text-sm text-text-primary">{r.reklamKodu}</span>
                          <span className="shrink-0 text-xs text-text-muted">
                            {r.total} → {r.converted} → {r.sold}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 text-xs font-semibold text-text-muted">Recruiting</h3>
                  {topRecruitingReklamlari.length === 0 ? (
                    <p className="rounded-lg bg-surface-sunken px-3 py-4 text-center text-xs text-text-muted">Yok</p>
                  ) : (
                    <div className="space-y-1.5">
                      {topRecruitingReklamlari.map((r) => (
                        <div key={r.reklamAdi} className="flex items-center justify-between gap-2 rounded-lg border border-border-default px-3 py-2">
                          <span className="min-w-0 truncate text-sm text-text-primary">{r.reklamAdi}</span>
                          <span className="shrink-0 text-xs text-text-muted">
                            {r.total} → {r.gorusme} → {r.alindi}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Widget>
          )}
        </div>
      )}

      {/* Lig Durumu: danışman için zaten en üstte (ligDurumuBlock, yukarıdaki
          isDanisman bloğunda) gösterildi; broker/owner için "Haftanın
          Liderleri" (WeeklyLeadersCard) yukarıdaki yeni bölümde — burada
          artık sadece ofis eski podyum görünümünü görüyor. */}
      {!loading && !error && !isDanisman && !isBrokerOrOwner && <div className="mt-4">{ligDurumuBlock}</div>}

      {/* Danışman Sağlık Skoru: broker/owner'ın yeni "Ofisin Nabzı" +
          sabit 8 bölümlük akışında YOK (bkz. brief "Nihai sıralama") —
          artık sadece ofis görüyor. */}
      {!loading && !error && role === ROLES.OFIS && (
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
              <div className="flex items-center gap-3 rounded-xl border border-border-default px-3 py-2.5">
                <span className="shrink-0 text-lg">🏆</span>
                <span className="min-w-0 flex-1 text-sm text-text-secondary">{bestHealth.user.name}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[bestHealth.status]}`}>
                  {bestHealth.score} · {STATUS_LABELS[bestHealth.status]}
                </span>
              </div>
              {worstHealth && (
                <div className="flex items-center gap-3 rounded-xl border border-border-default px-3 py-2.5">
                  <span className="shrink-0 text-lg">⚠️</span>
                  <span className="min-w-0 flex-1 text-sm text-text-secondary">{worstHealth.user.name}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[worstHealth.status]}`}>
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
