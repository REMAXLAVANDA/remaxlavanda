import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { recruiting as recruitingProvider } from '../lib/dataProvider'
import { canManageRecruiting, matchesKayitTipiFilter } from '../lib/recruiting'
import RecruitingTable from '../components/recruiting/RecruitingTable'
import RecruitingFilters from '../components/recruiting/RecruitingFilters'
import RecruitingDetailModal from '../components/recruiting/RecruitingDetailModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

// kayitTipi varsayılan 'aktif' — arşiv taşımasıyla gelen ~421 'gecmis'
// kaydı listeyi kirletmesin diye (bkz. lib/recruiting.js
// matchesKayitTipiFilter, AI_NOTLARI.md).
const INITIAL_FILTERS = { durum: 'tumu', atananId: 'tumu', kayitTipi: 'aktif' }

export default function Recruiting() {
  const { role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data: candidates, setData: setCandidates, loading, error, reload } = useAsyncList(
    () => recruitingProvider.list(),
    [],
  )
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [showModal, setShowModal] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const resolveName = (id) => knownUsers[id]?.name ?? '—'
  const danismanOptions = Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi)

  const visible = useMemo(() => {
    const list = candidates ?? []
    return list
      .filter((c) => filters.durum === 'tumu' || c.durum === filters.durum)
      .filter((c) => {
        if (filters.atananId === 'tumu') return true
        if (filters.atananId === 'atanmadi') return !c.atananDanismanId
        return c.atananDanismanId === filters.atananId
      })
      .filter((c) => matchesKayitTipiFilter(c, filters.kayitTipi))
  }, [candidates, filters])

  async function handleSave(form) {
    setSubmitting(true)
    try {
      if (editingCandidate) {
        const updated = await recruitingProvider.update(editingCandidate.id, form)
        setCandidates((prev) => prev.map((c) => (c.id === editingCandidate.id ? updated : c)))
        showToast('Aday güncellendi.', 'success')
      } else {
        const created = await recruitingProvider.create(form)
        setCandidates((prev) => [created, ...prev])
        showToast('Aday eklendi.', 'success')
      }
      setEditingCandidate(null)
      setShowModal(false)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // kayit_tipi='gecmis' olan HER kayıtta görünür (durum fark etmez) —
  // 358 "Beklemede" arşiv kaydı zaten yeni_basvuru olarak gelecek, onları
  // raporlu sürece almak tam olarak bu demek. Sadece 'olumsuz' ise
  // 'yeni_basvuru'ya çekilir, değilse durum korunur (bkz. AI_NOTLARI.md).
  async function handleReactivate(candidate) {
    setSubmitting(true)
    try {
      const patch = {
        kayitTipi: 'manuel',
        yenidenAktifAt: new Date().toISOString(),
      }
      if (candidate.durum === 'olumsuz') patch.durum = 'yeni_basvuru'
      const updated = await recruitingProvider.update(candidate.id, patch)
      setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? updated : c)))
      setEditingCandidate(null)
      showToast('Aday yeniden aktifleştirildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Aktifleştirilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Lead Havuzu ile aynı ikinci savunma katmanı — recruiting_manage RLS'i
  // zaten veriyi engelliyor (bkz. lib/recruiting.js canManageRecruiting).
  if (!canManageRecruiting(role)) return <Navigate to="/panel" replace />

  return (
    <div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="mb-5">
            <RecruitingFilters
              filters={filters}
              onChange={setFilters}
              danismanOptions={danismanOptions}
              onNewCandidateClick={() => setShowModal(true)}
            />
          </div>

          <RecruitingTable candidates={visible} resolveName={resolveName} onRowClick={setEditingCandidate} />
        </>
      )}

      {(showModal || editingCandidate) && (
        <RecruitingDetailModal
          candidate={editingCandidate}
          existingCandidates={candidates ?? []}
          onClose={() => {
            setShowModal(false)
            setEditingCandidate(null)
          }}
          onSubmit={handleSave}
          onReactivate={handleReactivate}
          submitting={submitting}
        />
      )}
    </div>
  )
}
