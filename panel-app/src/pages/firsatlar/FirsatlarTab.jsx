import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { opportunities as opportunitiesProvider } from '../../lib/dataProvider'
import {
  canCloseOpportunity,
  canDeleteOpportunity,
  canEditOpportunity,
  canViewOpportunity,
  computeBoxCounts,
} from '../../lib/opportunities'
import { isStaleOpp } from '../../lib/attention'
import { parseThousands } from '../../lib/format'
import { ROLES } from '../../lib/roles'
import OpportunitySection from '../../components/opportunities/OpportunitySection'
import OpportunityTable from '../../components/opportunities/OpportunityTable'
import OpportunityDetailModal from '../../components/opportunities/OpportunityDetailModal'
import NewOpportunityModal from '../../components/opportunities/NewOpportunityModal'
import EditOpportunityModal from '../../components/opportunities/EditOpportunityModal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import FocusBanner from '../../components/common/FocusBanner'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

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
  const [expanded, setExpanded] = useState({ satici: true, alici: true })
  const [activeCategory, setActiveCategory] = useState({ satici: null, alici: null })
  const [detailOpp, setDetailOpp] = useState(null)
  const [expressingId, setExpressingId] = useState(null)
  const [interestTargetId, setInterestTargetId] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editingSubmitting, setEditingSubmitting] = useState(false)
  const [closingId, setClosingId] = useState(null)
  const [assigningId, setAssigningId] = useState(null)
  // Bu oturumda ilgi gösterilen fırsatlar — sunucudan tekrar sorgulamadan
  // "İlgileniyorum" butonunu anında güncellemek için (bkz. performExpressInterest).
  const [interestedIds, setInterestedIds] = useState(() => new Set())
  // "Yeni Fırsat" artık kendi üst satırı yerine Satıcılar/Alıcılar
  // bölümlerinin başlığında bir "+" butonu — hangisine basıldığına göre
  // modal doğru tip (satıcı/alıcı) ile önceden dolu açılır.
  const [createType, setCreateType] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const roleVisible = useMemo(
    () => (opportunities ?? []).filter((o) => canViewOpportunity(o, user)),
    [opportunities, user],
  )

  // Panel'in "Dikkat Gerekiyor" bölümünden ?odak=1 ile gelindiğinde, normal
  // kategori-kutusu gezinmesi yerine SADECE 3 günden uzun süredir havuzda
  // bekleyen fırsatları düz bir liste olarak gösteriyoruz.
  const odakActive = searchParams.get('odak') === 'firsat'
  const odakRows = useMemo(
    () => (odakActive ? roleVisible.filter((o) => isStaleOpp(o)) : []),
    [roleVisible, odakActive],
  )

  const boxes = useMemo(() => computeBoxCounts(roleVisible), [roleVisible])

  function sectionData(type) {
    const typeBoxes = boxes.filter((b) => b.type === type)
    const total = roleVisible.filter((o) => o.type === type).length
    const category = activeCategory[type]
    const rows = category
      ? roleVisible
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
      // Broker da fiilen danışmanlık yapabiliyor (kendi getirdiği müşteriyi
      // kendine alabilmesi lazım) — owner/ofis bu kapsam dışı, onlar kendi
      // portföyü olarak tutmaz. Bkz. NewOpportunityModal showPoolToggle.
      const selfClaim = (role === ROLES.DANISMAN || role === ROLES.BROKER) && !form.havuzaAt
      const created = await opportunitiesProvider.create(payload, user.id, selfClaim)
      setOpportunities((prev) => [created, ...prev])
      setCreateType(null)
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

  async function handleEditSubmit(form) {
    if (!editTarget) return
    setEditingSubmitting(true)
    try {
      const payload = {
        ...form,
        fiyat: parseThousands(form.fiyat),
        fiyatMin: parseThousands(form.fiyatMin),
        fiyatMax: parseThousands(form.fiyatMax),
        m2: form.m2 ? Number(form.m2) : null,
      }
      const updated = await opportunitiesProvider.update(editTarget.opp.id, payload)
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setEditTarget(null)
      setDetailOpp(null)
      showToast('Fırsat güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setEditingSubmitting(false)
    }
  }

  async function performClose(id, status) {
    setClosingId(id)
    try {
      const updated = await opportunitiesProvider.close(id, status)
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setDetailOpp(null)
      showToast(status === 'kapandi' ? 'Fırsat kapandı — müşteri bulundu.' : 'Fırsat iptal edildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fırsat kapatılamadı, tekrar dene.', 'error')
    } finally {
      setClosingId(null)
    }
  }

  async function performAssign(id, userId) {
    setAssigningId(id)
    try {
      const updated = await opportunitiesProvider.assignTo(id, userId)
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setDetailOpp(null)
      showToast('Fırsat atandı.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fırsat atanamadı, tekrar dene.', 'error')
    } finally {
      setAssigningId(null)
    }
  }

  const canCreate = CAN_CREATE_ROLES.includes(role)
  const canDelete = canDeleteOpportunity(role)
  const interestOpp = interestTargetId ? (opportunities ?? []).find((o) => o.id === interestTargetId) : null
  const deleteOpp = deleteTargetId ? (opportunities ?? []).find((o) => o.id === deleteTargetId) : null
  const isManager = role === ROLES.BROKER || role === ROLES.OWNER
  const resolveName = (id) => knownUsers[id]?.name ?? '—'
  // Broker de fiilen danışmanlık yapabiliyor (bkz. handleCreate) — atama
  // listesi de aynı kapsamda: danışmanlar + broker.
  const assignableOptions = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman' || u.role === 'broker')

  return (
    <div>
      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && odakActive && (
        <>
          <FocusBanner
            text={`${odakRows.length} fırsat 3 günden uzun süredir havuzda bekliyor — sadece bunlar gösteriliyor.`}
            onClear={() => setSearchParams({})}
          />
          <OpportunityTable
            opportunities={odakRows}
            onRowClick={setDetailOpp}
            onExpressInterest={(opp) => setInterestTargetId(opp.id)}
            expressingId={expressingId}
            user={user}
            interestedIds={interestedIds}
          />
        </>
      )}

      {!loading && !error && !odakActive && (
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
            onCreateClick={canCreate ? () => setCreateType('satici') : undefined}
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
            onCreateClick={canCreate ? () => setCreateType('alici') : undefined}
          />
        </div>
      )}

      {createType && (
        <NewOpportunityModal
          defaultType={createType}
          onClose={() => setCreateType(null)}
          onSubmit={handleCreate}
          submitting={submitting}
          showPoolToggle={role === ROLES.DANISMAN || role === ROLES.BROKER}
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
          canEdit={canEditOpportunity(detailOpp, user)}
          canClose={canCloseOpportunity(detailOpp, user)}
          canAssign={isManager && detailOpp.status === 'acik' && !detailOpp.claimerId}
          assignableOptions={assignableOptions}
          fetchContact={() => opportunitiesProvider.getContact(detailOpp.id, user)}
          fetchInterestList={() => opportunitiesProvider.listInterest(detailOpp.id)}
          onClose={() => setDetailOpp(null)}
          onExpressInterest={() => setInterestTargetId(detailOpp.id)}
          onDeleteRequest={() => setDeleteTargetId(detailOpp.id)}
          onEditRequest={(contact) => setEditTarget({ opp: detailOpp, contact })}
          onCloseRequest={(status) => performClose(detailOpp.id, status)}
          onAssignRequest={(userId) => performAssign(detailOpp.id, userId)}
          expressing={expressingId === detailOpp.id}
          closing={closingId === detailOpp.id}
          assigning={assigningId === detailOpp.id}
        />
      )}

      {editTarget && (
        <EditOpportunityModal
          opportunity={editTarget.opp}
          contact={editTarget.contact}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditSubmit}
          submitting={editingSubmitting}
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
