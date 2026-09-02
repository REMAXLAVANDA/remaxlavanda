import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Copy, CalendarPlus, Eye, Lock, Megaphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { league as leagueProvider } from '../lib/dataProvider'
import {
  LEAGUE_CATEGORIES,
  LEAGUE_CATEGORY_COLORS,
  buildShareText,
  canAnnouncePeriod,
  canManagePeriods,
  canManageScores,
  canSeeCiroAmounts,
  periodEffectiveDurum,
  rankingsFor,
  memnuniyetPuani,
} from '../lib/league'
import { sortByName, formatDateOnly } from '../lib/format'
import LeagueBoard from '../components/league/LeagueBoard'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'
import ReviewCreditsPanel from '../components/league/ReviewCreditsPanel'
import ActivityPointsSettings from '../components/league/ActivityPointsSettings'
import CriteriaPanel from '../components/league/CriteriaPanel'
import ShareCardModal from '../components/league/ShareCardModal'
import AddScoreModal from '../components/league/AddScoreModal'
import AddSocialActivityModal from '../components/league/AddSocialActivityModal'
import AddEntryChooserModal from '../components/league/AddEntryChooserModal'
import NewPeriodModal from '../components/league/NewPeriodModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const sortByCreatedDesc = (rows) => [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
const EMPTY_ARR = []

async function loadAll() {
  const [periods, scores, activityTypes, ciroMusterileri, ciroGirisleri, musteriReviewCounts, socialActivityLog] =
    await Promise.all([
      leagueProvider.listPeriods(),
      leagueProvider.listScores(),
      leagueProvider.listActivityTypes(),
      leagueProvider.listCiroMusterileri(),
      leagueProvider.listCiroGirisleri(),
      leagueProvider.listMusteriReviewCounts(),
      leagueProvider.listSocialActivityLog(),
    ])
  return { periods, scores, activityTypes, ciroMusterileri, ciroGirisleri, musteriReviewCounts, socialActivityLog }
}

