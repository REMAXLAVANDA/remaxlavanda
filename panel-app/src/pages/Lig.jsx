import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Copy, CalendarPlus, Megaphone, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { league as leagueProvider } from '../lib/dataProvider'
import { LEAGUE_CATEGORIES, buildShareText, canManagePeriods, canManageScores, rankingsFor, wilsonScoreLowerBound } from '../lib/league'
import LeagueBoard from '../components/league/LeagueBoard'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'
import ReviewCreditsPanel from '../components/league/ReviewCreditsPanel'
import ActivityPointsSettings from '../components/league/ActivityPointsSettings'
import CriteriaPanel from '../components/league/CriteriaPanel'
import ShareCardModal from '../components/league/ShareCardModal'
import AddScoreModal from '../components/league/AddScoreModal'
import AddSocialActivityModal from '../components/league/AddSocialActivityModal'
import NewPeriodModal from '../components/league/NewPeriodModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

async function loadAll() {
  const [periods, scores, activityTypes, ciroMusterileri, ciroGirisleri] = await Promise.all([
    leagueProvider.listPeriods(),
    leagueProvider.listScores(),
    leagueProvider.listActivityTypes(),
    leagueProvider.listCiroMusterileri(),
    leagueProvider.listCiroGirisleri(),
  ])
  return { periods, scores, activityTypes, ciroMusterileri, ciroGirisleri }
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
  const periodScores = useMemo(
    () => (data?.scores ?? []).filter((s) => s.periodId === periodId),
    [data, periodId],
  )

  const danismanOptions = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')
  const activityTypes = data?.activityTypes ?? []

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

  // Üç kategorinin sıralaması tek yerde hesaplanır — hem "Dönem Özeti"
  // podyum panosu hem "Kopyala" metni bunu paylaşır, aktif sekmeden bağımsız.
  // Memnuniyet artık serbest bir puan değil — Wilson skoru (bkz. lib/league)
  // ile hesaplanıyor: hem oran hem işlem hacmi birlikte tartılıyor. Ham
  // yüzdeyle sıralarsak 1 işlemden %100 alan, 17 işlemden %70 alanın önüne
  // geçerdi (az veri = yanıltıcı yüksek yüzde) — Wilson bunu düzeltiyor.
  const rankingsByCategory = useMemo(() => {
    const map = {}
    for (const c of LEAGUE_CATEGORIES) {
      if (c.key === 'memnuniyet') {
        const memnuniyetScores = reviewCreditRows.map((r) => ({
          userId: r.userId,
          type: 'memnuniyet',
          value: Math.round(wilsonScoreLowerBound(r.alinanSayisi, r.hakSayisi) * 100),
        }))
        map[c.key] = rankingsFor(c.key, memnuniyetScores, userName)
      } else {
        map[c.key] = rankingsFor(c.key, periodScores, userName)
      }
    }
    return map
  }, [periodScores, userName, reviewCreditRows])

  const rankings = rankingsByCategory[tab] ?? []

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
        {data?.periods?.length ? (
          <select
            value={periodId ?? ''}
            onChange={(e) => setPeriodId(e.target.value)}
            className="rounded-md border border-ink-200 bg-white px-2 py-1.5 text-sm text-ink-700"
          >
            {data.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-ink-400">{loading ? 'Yükleniyor...' : 'Henüz dönem yok'}</p>
        )}
        <div className="flex items-center gap-2">
          {!loading && !error && period && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
              title="Sosyal medyada paylaşılabilir görsel — sadece isim/sıra, mali bilgi yok"
            >
              <Eye size={16} /> Görseli Göster
            </button>
          )}
          {!loading && !error && period && (
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              <Copy size={16} /> Kopyala
            </button>
          )}
          {isBroker && !loading && (
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              <CalendarPlus size={16} /> Yeni Dönem
            </button>
          )}
          {isManager && !loading && !error && period && tab === 'sosyal_medya' && (
            <button
              onClick={() => setShowActivityModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Megaphone size={16} /> Aktivite Ekle
            </button>
          )}
          {isManager && !loading && !error && period && tab === 'ciro' && (
            <button
              onClick={() => setShowScoreModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Ciro Gir
            </button>
          )}
        </div>
      </div>

      {!loading && !error && period && (
        <div className="mt-5">
          <PeriodSummaryBoard categories={LEAGUE_CATEGORIES} rankingsByCategory={rankingsByCategory} />
        </div>
      )}

      {!loading && !error && period && (
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

      {!loading && !error && period && (
        <CriteriaPanel title="Ciro Nasıl Hesaplanır?">
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
            <div className="overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50 text-ink-400">
                    <th className="px-3 py-2 font-medium">İşlem</th>
                    <th className="px-3 py-2 font-medium">Alınan</th>
                    <th className="px-3 py-2 font-medium">Ham yüzde</th>
                    <th className="px-3 py-2 font-medium">Puan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-ink-50">
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2">%100</td>
                    <td className="px-3 py-2 font-medium text-ink-800">21</td>
                  </tr>
                  <tr className="border-b border-ink-50">
                    <td className="px-3 py-2">5</td>
                    <td className="px-3 py-2">3</td>
                    <td className="px-3 py-2">%60</td>
                    <td className="px-3 py-2 font-medium text-ink-800">23</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">17</td>
                    <td className="px-3 py-2">12</td>
                    <td className="px-3 py-2">%71</td>
                    <td className="px-3 py-2 font-medium text-ink-800">47</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-400">
              1 işlemden %100 alan, 17 işlemden %71 alandan (12 yorum) daha az puan alır — çünkü ikincisinin arkasında
              çok daha fazla kanıt var. İşlem sayısı arttıkça puan gerçek yüzdene yaklaşır.
            </p>
          </div>
        </CriteriaPanel>
      )}

      {!loading && !error && period && (
        <ActivityPointsSettings activityTypes={activityTypes} onUpdatePoint={handleUpdatePoint} editable={isBroker} />
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && !period && (
        <p className="py-8 text-center text-sm text-ink-400">
          Henüz hiç dönem tanımlanmamış{isBroker ? ' — "Yeni Dönem" ile ekleyebilirsin.' : '.'}
        </p>
      )}

      {/* Detaylı sıralama listesi (herkesin adı + görece farkı) sadece
          yönetime (broker/owner/ofis) açık — danışman sadece podyumdaki
          ilk 3'ü ve kendi Yorum Hakkı satırını görür. */}
      {isManager && !loading && !error && period && (
        <>
          <div className="mb-5 flex gap-1 border-b border-ink-100">
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
          <LeagueBoard rankings={rankings} unit={category.unit} historyByUser={tab === 'ciro' ? ciroHistoryByUser : null} />
        </>
      )}

      {showScoreModal && (
        <AddScoreModal
          onClose={() => setShowScoreModal(false)}
          onSubmit={handleAddScore}
          submitting={submitting}
          danismanOptions={danismanOptions}
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
