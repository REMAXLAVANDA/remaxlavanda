import { useMemo, useRef, useState, useEffect } from 'react'
import { Plus, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { education as educationProvider, users as usersProvider } from '../../lib/dataProvider'
import { checklistFor, checklistProgress } from '../../lib/education'
import { sortByName } from '../../lib/format'
import ChecklistPanel from '../../components/education/ChecklistPanel'
import AddChecklistItemModal from '../../components/education/AddChecklistItemModal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

// badges_manage/onboarding_status_manage/onboarding_items_manage RLS'te
// sadece broker/owner. Power Camp modülleri/rozetleri kaldırıldı
// (2026-10-07, broker kararı — "işimize yaramıyor, süreç içine dahil
// edeceğim"), bu sayfada artık SADECE süreç/ayrılış checklist'i var.
const CAN_MANAGE_ROLES = ['broker', 'owner']

const CHECKLIST_TABS = [
  { key: 'baslangic', label: 'Süreç' },
  { key: 'ayrilis', label: 'Ayrılış' },
]

// Yükleme bitmeden önce data null olur — useMemo bağımlılıklarının her
// render'da referans değiştirmemesi için sabit, boş bir dizi kullanılır.
const EMPTY = []

async function loadAll() {
  const [checklistItems, checklistStatus, allUsers] = await Promise.all([
    educationProvider.listChecklistItems(),
    educationProvider.listChecklistStatus(),
    usersProvider.listAll(),
  ])
  return { checklistItems, checklistStatus, allUsers }
}

export default function EgitimTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const isManager = CAN_MANAGE_ROLES.includes(role)
  const [checklistTip, setChecklistTip] = useState('baslangic')
  // Yönetim ÖNCE Süreç/Ayrılış'ı seçip sonra içinde çıkan danışman
  // listesinden birini tıklamalı — eskiden burası varsayılan olarak
  // yöneticinin KENDİ id'sine açılıyordu, bu da danışman listesinde hiç
  // yer almadığı için tarayıcı sessizce ilk danışmanı (ör. "Alper")
  // seçiliymiş GİBİ gösteriyordu, ama gerçek seçili değer yöneticinin
  // kendisiydi — işaretleme o zaman yanlış kişiye yazılırdı (bkz. broker
  // bulgusu 2026-10-07: "şu anki hali direk danışman seçili çıkıyor").
  // Danışmanın kendi görünümünde (isManager=false) seçim gerekmiyor,
  // doğrudan kendi id'si kullanılıyor.
  const [checklistUserId, setChecklistUserId] = useState(isManager ? null : user.id)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  // editingItem dolu olduğunda modal "Maddeyi Düzenle" moduna geçiyor
  // (2026-10-07, broker: "madde ekleme var düzenleme yok") — aynı modal,
  // onAddChecklistItem bu değere bakıp create/update'e karar veriyor.
  const [editingItem, setEditingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // Danışman seçici artık açılır bir kart (ProfileMenu'deki rol değiştirici
  // ile AYNI desen) — broker: "direk tüm danışmanlar görünüyor, saçma,
  // açılır karttan seçelim" (2026-10-07, chip listesi bir önceki turda
  // denenmiş ama beğenilmemişti).
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const checklistItems = data?.checklistItems ?? EMPTY
  const checklistStatus = data?.checklistStatus ?? EMPTY
  const allUsers = data?.allUsers ?? EMPTY

  // Checklist danışman seçimi (2026-10-07'den önce teamMembers'tan AYRI
  // tutulurdu): "Ayrılış" checklist'i tam olarak az önce durumu pasif
  // yapılmış birinin listesi (bkz. "esra sever ayrıldı diye kapattık ama
  // ayrılış menüsünde çıkmıyor") — knownUsers pasif olanı tamamen
  // listeden düşürdüğü için o kişinin ayrılış checklist'i hiç
  // işaretlenemiyordu. allUsers (durum filtresi olmayan listAll())
  // kullanılıyor.
  // Sekmeye göre AYRI listeler (2026-10-07, broker bulgusu: "ayrılanlar
  // süreçte neden görünüyor") — Süreç sadece aktif danışmanlar içindir
  // (onboarding), Ayrılış sadece pasif (ayrılmış) olanlar içindir; eskiden
  // ikisi de AYNI tam listeyi (aktif+pasif karışık) gösteriyordu.
  const checklistUserOptions = useMemo(() => {
    const rows = allUsers.filter(
      (u) =>
        (!u.role || u.role === 'danisman') &&
        !u.testHesabi &&
        (checklistTip === 'ayrilis' ? u.durum !== 'aktif' : u.durum === 'aktif'),
    )
    return sortByName(rows)
  }, [allUsers, checklistTip])

  const checklistEntries = useMemo(
    () => checklistFor(checklistUserId, checklistTip, checklistItems, checklistStatus),
    [checklistUserId, checklistTip, checklistItems, checklistStatus],
  )
  // Danışman Ayrılış checklist'ini hiç görmemeli (kendisiyle ilgisi yok,
  // aktif çalışırken görmesi kafa karıştırıcı) — ve Süreç checklist'i de
  // sadece EKSİĞİ varsa görsün, tamamlanmış bir listeyi göstermeye gerek
  // yok (bkz. broker isteği: "sadece eksiği varsa göster").
  const myBaslangicProgress = useMemo(
    () => checklistProgress(user.id, 'baslangic', checklistItems, checklistStatus),
    [user.id, checklistItems, checklistStatus],
  )
  const showChecklistSection = isManager || myBaslangicProgress.completed < myBaslangicProgress.total

  const userName = (id) => knownUsers[id]?.name ?? '—'

  // İyimser (optimistic) güncelleme (2026-10-07, broker: "checklist üzerinde
  // değişiklik yapılmıyor") — yazma zaten sunucuda başarılı oluyordu (Supabase
  // loglarıyla doğrulandı), ama ekran SADECE ağ isteği dönünce güncelleniyordu;
  // mobil bağlantıda bu gecikme "hiçbir şey olmuyor" hissi veriyordu, özellikle
  // art arda hızlı dokunuşlarda. Artık tıklanır tıklanmaz ekran güncelleniyor,
  // istek başarısız olursa eski haline dönüp hata gösteriliyor.
  async function toggleChecklistItem(itemId) {
    const existing = checklistStatus.find((s) => s.itemId === itemId && s.userId === checklistUserId)
    const previous = checklistStatus
    setData((prev) => ({
      ...prev,
      checklistStatus: existing
        ? prev.checklistStatus.filter((s) => !(s.itemId === itemId && s.userId === checklistUserId))
        : [
            ...prev.checklistStatus,
            { itemId, userId: checklistUserId, doneAt: new Date().toISOString(), doneBy: user.id },
          ],
    }))
    try {
      await educationProvider.toggleChecklistItem(itemId, checklistUserId, !existing, user.id)
    } catch (err) {
      setData((prev) => ({ ...prev, checklistStatus: previous }))
      showToast(err.message ?? 'Checklist güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleSubmitChecklistItem({ tip, baslik }) {
    setSubmitting(true)
    try {
      if (editingItem) {
        const updated = await educationProvider.updateChecklistItem(editingItem.id, baslik)
        setData((prev) => ({
          ...prev,
          checklistItems: prev.checklistItems.map((i) => (i.id === editingItem.id ? { ...i, baslik: updated.baslik } : i)),
        }))
        showToast('Madde güncellendi.', 'success')
      } else {
        const maxOrder = checklistItems.filter((i) => i.tip === tip).reduce((max, i) => Math.max(max, i.sortOrder), 0)
        const created = await educationProvider.createChecklistItem({ tip, baslik, sortOrder: maxOrder + 1 })
        setData((prev) => ({ ...prev, checklistItems: [...prev.checklistItems, created] }))
        showToast('Madde eklendi.', 'success')
      }
      setShowAddItemModal(false)
      setEditingItem(null)
    } catch (err) {
      showToast(err.message ?? (editingItem ? 'Madde güncellenemedi, tekrar dene.' : 'Madde eklenemedi, tekrar dene.'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteChecklistItem() {
    if (!deletingItem) return
    setDeleting(true)
    try {
      await educationProvider.deleteChecklistItem(deletingItem.id)
      setData((prev) => ({
        ...prev,
        checklistItems: prev.checklistItems.filter((i) => i.id !== deletingItem.id),
        // "on delete cascade" sunucuda zaten bu maddeyi işaretlemiş olan
        // herkesin durumunu siliyor — client state'i aynı şekilde temizleniyor.
        checklistStatus: prev.checklistStatus.filter((s) => s.itemId !== deletingItem.id),
      }))
      setDeletingItem(null)
      showToast('Madde silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Madde silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function moveChecklistItem(itemId, direction) {
    const index = checklistEntries.findIndex((e) => e.item.id === itemId)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= checklistEntries.length) return
    const a = checklistEntries[index].item
    const b = checklistEntries[swapIndex].item
    // sortOrder'lar önce sabit değişkenlere alınıyor — aksi halde ikinci
    // updateChecklistItemOrder çağrısı değerlendirilirken (mock sağlayıcı
    // nesneyi eşzamanlı mutasyona uğrattığı için) a.sortOrder artık ilk
    // çağrının yazdığı değeri okur, iki madde de aynı sıraya düşer.
    const aOrder = a.sortOrder
    const bOrder = b.sortOrder
    // İyimser güncelleme (bkz. toggleChecklistItem'daki not) — ekran hemen
    // yer değiştiriyor, ağ isteği arka planda gidiyor. 32 maddelik gerçek
    // listede (bkz. broker'ın eklediği onboarding checklist'i) tek tek
    // yukarı/aşağı tıklarken bu, art arda tıklamaların her birinin görünür
    // bir etkisi olmasını sağlıyor.
    setData((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((it) => {
        if (it.id === a.id) return { ...it, sortOrder: bOrder }
        if (it.id === b.id) return { ...it, sortOrder: aOrder }
        return it
      }),
    }))
    try {
      await Promise.all([
        educationProvider.updateChecklistItemOrder(a.id, bOrder),
        educationProvider.updateChecklistItemOrder(b.id, aOrder),
      ])
    } catch (err) {
      setData((prev) => ({
        ...prev,
        checklistItems: prev.checklistItems.map((it) => {
          if (it.id === a.id) return { ...it, sortOrder: aOrder }
          if (it.id === b.id) return { ...it, sortOrder: bOrder }
          return it
        }),
      }))
      showToast(err.message ?? 'Sıralama değiştirilemedi, tekrar dene.', 'error')
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-text-muted">Süreç ve ayrılış checklist'i</p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {showChecklistSection && (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-text-primary">
                  {isManager ? 'Süreç / Ayrılış Checklist' : 'Süreç Checklist — Eksiklerin'}
                </h2>
                <div className="flex items-center gap-2">
                  {isManager && (
                    <div className="flex gap-1">
                      {CHECKLIST_TABS.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => {
                            // Süreç/Ayrılış artık FARKLI danışman listeleri
                            // gösteriyor (aktif vs ayrılmış) — sekme değişince
                            // önceki seçim diğer listede hiç yoksa kafa
                            // karıştırmasın diye sıfırlanıyor.
                            setChecklistTip(t.key)
                            setChecklistUserId(null)
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            checklistTip === t.key ? 'bg-remax-blue text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {isManager && (
                    <button
                      onClick={() => {
                        setEditingItem(null)
                        setShowAddItemModal(true)
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      <Plus size={14} /> Madde Ekle
                    </button>
                  )}
                </div>
              </div>

              {isManager && (
                <div className="relative mb-3 inline-block" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex min-w-[220px] items-center justify-between gap-2 rounded-lg border border-border-default bg-surface-raised px-3 py-2 text-sm text-text-primary hover:bg-surface-sunken"
                  >
                    <span className={checklistUserId ? 'font-medium' : 'text-text-muted'}>
                      {checklistUserId ? userName(checklistUserId) : 'Danışman seç'}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 z-40 mt-1 max-h-72 w-full min-w-[220px] overflow-y-auto rounded-xl border border-border-subtle bg-surface-raised shadow-lg">
                      {checklistUserOptions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-text-muted">
                          {checklistTip === 'ayrilis' ? 'Ayrılmış danışman yok.' : 'Aktif danışman yok.'}
                        </p>
                      ) : (
                        checklistUserOptions.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setChecklistUserId(u.id)
                              setDropdownOpen(false)
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-sunken"
                          >
                            <span>{u.name}</span>
                            {checklistUserId === u.id && <Check size={14} className="shrink-0 text-brand-600" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {!isManager && (
                <p className="mb-2 text-xs text-text-muted">
                  Bu liste yönetim tarafından işaretlenir, kendin değiştiremezsin.
                </p>
              )}

              {isManager && !checklistUserId ? (
                <p className="rounded-xl border border-dashed border-border-default px-3 py-4 text-center text-sm text-text-muted">
                  Checklist'i görmek için yukarıdan bir danışman seç.
                </p>
              ) : (
                <ChecklistPanel
                  entries={checklistEntries}
                  isManager={isManager}
                  onToggle={toggleChecklistItem}
                  onMove={isManager ? moveChecklistItem : undefined}
                  onEdit={
                    isManager
                      ? (item) => {
                          setEditingItem(item)
                          setShowAddItemModal(true)
                        }
                      : undefined
                  }
                  onDelete={isManager ? (item) => setDeletingItem(item) : undefined}
                  resolveName={userName}
                />
              )}
            </section>
          )}
        </>
      )}

      {showAddItemModal && (
        <AddChecklistItemModal
          onClose={() => {
            setShowAddItemModal(false)
            setEditingItem(null)
          }}
          onSubmit={handleSubmitChecklistItem}
          submitting={submitting}
          defaultTip={checklistTip}
          editingItem={editingItem}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          title="Madde silinsin mi?"
          message={`"${deletingItem.baslik}" kalıcı olarak silinecek — bu maddeyi işaretlemiş olan herkesin durumu da birlikte silinir. Geri alınamaz.`}
          confirmLabel="Sil"
          tone="danger"
          confirming={deleting}
          onConfirm={handleDeleteChecklistItem}
          onCancel={() => setDeletingItem(null)}
        />
      )}
    </div>
  )
}