export default function Lig() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [tab, setTab] = useState(LEAGUE_CATEGORIES[0].key)
  const [periodId, setPeriodId] = useState(null)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showChooserModal, setShowChooserModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // ReviewCreditsPanel'in kendi state'i değil, burada tutuluyor — isim
  // ekleme/silme/işaretleme her seferinde reload() tetikleyip paneli kısa
  // süreliğine unmount ediyor (loading=true olunca), state panelde olsaydı
  // her tıklamada açık satır kapanırdı.
  const [expandedCiroUserId, setExpandedCiroUserId] = useState(null)
  const category = LEAGUE_CATEGORIES.find((c) => c.key === tab)
  const userName = useCallback((id) => knownUsers[id]?.name ?? '—', [knownUsers])
  const isManager = canManageScores(role)
  const isBroker = canManagePeriods(role)

  // Veri geldiğinde en güncel (en yeni başlangıçlı) dönem varsayılan seçili gelir.
  useEffect(() => {
    if (data?.periods?.length && !periodId) setPeriodId(data.periods[0].id)
  }, [data, periodId])

  const period = data?.periods?.find((p) => p.id === periodId)
  // Ekranın anında doğru göstermesi için — asıl kaynak (RLS'in ne
  // döndürdüğü) sunucuda tarihten canlı hesaplanıyor, bu sadece UI'ın
  // pg_cron'un o gece gelmesini beklemeden aynı sonuca varması için.
  const effectiveDurum = periodEffectiveDurum(period)
  // "kapali": broker/owner her zaman görür + girer (kural: "skor girmeye
  // devam eder"). Danışman VE OFİS hiçbir şey görmez — isManager burada
  // canManageScores() (broker/owner/OFİS) demek, o yüzden isManager tek
  // başına yeterli değil, ofis'i de bu pencerede dışarıda bırakmak için
  // ayrıca isBrokerOrOwner lazım.
  const isBrokerOrOwner = canAnnouncePeriod(role)
  const isBlackedOut = effectiveDurum === 'kapali' && !isBrokerOrOwner
  // Test hesabının ciro/sosyal medya skoru olsa bile sıralamada
  // görünmesin diye (bkz. "test hesabı ... tablolarda görünmesin" isteği).
  // knownUsers SADECE aktif kullanıcıları içeriyor (listKnown() RLS'i) —
  // önceki filtre pasif bir kullanıcı için knownUsers[id] undefined
  // döndüğünde "!undefined?.testHesabi" = true olup satırı YANLIŞLIKLA
  // İÇERİDE bırakıyordu (broker: "Esra Sever pasif ama hesaba katılıyor").
  // Artık kullanıcının knownUsers'ta (yani aktif) olması da şart.
  const periodScores = useMemo(
    () => (data?.scores ?? []).filter((s) => s.periodId === periodId && knownUsers[s.userId] && !knownUsers[s.userId].testHesabi),
    [data, periodId, knownUsers],
  )

  // Test hesabı Lig sıralamalarına/Yorum Hakkı listesine karışmasın diye
  // hariç tutuluyor (bkz. Panel.jsx'teki aynı filtre).
  const danismanOptions = sortByName(Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi))
  const activityTypes = data?.activityTypes ?? EMPTY_ARR

  // Ciro'ya dönen müşteriler isim isim burada — yorum hakkı (kaç isim
  // girildi) ve alınan yorum sayısı (kaçının alindiMi'si işaretli) artık
  // bu listeden hesaplanıyor, review_credits'ten okunmuyor. Filtre yok:
  // hiç ismi olmayan danışman da görünsün ki broker ilk ismi buradan
  // ekleyebilsin.
  const reviewCreditRows = useMemo(() => {
    const musteriler = (data?.ciroMusterileri ?? []).filter((m) => m.periodId === periodId)
    return danismanOptions
      .map((u) => {
        const kendi = musteriler
          .filter((m) => m.userId === u.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        return {
          userId: u.id,
          name: u.name,
          hakSayisi: kendi.length,
          alinanSayisi: kendi.filter((m) => m.alindiMi).length,
          musteriler: kendi,
        }
      })
      .sort((a, b) => b.hakSayisi - a.hakSayisi)
  }, [data, periodId, danismanOptions])

  // Sıralama (Ciro/Memnuniyet/Sosyal Medya) herkese açık bir "ofis başarı
  // panosu" — ama Yorum Hakkı panelindeki müşteri isimleri kişisel veri:
  // danışman SADECE kendi satırını (kendi hak/alınan sayısı + kendi eksik
  // müşteri listesi) görür, başka danışmanın adını/müşterisini göremez.
  // reviewCreditRows'un TAMAMI hâlâ rankingsByCategory'de (Memnuniyet
  // sıralaması) kullanılıyor — burada sadece PANELE gidecek liste kısıtlanıyor.
  const visibleReviewCreditRows = isManager ? reviewCreditRows : reviewCreditRows.filter((r) => r.userId === user.id)

  // LeagueBoard'un Memnuniyet sekmesinde her satırı "Ciro'daki gibi" açıp
  // müşteri listesini gösterebilmesi için userId -> satır eşlemesi (bkz.
  // LeagueBoard'daki reviewByUser prop'u).
  const reviewByUser = useMemo(
    () => Object.fromEntries(reviewCreditRows.map((r) => [r.userId, r])),
    [reviewCreditRows],
  )

  // Üç kategorinin sıralaması tek yerde hesaplanır — hem "Dönem Özeti"
  // podyum panosu hem "Kopyala" metni bunu paylaşır, aktif sekmeden bağımsız.
  // Memnuniyet artık serbest bir puan değil — Wilson skoru (bkz. lib/league)
  // ile hesaplanıyor: hem oran hem işlem hacmi birlikte tartılıyor. Ham
  // yüzdeyle sıralarsak 1 işlemden %100 alan, 17 işlemden %70 alanın önüne
  // geçerdi (az veri = yanıltıcı yüksek yüzde) — Wilson bunu düzeltiyor.
  // Memnuniyet sıralaması reviewCreditRows'tan DEĞİL, listMusteriReviewCounts()
  // RPC'sinden besleniyor — reviewCreditRows, ciro_musterileri_select RLS'i
  // yüzünden bir danışman girişinde sadece kendi verisini içeriyor, bu da
  // sıralamayı bozuyordu (bkz. migration 20260725110000). RPC herkesin
  // TOPLAM sayısını (isim vermeden) döndüğü için sıralama artık kim
  // baktığından bağımsız, her zaman doğru.
  const rankingsByCategory = useMemo(() => {
    const map = {}
    const countsByUser = {}
    for (const c of data?.musteriReviewCounts ?? []) {
      if (c.periodId === periodId) countsByUser[c.userId] = c
    }
    // Beraberlikte ciro puanı yüksek olan üstte (2026-09-02 broker kararı).
    const ciroByUser = Object.fromEntries(periodScores.filter((s) => s.type === 'ciro').map((s) => [s.userId, s.value]))
    for (const cat of LEAGUE_CATEGORIES) {
      if (cat.key === 'memnuniyet') {
        // Hiç müşteri girilmemiş (hakSayisi 0) danışman sıralamaya hiç
        // girmesin — yoksa herkes 0 puanken biri rastgele "Lider" gösterilir
        // (broker: "aynı şey memnuniyette de Alper'de görünüyor" — Sosyal
        // Medya'daki "hayalet lider" hatasıyla aynı kök neden, buradaki
        // karşılığı).
        const memnuniyetScores = danismanOptions
          .filter((u) => (countsByUser[u.id]?.hakSayisi ?? 0) > 0)
          .map((u) => {
            const c = countsByUser[u.id]
            return {
              userId: u.id,
              type: 'memnuniyet',
              value: Math.round(memnuniyetPuani(c?.hakSayisi ?? 0, c?.alinanSayisi ?? 0)),
            }
          })
        map[cat.key] = rankingsFor(cat.key, memnuniyetScores, userName, (id) => ciroByUser[id])
      } else {
        map[cat.key] = rankingsFor(cat.key, periodScores, userName)
      }
    }
    return map
  }, [periodScores, userName, data, periodId, danismanOptions])

  const rankings = rankingsByCategory[tab] ?? []

  // "En son hangi ciroyu/sosyal medya verisini girdik" sorusuna cevap —
  // kategori bazında son 3 giriş. Sayfada DEĞİL, ilgili "Veri Gir"
  // modalının içinde gösteriliyor (bkz. AddScoreModal/
  // AddSocialActivityModal'daki recentEntries prop'u) — broker: "veri
  // girdiğimiz ekranda açılsın, sayfada görünmesin". Ciro tutarı BİLEREK
  // gösteriliyor (broker: "RAKAM DA DAHİL YOKSA anlaşılmıyor") — burası
  // zaten sadece yöneticiye (isManager) açık bir denetim akışı, Lig'in
  // podyum/sıralama ekranlarındaki "mutlak rakam yok" kuralı (danışmanlar
  // arası mahremiyet için) burada geçerli değil; LeagueBoard'daki ciro
  // geçmişi de aynı nedenle zaten tutarı gösteriyor.
  // Memnuniyet burada YOK — Müşteri Memnuniyeti "Veri Gir"den kaldırıldı
  // (ciro girilirken müşteri adı zaten aynı formda ekleniyor).
  // "when" alanı net TARİH gösterir ("dün"/"2 gün önce" DEĞİL — broker:
  // "işlem tarihi olmalı her yerde", bkz. formatDateOnly). Ciro'da
  // sistemin işlem yapıldığı tarih olan `tarih` alanı kullanılıyor
  // (`createdAt` girişin sisteme kaydedildiği an, geriye tarihli
  // girişlerde ikisi farklı olabilir) — sosyal medyada ayrı bir işlem
  // tarihi kolonu DB'de yok, en yakın karşılığı `createdAt`.
  const recentEntriesByCategory = useMemo(() => {
    if (!periodId) return {}
    const activityTypeName = (id) => activityTypes.find((t) => t.id === id)?.ad ?? 'aktivite'
    return {
      ciro: sortByCreatedDesc((data?.ciroGirisleri ?? []).filter((g) => g.periodId === periodId))
        .slice(0, 3)
        .map((g) => ({
          id: g.id,
          danismanName: userName(g.userId),
          detail: canSeeCiroAmounts(role) ? `${Number(g.value).toLocaleString('tr-TR')} TL ciro girişi` : '•••• TL ciro girişi',
          when: formatDateOnly(g.tarih),
        })),
      sosyal_medya: sortByCreatedDesc((data?.socialActivityLog ?? []).filter((l) => l.periodId === periodId))
        .slice(0, 3)
        .map((l) => ({
          id: l.id,
          danismanName: userName(l.userId),
          detail: `${l.adet}x ${activityTypeName(l.activityTypeId)}`,
          when: formatDateOnly(l.createdAt),
        })),
    }
  }, [data, periodId, userName, activityTypes, role])

  // Ciro sekmesindeki sıralama satırına tıklayınca "sonradan kontrol"
  // amaçlı girilen ciro geçmişi (tarih + tutar) görülebilsin diye —
  // score_entries.value tek satır olduğu için geçmiş burada ayrı tutuluyor.
  const ciroHistoryByUser = useMemo(() => {
    const rows = (data?.ciroGirisleri ?? []).filter((g) => g.periodId === periodId)
    const map = {}
    for (const g of rows) {
      if (!map[g.userId]) map[g.userId] = []
      map[g.userId].push(g)
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    return map
  }, [data, periodId])

  // Sosyal Medya sekmesindeki sıralama satırına tıklayınca Ciro'daki gibi
  // giriş geçmişi (tarih + "3x Instagram Post") görülebilsin diye — broker:
  // "sosyal medya girişlerinde en son hangi veri girdiğimizi göremiyoruz".
  const socialActivityHistoryByUser = useMemo(() => {
    const activityTypeName = (id) => activityTypes.find((t) => t.id === id)?.ad ?? 'aktivite'
    const rows = (data?.socialActivityLog ?? []).filter((l) => l.periodId === periodId)
    const map = {}
    for (const l of rows) {
      if (!map[l.userId]) map[l.userId] = []
      map[l.userId].push({ id: l.id, tarih: l.createdAt, adet: l.adet, activityTypeName: activityTypeName(l.activityTypeId) })
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => new Date(b.tarih) - new Date(a.tarih))
    }
    return map
  }, [data, periodId, activityTypes])

  // Ciro girilirken müşteri isimleri de aynı formda eklenebiliyor (bkz.
  // AddScoreModal) — ayrı bir menüye gitmeye gerek kalmasın diye. Skor
  // kaydedilince addScore'un döndürdüğü periodId ile isimler de eklenir;
  // eski (isimsiz) bir ciroya isim eklemek için de aynı yol kullanılıyor.
  async function handleAddScore(form) {
    setSubmitting(true)
    try {
      const result = await leagueProvider.addScore(form, user.id)
      if (form.type === 'ciro' && form.musteriler?.length) {
        for (const adSoyad of form.musteriler) {
          await leagueProvider.addCiroMusteri({ userId: form.userId, periodId: result.periodId, adSoyad }, user.id)
        }
      }
      setShowScoreModal(false)
      showToast('Skor kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Skor kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // "Sonuçları açıkla" — kalıcı bir işlem (2026-09-02 broker kararı: bir
  // kere açıklanan dönem geri kapanmaz), o yüzden onay isteniyor.
  async function handleAnnounce() {
    if (!periodId) return
    if (!window.confirm('Bu dönemin sonuçlarını herkese açıklamak istediğine emin misin? Bu geri alınamaz.')) return
    setSubmitting(true)
    try {
      await leagueProvider.announcePeriod(periodId)
      showToast('Sonuçlar açıklandı.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Açıklanamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddPeriod(form) {
    setSubmitting(true)
    try {
      const created = await leagueProvider.createPeriod(form)
      setShowPeriodModal(false)
      setPeriodId(created.id)
      showToast('Dönem oluşturuldu.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Dönem oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogActivity(form) {
    setSubmitting(true)
    try {
      await leagueProvider.logSocialActivity(form, user.id)
      setShowActivityModal(false)
      showToast('Aktivite eklendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Aktivite eklenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdatePoint(activityTypeId, puan) {
    try {
      await leagueProvider.updateActivityTypePoint(activityTypeId, puan)
      showToast('Puan güncellendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Puan güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleAddCiroMusteri(userId, adSoyad) {
    if (!periodId) return
    try {
      await leagueProvider.addCiroMusteri({ userId, periodId, adSoyad }, user.id)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Müşteri eklenemedi, tekrar dene.', 'error')
    }
  }

  async function handleRemoveCiroMusteri(id) {
    try {
      await leagueProvider.removeCiroMusteri(id)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Müşteri silinemedi, tekrar dene.', 'error')
    }
  }

  // Yanlış girilen bir satırı düzeltmenin tek yolu (broker: "Murat
  // Sarılgan'a yanlış giriş yaptık") — sil, sonra doğrusunu yeniden gir.
  // Silme, o danışmanın dönem toplamını (score_entries) otomatik yeniden
  // hesaplar (bkz. dataProvider).
  async function handleRemoveCiroGiris(id) {
    if (!window.confirm('Bu ciro kaydını silmek istiyor musun? Dönem toplamı otomatik güncellenir.')) return
    try {
      await leagueProvider.removeCiroGiris(id)
      showToast('Ciro kaydı silindi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    }
  }

  async function handleRemoveSocialActivity(id) {
    if (!window.confirm('Bu sosyal medya kaydını silmek istiyor musun? Dönem toplamı otomatik güncellenir.')) return
    try {
      await leagueProvider.removeSocialActivity(id)
      showToast('Kayıt silindi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    }
  }

  // "Müşteri Memnuniyeti": broker/ofis hangi müşteriden gerçekten yorum
  // alındığını isim isim işaretler — açıkta kalanlar (işaretsiz olanlar)
  // danışmanın da görebildiği bir eksik listesi haline gelir.
  async function handleToggleAlindi(id, alindiMi) {
    try {
      await leagueProvider.setCiroMusteriAlindi(id, alindiMi)
      reload()
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    }
  }

  // Tek "Veri Gir" girişi, dağınık sekme-bazlı butonlar yerine — hangi
  // kategori seçilirse ilgili modalı açar (bkz. "veri giriş biraz
  // karışık" isteği). Müşteri Memnuniyeti burada YOK — ciro girilirken
  // müşteri adı zaten aynı formda ekleniyor, ayrı bir giriş noktasına
  // gerek yok (broker kararı).
  function handleChooseEntryType(key) {
    setShowChooserModal(false)
    if (key === 'ciro') {
      setTab('ciro')
      setShowScoreModal(true)
    } else {
      setTab('sosyal_medya')
      setShowActivityModal(true)
    }
  }

  function handleCopySummary() {
    if (!period) return
    const summaries = LEAGUE_CATEGORIES.map((c) => ({
      label: c.label,
      unit: c.unit,
      rankings: rankingsByCategory[c.key] ?? [],
    }))
    const text = buildShareText(period.ad, summaries)
    navigator.clipboard
      .writeText(text)
      .then(() => showToast('Özet panoya kopyalandı.', 'success'))
      .catch(() => showToast('Kopyalanamadı, tarayıcı izni gerekebilir.', 'error'))
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        {/* Dönem adı ("2026 - Dönem 2 (May-Ağu)") tarih aralığını ifşa
            ediyordu — danışman ne zaman biteceğini/ödül gününü önceden
            görmesin diye (broker: "ödül günü sürpriz olmalı") bu seçici
            SADECE yöneticiye (broker/owner/ofis) gösteriliyor. Danışman
            için periodId zaten en güncel döneme otomatik ayarlanıyor
            (yukarıdaki useEffect), sadece ekranda görünmüyor. */}
        {isManager && !isBlackedOut && data?.periods?.length ? (
          <select
            value={periodId ?? ''}
            onChange={(e) => setPeriodId(e.target.value)}
            className="rounded-md border border-border-default bg-surface-raised px-2 py-1.5 text-sm text-text-secondary"
          >
            {data.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad}
              </option>
            ))}
          </select>
        ) : isManager && !isBlackedOut ? (
          <p className="text-xs text-text-disabled">{loading ? 'Yükleniyor...' : 'Henüz dönem yok'}</p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sonuçlar açıklanmadan (kapalı iken) paylaşım — henüz kesinleşmemiş
              bir sonucu erken sızdırmamak için herkese (broker/owner dahil)
              kapalı, "Sonuçları Açıkla"dan sonra açılıyor. */}
          {!loading && !error && period && effectiveDurum !== 'kapali' && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-sm font-medium text-text-secondary hover:bg-border-subtle"
              title="Sosyal medyada paylaşılabilir görsel — sadece isim/sıra, mali bilgi yok"
            >
              <Eye size={16} /> Görseli Göster
            </button>
          )}
          {!loading && !error && period && effectiveDurum !== 'kapali' && (
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-sm font-medium text-text-secondary hover:bg-border-subtle"
            >
              <Copy size={16} /> Kopyala
            </button>
          )}
          {isBroker && !loading && (
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-sm font-medium text-text-secondary hover:bg-border-subtle"
            >
              <CalendarPlus size={16} /> Yeni Dönem
            </button>
          )}
          {isManager && !isBlackedOut && !loading && !error && period && (
            <button
              onClick={() => setShowChooserModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Veri Gir
            </button>
          )}
        </div>
      </div>

      {/* Dönem kapalı (kör yargılama penceresi) — broker/owner'a banner +
          "Sonuçları Açıkla" düğmesi. Danışman/ofis bu bloğu hiç görmez,
          onlara aşağıdaki ayrı "hazırlanıyor" mesajı gösteriliyor. */}
      {!loading && !error && period && effectiveDurum === 'kapali' && isBrokerOrOwner && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <Lock size={16} className="shrink-0" />
            <span>
              Bu dönem kapalı — bitişe 7 gün kaldığı için sonuçlar sadece sana görünüyor, danışman/ofis göremiyor.
            </span>
          </div>
          {canAnnouncePeriod(role) && (
            <button
              onClick={handleAnnounce}
              disabled={submitting}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Megaphone size={16} /> Sonuçları Açıkla
            </button>
          )}
        </div>
      )}

      {/* Danışman/ofis için: kapalıyken sıralama/podyum yerine tek bir
          bilgilendirme — RLS zaten veriyi döndürmüyor, boş/bozuk bir
          tabloya bakmak yerine ne olduğunu açıkça söylüyoruz. */}
      {!loading && !error && period && isBlackedOut && (
        <div className="mt-5 rounded-2xl border border-border-default bg-surface-raised p-8 text-center">
          <Lock size={24} className="mx-auto mb-3 text-text-disabled" />
          <p className="text-sm font-medium text-text-primary">Bu dönemin sonuçları hazırlanıyor</p>
          <p className="mt-1 text-sm text-text-disabled">Yakında açıklanacak — o zamana kadar sürpriz kalsın!</p>
        </div>
      )}

      {!loading && !error && period && !isBlackedOut && (
        <div className="mt-5">
          <PeriodSummaryBoard categories={LEAGUE_CATEGORIES} rankingsByCategory={rankingsByCategory} />
        </div>
      )}

      {/* Yönetici (broker/owner/ofis) için Yorum Hakkı artık burada değil,
          Memnuniyet sekmesinin İÇİNDE (bkz. aşağıdaki isManager bloğu) —
          Ciro'daki gibi kategoriye özel içerik kendi sekmesinde kalsın diye
          (broker: "yorum hakkı bölümünü müşteri memnuniyet alanının içine
          aynı cirodaki gibi gömelim"). Danışmanın sekme değiştirme UI'ı hiç
          yok (tab state hep varsayılan 'ciro'da kalır) — o yüzden danışman
          için eski konumunda (üstte, her zaman görünür) kalmaya devam
          ediyor, yoksa kendi Yorum Hakkı satırını hiç göremezdi. */}
      {!loading && !error && period && !isManager && !isBlackedOut && (
        <ReviewCreditsPanel
          rows={visibleReviewCreditRows}
          isManager={isManager}
          onAddMusteri={handleAddCiroMusteri}
          onRemoveMusteri={handleRemoveCiroMusteri}
          onToggleAlindi={handleToggleAlindi}
          expandedId={expandedCiroUserId}
          onToggleExpand={setExpandedCiroUserId}
        />
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && !period && (
        <p className="py-8 text-center text-sm text-text-disabled">
          Henüz hiç dönem tanımlanmamış{isBroker ? ' — "Yeni Dönem" ile ekleyebilirsin.' : '.'}
        </p>
      )}

      {/* Detaylı sıralama listesi (herkesin adı + görece farkı) sadece
          yönetime (broker/owner/ofis) açık — danışman sadece podyumdaki
          ilk 3'ü ve kendi Yorum Hakkı satırını görür. */}
      {isManager && !isBlackedOut && !loading && !error && period && (
        <>
          <div className="mb-5 flex gap-1 border-b border-border-default">
            {LEAGUE_CATEGORIES.map((c) => {
              const colors = LEAGUE_CATEGORY_COLORS[c.key]
              return (
                <button
                  key={c.key}
                  onClick={() => setTab(c.key)}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === c.key ? `${colors.tabBorder} ${colors.tabText}` : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
          <LeagueBoard
            rankings={rankings}
            unit={category.unit}
            historyByUser={tab === 'ciro' ? ciroHistoryByUser : null}
            reviewByUser={tab === 'memnuniyet' ? reviewByUser : null}
            activityByUser={tab === 'sosyal_medya' ? socialActivityHistoryByUser : null}
            onAddMusteri={handleAddCiroMusteri}
            onRemoveMusteri={handleRemoveCiroMusteri}
            onToggleAlindi={handleToggleAlindi}
            onRemoveHistory={tab === 'ciro' ? handleRemoveCiroGiris : undefined}
            onRemoveActivity={tab === 'sosyal_medya' ? handleRemoveSocialActivity : undefined}
            canSeeAmounts={canSeeCiroAmounts(role)}
          />
        </>
      )}

      {/* Hesaplama açıklamaları en altta — broker: "bunu en alta alalım".
          mt-6: LeagueBoard'un son satırına "dip dibe" yapışmasın diye
          (broker: "çok yakın kaldı dip dibe girdi") — CriteriaPanel'in
          kendi mb-6'sı sadece ALTINDA boşluk bırakıyor, üstünde değil. */}
      {!loading && !error && period && (
        <CriteriaPanel title="Ciro Nasıl Hesaplanır?" className="mt-6">
          <p>
            "Ciro Gir" ile eklediğin her satışın tutarı dönem boyunca toplanır — üstüne yazılmaz, birikir. Örnek:
            dönem içinde 500.000 TL, 300.000 TL ve 200.000 TL'lik 3 satış girersen, dönem toplamın 1.000.000 TL olur.
            En yüksek toplama ulaşan lider olur.
          </p>
        </CriteriaPanel>
      )}

      {!loading && !error && period && (
        <CriteriaPanel title="Memnuniyet Nasıl Hesaplanır?">
          <div className="space-y-3">
            <p>
              Yorum Hakkı panelinde müşteriden gerçekten yorum alınıp alınmadığı işaretlenir. Sıralama ham yüzdeyle
              değil, kaç işlemden kaç yorum alındığı BİRLİKTE değerlendirilerek yapılır — az işlemden gelen yüksek
              yüzde, çok işlemden gelen sağlam bir sonucun önüne geçmez.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default bg-surface-sunken text-text-disabled">
                    <th className="px-3 py-2 font-medium">İşlem</th>
                    <th className="px-3 py-2 font-medium">Alınan</th>
                    <th className="px-3 py-2 font-medium">Ham yüzde</th>
                    <th className="px-3 py-2 font-medium">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-subtle">
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2">%100</td>
                    <td className="px-3 py-2 font-medium text-text-primary">21</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-3 py-2">5</td>
                    <td className="px-3 py-2">3</td>
                    <td className="px-3 py-2">%60</td>
                    <td className="px-3 py-2 font-medium text-text-primary">23</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">17</td>
                    <td className="px-3 py-2">12</td>
                    <td className="px-3 py-2">%71</td>
                    <td className="px-3 py-2 font-medium text-text-primary">47</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text-disabled">
              1 işlemden %100 alan, 17 işlemden %71 alandan (12 yorum) daha az puan alır — çünkü ikincisinin arkasında
              çok daha fazla kanıt var. İşlem sayısı arttıkça puan gerçek yüzdene yaklaşır.
            </p>
          </div>
        </CriteriaPanel>
      )}

      {!loading && !error && period && (
        <ActivityPointsSettings activityTypes={activityTypes} onUpdatePoint={handleUpdatePoint} editable={isBroker} />
      )}

      {showChooserModal && (
        <AddEntryChooserModal onClose={() => setShowChooserModal(false)} onChoose={handleChooseEntryType} />
      )}

      {showScoreModal && (
        <AddScoreModal
          onClose={() => setShowScoreModal(false)}
          onSubmit={handleAddScore}
          submitting={submitting}
          danismanOptions={danismanOptions}
          recentEntries={recentEntriesByCategory.ciro ?? []}
        />
      )}

      {showPeriodModal && (
        <NewPeriodModal onClose={() => setShowPeriodModal(false)} onSubmit={handleAddPeriod} submitting={submitting} />
      )}

      {showActivityModal && (
        <AddSocialActivityModal
          onClose={() => setShowActivityModal(false)}
          onSubmit={handleLogActivity}
          submitting={submitting}
          danismanOptions={danismanOptions}
          activityTypes={activityTypes}
          recentEntries={recentEntriesByCategory.sosyal_medya ?? []}
        />
      )}

      {showShareModal && period && (
        <ShareCardModal
          onClose={() => setShowShareModal(false)}
          categories={LEAGUE_CATEGORIES}
          rankingsByCategory={rankingsByCategory}
          periodLabel={period.ad}
        />
      )}
    </div>
  )
}
