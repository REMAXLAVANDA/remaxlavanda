import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { opportunities as opportunitiesProvider } from '../../lib/dataProvider'
import { canDeleteOpportunity, canViewOpportunity, computeBoxCounts, isWithinRange } from '../../lib/opportunities'
import { parseThousands } from '../../lib/format'
import { ROLES } from '../../lib/roles'
import OpportunitySection from '../../components/opportunities/OpportunitySection'
import OpportunityDetailModal from '../../components/opportunities/OpportunityDetailModal'
import OpportunityFilters from '../../components/opportunities/OpportunityFilters'
import NewOpportunityModal from '../../components/opportunities/NewOpportunityModal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

const INITIAL_FILTERS = { search: '', dateRange: '7g', customFrom: '', customTo: '' }

// RLS'teki opportunities_insert kuralıyla birebir aynı: broker/owner/ofis
// serbestçe ekler (açık havuza düşer); danışman da ekleyebilir ama kendi
// bulduğu müşteri direkt kendine atanmış olarak kaydedilir (bkz. handleCreate).
const CAN_CREATE_ROLES = ['broker', 'owner', 'ofis', 'danisman']

export default function FirsatlarTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data: opportunities, setData: setOpportunities, loading, error, reload } = useAsyncList(
    () => opportunitiesProvider.list(),
    [],
  )
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [expanded, setExpanded] = useState({ satici: true, alici: true })
  const [activeCategory, setActiveCategory] = useState({ satici: null, alici: null })
  const [detailOpp, setDetailOpp] = useState(null)
  const [expressingId, setExpressingId] = useState(null)
  const [interestTargetId, setInterestTargetId] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // Bu oturumda ilgi gösterilen fırsatlar — sunucudan tekrar sorgulamadan
  // "İlgileniyorum" butonunu anında güncellemek için (bkz. performExpressInterest).
  const [interestedIds, setInterestedIds] = useState(() => new Set())
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const roleVisible = useMemo(
    () => (opportunities ?? []).filter((o) => canViewOpportunity(o, user)),
    [opportunities, user],
  )

  const filtered = useMemo(() => {
    return roleVisible
      .filter((o) => isWithinRange(o.createdAt, filters.dateRange, filters.customFrom, filters.customTo))
      .filter((o) => {
        if (!filters.search.trim()) return true
        const q = filters.search.trim().toLowerCase()
        return (o.konum ?? '').toLowerCase().includes(q)
      })
  }, [roleVisible, filters])

  const boxes = useMemo(() => computeBoxCounts(filtered), [filtered])

  function sectionData(type) {
    const typeBoxes = boxes.filter((b) => b.type === type)
    const total = filtered.filter((o) => o.type === type).length
    const category = activeCategory[type]
    const rows = category
      ? filtered
          .filter((o) => o.type === type && o.category === category)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : []
    return { typeBoxes, total, category, rows }
  }

  const satici = sectionData('satici')
  const alici = sectionData('alici')

  async function performExpressInterest(id) {
    setExpressingId(id)
    try {
      await opportunitiesProvider.expressInterest(id, user.id)
      setInterestedIds((prev) => new Set(prev).add(id))
      showToast('İlgin, fırsatı giren kişiye bildirildi — seni arayacak.', 'success')
      setDetailOpp(null)
    } catch (err) {
      showToast(err.message ?? 'İlgi kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setExpressingId(null)
      setInterestTargetId(null)
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        fiyat: parseThousands(form.fiyat),
        fiyatMin: parseThousands(form.fiyatMin),
        fiyatMax: parseThousands(form.fiyatMax),
        m2: form.m2 ? Number(form.m2) : null,
      }
      const selfClaim = role === ROLES.DANISMAN && !form.havuzaAt
      const created = await opportunitiesProvider.create(payload, user.id, selfClaim)
      setOpportunities((prev) => [created, ...prev])
      setShowModal(false)
      showToast('Fırsat eklendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fırsat kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function performDelete(id) {
    setDeleting(true)
    try {
      await opportunitiesProvider.remove(id)
      setOpportunities((prev) => prev.filter((o) => o.id !== id))
      setDetailOpp(null)
      showToast('Fırsat silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fırsat silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const canCreate = CAN_CREATE_ROLES.includes(role)
  const canDelete = canDeleteOpportunity(role)
  const interestOpp = interestTargetId ? (opportunities ?? []).find((o) => o.id === interestTargetId) : null
  const deleteOpp = deleteTargetId ? (opportunities ?? []).find((o) => o.id === deleteTargetId) : null
  const isManager = role === ROLES.BROKER || role === ROLES.OWNER
  const resolveName = (id) => knownUsers[id]?.name ?? '—'

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ink-500">{loading ? 'Yükleniyor...' : `${filtered.length} kayıt görünüyor`}</p>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Fırsat
          </button>
        )}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="mb-5">
            <OpportunityFilters filters={filters} onChange={setFilters} />
          </div>

          <div className="space-y-4">
            <OpportunitySection
              dotColor="bg-emerald-500"
              label="🟢 Satıcılar"
              total={satici.total}
              expanded={expanded.satici}
              onToggleExpanded={() => setExpanded((f) => ({ ...f, satici: !f.satici }))}
              boxes={satici.typeBoxes}
              activeCategory={satici.category}
              onSelectCategory={(category) => setActiveCategory((f) => ({ ...f, satici: category }))}
              tableRows={satici.rows}
              onRowClick={setDetailOpp}
              onExpressInterest={(opp) => setInterestTargetId(opp.id)}
              expressingId={expressingId}
              user={user}
              interestedIds={interestedIds}
            />

            <OpportunitySection
              dotColor="bg-blue-500"
              label="🔵 Alıcılar"
              total={alici.total}
              expanded={expanded.alici}
              onToggleExpanded={() => setExpanded((f) => ({ ...f, alici: !f.alici }))}
              boxes={alici.typeBoxes}
              activeCategory={alici.category}
              onSelectCategory={(category) => setActiveCategory((f) => ({ ...f, alici: category }))}
              tableRows={alici.rows}
              onRowClick={setDetailOpp}
              onExpressInterest={(opp) => setInterestTargetId(opp.id)}
              expressingId={expressingId}
              user={user}
              interestedIds={interestedIds}
            />
          </div>
        </>
      )}

      {showModal && (
        <NewOpportunityModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          showPoolToggle={role === ROLES.DANISMAN}
        />
      )}

      {detailOpp && (
        <OpportunityDetailModal
          opportunity={detailOpp}
          user={user}
          ownerName={resolveName(detailOpp.ownerId)}
          resolveName={resolveName}
          isOwnerOrManager={isManager || detailOpp.ownerId === user.id}
          alreadyInterested={interestedIds.has(detailOpp.id)}
          canDelete={canDelete}
          fetchContact={() => opportunitiesProvider.getContact(detailOpp.id, user)}
          fetchInterestList={() => opportunitiesProvider.listInterest(detailOpp.id)}
          onClose={() => setDetailOpp(null)}
          onExpressInterest={() => setInterestTargetId(detailOpp.id)}
          onDeleteRequest={() => setDeleteTargetId(detailOpp.id)}
          expressing={expressingId === detailOpp.id}
        />
      )}

      {interestTargetId && (
        <ConfirmDialog
          title="Bu fırsata ilgi göstermek istiyor musun?"
          message={
            interestOpp
              ? `"${interestOpp.konum || 'Bu fırsat'}" için ilgin, fırsatı giren kişiye bildirilir — müşteri bilgisi sana açılmaz, seni arayacak.`
              : 'İlgin, fırsatı giren kişiye bildirilir — müşteri bilgisi sana açılmaz, seni arayacak.'
          }
          confirmLabel="Evet, ilgileniyorum"
          onConfirm={() => performExpressInterest(interestTargetId)}
          onCancel={() => setInterestTargetId(null)}
          confirming={expressingId === interestTargetId}
        />
      )}

      {deleteTargetId && (
        <ConfirmDialog
          title="Bu fırsatı silmek istiyor musun?"
          message={
            deleteOpp
              ? `"${deleteOpp.konum || 'Bu fırsat'}" kalıcı olarak silinecek, geri alınamaz.`
              : 'Bu fırsat kalıcı olarak silinecek, geri alınamaz.'
          }
          confirmLabel="Evet, sil"
          tone="danger"
          onConfirm={() => performDelete(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
          confirming={deleting}
        />
      )}
    </div>
  )
}
