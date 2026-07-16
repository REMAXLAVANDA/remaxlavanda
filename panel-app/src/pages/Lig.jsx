import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trophy, Plus, Copy, CalendarPlus, Megaphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { league as leagueProvider } from '../lib/dataProvider'
import { LEAGUE_CATEGORIES, buildShareText, canManagePeriods, canManageScores, rankingsFor } from '../lib/league'
import LeagueBoard from '../components/league/LeagueBoard'
import PeriodSummaryBoard from '../components/league/PeriodSummaryBoard'
import ReviewCreditsPanel from '../components/league/ReviewCreditsPanel'
import ActivityPointsSettings from '../components/league/ActivityPointsSettings'
import AddScoreModal from '../components/league/AddScoreModal'
import AddSocialActivityModal from '../components/league/AddSocialActivityModal'
import NewPeriodModal from '../components/league/NewPeriodModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

async function loadAll() {
  const [periods, scores, reviewCredits, activityTypes] = await Promise.all([
    leagueProvider.listPeriods(),
    leagueProvider.listScores(),
    leagueProvider.listReviewCredits(),
    leagueProvider.listActivityTypes(),
  ])
  return { periods, scores, reviewCredits, activityTypes }
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
  const [submitting, setSubmitting] = useState(false)
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

  // Üç kategorinin sıralaması tek yerde hesaplanır — hem "Dönem Özeti"
  // podyum panosu hem "Kopyala" metni bunu paylaşır, aktif sekmeden bağımsız.
  const rankingsByCategory = useMemo(() => {
    const map = {}
    for (const c of LEAGUE_CATEGORIES) map[c.key] = rankingsFor(c.key, periodScores, userName)
    return map
  }, [periodScores, userName])

  const rankings = rankingsByCategory[tab] ?? []
  const danismanOptions = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')
  const activityTypes = data?.activityTypes ?? []

  const reviewCreditRows = useMemo(() => {
    const credits = (data?.reviewCredits ?? []).filter((r) => r.periodId === periodId)
    return danismanOptions
      .map((u) => {
        const credit = credits.find((r) => r.userId === u.id)
        return { userId: u.id, name: u.name, hakSayisi: credit?.hakSayisi ?? 0, alinanSayisi: credit?.alinanSayisi ?? 0 }
      })
      .filter((r) => r.hakSayisi > 0 || r.alinanSayisi > 0)
      .sort((a, b) => b.hakSayisi - a.hakSayisi)
  }, [data, periodId, danismanOptions])

  async function handleAddScore(form) {
    setSubmitting(true)
    try {
      await leagueProvider.addScore(form, user.id)
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

  async function handleUpdateReceived(userId, alinanSayisi) {
    if (!periodId) return
    try {
      await leagueProvider.setReceivedReviews(userId, periodId, alinanSayisi)
      showToast('Yorum sayısı güncellendi.', 'success')
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink-900">Lig</h1>
            {data?.periods?.length ? (
              <select
                value={periodId ?? ''}
                onChange={(e) => setPeriodId(e.target.value)}
                className="mt-0.5 rounded-md border border-transparent bg-transparent text-xs text-ink-400 hover:border-ink-200"
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
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          {isManager && !loading && !error && period && tab !== 'sosyal_medya' && (
            <button
              onClick={() => setShowScoreModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> Skor Gir
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
        <ReviewCreditsPanel rows={reviewCreditRows} isManager={isManager} onUpdateReceived={handleUpdateReceived} />
      )}

      {!loading && !error && period && tab === 'sosyal_medya' && isBroker && (
        <ActivityPointsSettings activityTypes={activityTypes} onUpdatePoint={handleUpdatePoint} />
      )}

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

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && !period && (
        <p className="py-8 text-center text-sm text-ink-400">
          Henüz hiç dönem tanımlanmamış{isBroker ? ' — "Yeni Dönem" ile ekleyebilirsin.' : '.'}
        </p>
      )}
      {!loading && !error && period && <LeagueBoard rankings={rankings} unit={category.unit} />}

      {showScoreModal && (
        <AddScoreModal
          onClose={() => setShowScoreModal(false)}
          onSubmit={handleAddScore}
          submitting={submitting}
          danismanOptions={danismanOptions}
          defaultType={tab}
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
    </div>
  )
}
