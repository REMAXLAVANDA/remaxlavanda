import { useMemo, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Check, X as XIcon, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { opportunities as opportunitiesProvider, ciroRaporlari as ciroRaporlariProvider, danismanAnlasmalari as danismanAnlasmalariProvider } from '../lib/dataProvider'
import {
  CIRO_RAPORU_DURUM_LABELS,
  CIRO_RAPORU_DURUM_STYLES,
  ISLEM_TIPI_LABELS,
  canSubmitCiroRaporu,
  canApproveCiroRaporu,
} from '../lib/ciroRaporlari'
import { formatDateOnly } from '../lib/format'
import { LoadingState, ErrorState } from '../components/common/AsyncState'
import CiroRaporuFormModal from '../components/ciroRaporlari/CiroRaporuFormModal'
import CiroRaporuKatilimciRow from '../components/ciroRaporlari/CiroRaporuKatilimciRow'
import RejectCiroRaporuModal from '../components/ciroRaporlari/RejectCiroRaporuModal'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

async function loadAll() {
  const [opportunities, raporlar, anlasmalar] = await Promise.all([
    opportunitiesProvider.list(),
    ciroRaporlariProvider.list(),
    danismanAnlasmalariProvider.list(),
  ])
  return { opportunities, raporlar, anlasmalar }
}

export default function CiroRaporlari() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [showFormModal, setShowFormModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)

  const isDanisman = canSubmitCiroRaporu(role)
  const isApprover = canApproveCiroRaporu(role)
  const userName = (id) => knownUsers[id]?.name ?? '—'

  const danismanOptions = useMemo(
    () => Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi && u.id !== user.id),
    [knownUsers, user.id],
  )

  // Danışmanın raporlayabileceği fırsatlar: kendi üstlendiği, kapanmış, ve
  // henüz reddedilmemiş bir raporu olmayan (aynı fırsata iki aktif rapor
  // açılmasın diye — reddedilen bir fırsat için yeniden rapor açılabilir).
  const eligibleOpportunities = useMemo(() => {
    if (!data) return []
    const activeOppIds = new Set((data.raporlar ?? []).filter((r) => r.durum !== 'reddedildi').map((r) => r.opportunityId))
    return (data.opportunities ?? []).filter((o) => o.claimerId === user.id && o.status === 'kapandi' && !activeOppIds.has(o.id))
  }, [data, user.id])

  // Danışman: kendi oluşturduğu ya da ortak katılımcısı olduğu raporlar.
  // Broker/owner: RLS zaten herkesinkini döndürüyor, filtre gereksiz.
  const visibleReports = useMemo(() => {
    const all = data?.raporlar ?? []
    if (isApprover) return all
    return all.filter((r) => r.olusturanId === user.id || r.katilimcilar?.some((k) => k.danismanId === user.id))
  }, [data, isApprover, user.id])

  const pendingReports = useMemo(() => visibleReports.filter((r) => r.durum === 'onay_bekliyor'), [visibleReports])
  const otherReports = useMemo(() => visibleReports.filter((r) => r.durum !== 'onay_bekliyor'), [visibleReports])

  function opportunityLabel(id) {
    const o = data?.opportunities?.find((o) => o.id === id)
    return o ? o.ozet || o.konum : 'Fırsat'
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const created = await ciroRaporlariProvider.create(form, user.id)
      await ciroRaporlariProvider.submit(created.id)
      setShowFormModal(false)
      showToast('Ciro raporu onaya gönderildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Gönderilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove(id) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.approve(id, user.id)
      showToast('Rapor onaylandı — Lig ve Mentor Primi güncellendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Onaylanamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject(redSebebi) {
    setSubmitting(true)
    try {
      await ciroRaporlariProvider.reject(rejectTarget, redSebebi)
      setRejectTarget(null)
      showToast('Rapor reddedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Reddedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResubmit(id) {
    try {
      await ciroRaporlariProvider.submit(id)
      showToast('Rapor yeniden onaya gönderildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Gönderilemedi, tekrar dene.', 'error')
    }
  }

  async function handleSaveFatura(katilimciId, form) {
    const faturaTutari = form.faturaTutari ? Number(form.faturaTutari) : null
    const kdvOrani = form.kdvOrani !== '' ? Number(form.kdvOrani) : null
    const kdvHaricTutar = faturaTutari != null && kdvOrani != null ? Math.round((faturaTutari / (1 + kdvOrani / 100)) * 100) / 100 : null
    try {
      await ciroRaporlariProvider.updateKatilimciFatura(katilimciId, {
        faturaNo: form.faturaNo || null,
        faturaTarihi: form.faturaTarihi || null,
        faturaTutari,
        kdvOrani,
        kdvHaricTutar,
        vergiNo: form.vergiNo || null,
        faturaDosyaUrl: form.faturaDosyaUrl || null,
      })
      showToast('Fatura bilgisi kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    }
  }

  async function handleToggleOdeme(katilimciId, odemeDurumu) {
    try {
      await ciroRaporlariProvider.updateKatilimciFatura(katilimciId, { odemeDurumu })
      reload()
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    }
  }

  function renderReportRow(r) {
    const isExpanded = expandedId === r.id
    const isOwner = r.olusturanId === user.id
    return (
      <div key={r.id} className="rounded-2xl border border-border-default bg-surface-raised p-4">
        <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="flex w-full items-center justify-between gap-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-text-primary">{opportunityLabel(r.opportunityId)}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CIRO_RAPORU_DURUM_STYLES[r.durum]}`}>
                {CIRO_RAPORU_DURUM_LABELS[r.durum]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {ISLEM_TIPI_LABELS[r.islemTipi]} · {tl(r.islemTutari)} · {formatDateOnly(r.islemTarihi)}
            </p>
          </div>
          {isExpanded ? <ChevronUp size={16} className="shrink-0 text-text-muted" /> : <ChevronDown size={16} className="shrink-0 text-text-muted" />}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
            {r.notlar && <p className="text-xs text-text-muted">Not: {r.notlar}</p>}
            {r.durum === 'reddedildi' && r.redSebebi && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">Red sebebi: {r.redSebebi}</p>
            )}
            {(r.katilimcilar ?? []).map((k) => (
              <CiroRaporuKatilimciRow
                key={k.id}
                k={k}
                userName={userName}
                isOwnRow={k.danismanId === user.id}
                canToggleOdeme={isApprover}
                onSaveFatura={handleSaveFatura}
                onToggleOdeme={handleToggleOdeme}
                submitting={submitting}
              />
            ))}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {isDanisman && isOwner && r.durum === 'reddedildi' && (
                <button
                  onClick={() => handleResubmit(r.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-border-subtle"
                >
                  <RotateCcw size={13} /> Yeniden Gönder
                </button>
              )}
              {isApprover && r.durum === 'onay_bekliyor' && (
                <>
                  <button
                    onClick={() => setRejectTarget(r.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-surface-sunken px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <XIcon size={13} /> Reddet
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={13} /> Onayla
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Ciro Raporları</h1>
          <p className="text-sm text-text-muted">
            {isDanisman ? 'Kapattığın işlemleri raporla, broker onayladığında Lig ve Mentor Primi otomatik güncellenir.' : 'Danışmanların gönderdiği ciro raporlarını onayla/reddet.'}
          </p>
        </div>
        {isDanisman && (
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Ciro Raporu
          </button>
        )}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="space-y-5">
          {isApprover && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-text-primary">Onay Bekleyenler ({pendingReports.length})</h2>
              {pendingReports.length === 0 ? (
                <p className="text-sm text-text-muted">Onay bekleyen rapor yok.</p>
              ) : (
                <div className="space-y-2">{pendingReports.map(renderReportRow)}</div>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold text-text-primary">{isApprover ? 'Diğer Raporlar' : 'Raporlarım'}</h2>
            {(isApprover ? otherReports : visibleReports).length === 0 ? (
              <p className="text-sm text-text-muted">Henüz rapor yok.</p>
            ) : (
              <div className="space-y-2">{(isApprover ? otherReports : visibleReports).map(renderReportRow)}</div>
            )}
          </div>
        </div>
      )}

      {showFormModal && (
        <CiroRaporuFormModal
          onClose={() => setShowFormModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          opportunities={eligibleOpportunities}
          danismanOptions={danismanOptions}
          anlasmalar={data?.anlasmalar ?? []}
          user={user}
        />
      )}

      {rejectTarget && (
        <RejectCiroRaporuModal onClose={() => setRejectTarget(null)} onSubmit={handleReject} submitting={submitting} />
      )}
    </div>
  )
}
