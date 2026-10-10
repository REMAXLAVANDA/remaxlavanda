import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { opportunities as opportunitiesProvider, users as usersProvider, auditLog as auditLogProvider } from '../../lib/dataProvider'
import {
  canCloseOpportunity,
  canDeleteOpportunity,
  canEditOpportunity,
  canReleaseToPool,
  canViewOpportunity,
  buildOpportunityTree,
  legacyCategoryOpportunities,
} from '../../lib/opportunities'
import { isStaleOpp } from '../../lib/attention'
import { parseThousands, sortByName } from '../../lib/format'
import { ROLES } from '../../lib/roles'
import OpportunityCategoryTree from '../../components/opportunities/OpportunityCategoryTree'
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
  const isManager = role === ROLES.BROKER || role === ROLES.OWNER
  // allUsers: SADECE yönetici görünümünde — pasife alınan bir danışmana
  // ait fırsatta sahip/üstlenen ismi knownUsers'ta (sadece aktif
  // kullanıcılar) bulunamayıp "—" gösteriliyordu, "atanmadı"yla
  // karışıyordu (bkz. Operasyon'daki aynı düzeltme, 2026-10).
  const { data, setData, loading, error, reload } = useAsyncList(
    () =>
      Promise.all([opportunitiesProvider.list(), isManager ? usersProvider.listAll() : Promise.resolve([])]).then(
        ([opps, allUsers]) => ({ opps, allUsers }),
      ),
    [],
  )
  const opportunities = data?.opps ?? null
  const setOpportunities = (updater) =>
    setData((prev) => ({ ...prev, opps: typeof updater === 'function' ? updater(prev?.opps ?? null) : updater }))
  const allUsersById = useMemo(() => {
    const map = {}
    for (const u of data?.allUsers ?? []) map[u.id] = u
    return map
  }, [data])
  // Kategori+İşlemTipi kombinasyonu — Taraf (Satıcı/Alıcı) artık ayrı bir
  // kutu değil, seçili kutunun içinde iki ayrı blok (bkz.
  // OpportunityCategoryTree.jsx, broker 2026-10-10: "konut tıkladım,
  // alıcı/satıcı alt alta olsa").
  const [path, setPath] = useState({ category: null, islemTipi: null })
  const [detailOpp, setDetailOpp] = useState(null)
  const [expressingId, setExpressingId] = useState(null)
  const [interestTargetId, setInterestTargetId] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editingSubmitting, setEditingSubmitting] = useState(false)
  const [closingId, setClosingId] = useState(null)
  const [assigningId, setAssigningId] = useState(null)
  const [releasingId, setReleasingId] = useState(null)
  // Bu oturumda ilgi gösterilen fırsatlar — sunucudan tekrar sorgulamadan
  // "İlgileniyorum" butonunu anında güncellemek için (bkz. performExpressInterest).
  const [interestedIds, setInterestedIds] = useState(() => new Set())
  // "Yeni Fırsat" artık TEK, her zaman görünen bir buton (broker, 2026-10-10:
  // "fırsat ekleme bir tane olsun") — modal kendi varsayılanlarıyla açılır
  // (ilk kategori, Satıcı), kategori/tip/taraf içeride değiştirilebilir.
  const [createContext, setCreateContext] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Owner'a broker'ın fiilen üstlendiği fırsatları gizlemek için hangi
  // kullanıcının hangi rolde olduğunu bilmemiz lazım — knownUsers zaten
  // Panel/Lig gibi her yerde yüklü, ek bir sorgu gerekmiyor (bkz.
  // canViewOpportunity notu).
  const resolveHolderRole = (id) => knownUsers[id]?.role
  const roleVisible = useMemo(
    () => (opportunities ?? []).filter((o) => canViewOpportunity(o, user, resolveHolderRole)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opportunities, user, knownUsers],
  )

  // "Benim girdiklerim" ayrımı — açık havuzdaki diğer herkesin fırsatları
  // arasında kendi girdiğini bulamayan danışman şikayeti üzerine (2026-10-10:
  // "ben girdiğim fırsatları göremiyorum"). Veride/erişimde bir sorun yoktu
  // (owner_id = kendisi zaten her zaman görünür, bkz. canViewOpportunity) —
  // sorun kutu+taraf gezinmesinde havuzdakilerle karışıp gözden kaçmasıydı.
  const [onlyMine, setOnlyMine] = useState(false)
  const scopedVisible = useMemo(
    () => (onlyMine ? roleVisible.filter((o) => o.ownerId === user.id) : roleVisible),
    [roleVisible, onlyMine, user],
  )

  // Panel'in "Dikkat Gerekiyor" bölümünden ?odak=1 ile gelindiğinde, normal
  // kategori-kutusu gezinmesi yerine SADECE 3 günden uzun süredir havuzda
  // bekleyen fırsatları düz bir liste olarak gösteriyoruz.
  const odakActive = searchParams.get('odak') === 'firsat'
  const odakRows = useMemo(
    () => (odakActive ? roleVisible.filter((o) => isStaleOpp(o)) : []),
    [roleVisible, odakActive],
  )

  const tree = useMemo(() => buildOpportunityTree(scopedVisible), [scopedVisible])
  const legacyOpps = useMemo(() => legacyCategoryOpportunities(scopedVisible), [scopedVisible])
  // "Kategorisi belirsiz" bandı sadece yönetim rollerine — bu bir veri
  // hijyeni konusu, danışman ekranını sade tutmak isteyen broker kararıyla
  // (2026-09-17) uyumlu.
  const canSeeLegacyReview = role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS

  // Seçili Kategori+İşlemTipi için Satıcı ve Alıcı listeleri ayrı ayrı —
  // OpportunityCategoryTree bunları iki ayrı blok olarak alt alta gösterir.
  const rowsByTaraf = useMemo(() => {
    if (!path.category || !path.islemTipi) return { satici: [], alici: [] }
    const base = scopedVisible.filter((o) => o.category === path.category && o.islemTipi === path.islemTipi)
    const byType = (type) => base.filter((o) => o.type === type).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return { satici: byType('satici'), alici: byType('alici') }
  }, [scopedVisible, path])

  function handleSelectBranch(category, islemTipi) {
    setPath({ category, islemTipi })
  }

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
      setCreateContext(null)
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

  // gerekce (opsiyonel): Yönlendirme Durumu "Kapalı" bir danışmana yine de
  // atanırsa OpportunityDetailModal gerekçeyi zorunlu kılıp buraya geçirir —
  // atama başarılı olduktan sonra audit_log'a yazılır (bkz. migration
  // 20261006120000).
  async function performAssign(id, userId, gerekce) {
    setAssigningId(id)
    try {
      const updated = await opportunitiesProvider.assignTo(id, userId)
      if (gerekce) {
        await auditLogProvider.logDusukPuanAtama({
          tablo: 'opportunities',
          kayitId: id,
          danismanId: userId,
          gerekce,
          actorId: user.id,
        })
      }
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setDetailOpp(null)
      showToast('Fırsat atandı.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fırsat atanamadı, tekrar dene.', 'error')
    } finally {
      setAssigningId(null)
    }
  }

  // "Havuza ekleme tikini yanlışlıkla tıklamadım" telafisi (broker,
  // 2026-10-10) — release_opportunity_to_pool() RPC'si claimer/claimed_at'ı
  // temizler, durumu 'acik'e döndürür (bkz. lib/opportunities.js
  // canReleaseToPool, migration 20261010200000).
  async function performRelease(id) {
    setReleasingId(id)
    try {
      const updated = await opportunitiesProvider.releaseToPool(id)
      setOpportunities((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setDetailOpp(null)
      showToast('Fırsat havuza bırakıldı.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Fırsat havuza bırakılamadı, tekrar dene.', 'error')
    } finally {
      setReleasingId(null)
    }
  }

  const canCreate = CAN_CREATE_ROLES.includes(role)

  // Mobil alt navigasyondaki "+" kısayolundan ?yeni=firsat ile gelindiğinde
  // yeni fırsat formu otomatik açılır (satıcı varsayılan) — parametre
  // hemen temizlenir ki sayfa yenilenince tekrar açılmasın.
  useEffect(() => {
    if (searchParams.get('yeni') === 'firsat' && canCreate) {
      setCreateContext({ type: 'satici' })
      const next = new URLSearchParams(searchParams)
      next.delete('yeni')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const canDelete = canDeleteOpportunity(role)
  const interestOpp = interestTargetId ? (opportunities ?? []).find((o) => o.id === interestTargetId) : null
  const deleteOpp = deleteTargetId ? (opportunities ?? []).find((o) => o.id === deleteTargetId) : null
  // bkz. dosya başındaki allUsersById notu — pasif kullanıcı burada
  // "(pasif)" etiketiyle gösterilir, "—" ile atanmamışla karışmaz.
  const resolveName = (id) => {
    if (knownUsers[id]) return knownUsers[id].name
    const u = allUsersById[id]
    return u ? `${u.name} (pasif)` : '—'
  }
  // Broker de fiilen danışmanlık yapabiliyor (bkz. handleCreate) — atama
  // listesi de aynı kapsamda: danışmanlar + broker.
  const assignableOptions = sortByName(Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman' || u.role === 'broker'))

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
          {/* Kutular artık boşsa hiç görünmüyor (bkz. OpportunityCategoryTree.jsx) —
              bu yüzden genel, her zaman görünen bir ekleme butonu şart; aksi halde
              hiç fırsatı olmayan biri nereye tıklayacağını bulamaz (broker, 2026-10-10:
              "fırsat ekleme ikonu nerde"). Kategori/tip seçimi olmadan açılır, modal
              kendi varsayılanlarıyla (ilk kategori, Satıcı) gelir, içeride değiştirilebilir. */}
          {canCreate && (
            <div className="flex items-center justify-end gap-2">
              <div className="flex rounded-lg border border-border-default bg-surface-raised p-0.5 text-sm">
                <button
                  onClick={() => setOnlyMine(false)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    !onlyMine ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Herkes
                </button>
                <button
                  onClick={() => setOnlyMine(true)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    onlyMine ? 'bg-brand-600 text-white' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Girdiklerim
                </button>
              </div>
              <button
                onClick={() => setCreateContext({ type: 'satici' })}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus size={16} /> Yeni Fırsat
              </button>
            </div>
          )}

          <OpportunityCategoryTree
            tree={tree}
            path={path}
            onSelectBranch={handleSelectBranch}
            rowsByTaraf={rowsByTaraf}
            onRowClick={setDetailOpp}
            onExpressInterest={(opp) => setInterestTargetId(opp.id)}
            expressingId={expressingId}
            user={user}
            interestedIds={interestedIds}
            legacyOpps={legacyOpps}
            canSeeLegacyReview={canSeeLegacyReview}
          />
        </div>
      )}

      {createContext && (
        <NewOpportunityModal
          defaultType={createContext.type}
          initialValues={createContext.category ? { category: createContext.category, islemTipi: createContext.islemTipi } : undefined}
          onClose={() => setCreateContext(null)}
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
          canRelease={canReleaseToPool(detailOpp, user)}
          assignableOptions={assignableOptions}
          fetchContact={() => opportunitiesProvider.getContact(detailOpp.id, user)}
          fetchInterestList={() => opportunitiesProvider.listInterest(detailOpp.id)}
          onClose={() => setDetailOpp(null)}
          onExpressInterest={() => setInterestTargetId(detailOpp.id)}
          onDeleteRequest={() => setDeleteTargetId(detailOpp.id)}
          onEditRequest={(contact) => setEditTarget({ opp: detailOpp, contact })}
          onCloseRequest={(status) => performClose(detailOpp.id, status)}
          onAssignRequest={(userId, gerekce) => performAssign(detailOpp.id, userId, gerekce)}
          onReleaseRequest={() => performRelease(detailOpp.id)}
          expressing={expressingId === detailOpp.id}
          closing={closingId === detailOpp.id}
          assigning={assigningId === detailOpp.id}
          releasing={releasingId === detailOpp.id}
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
