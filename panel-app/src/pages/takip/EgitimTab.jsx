import { useMemo, useState } from 'react'
import { Award, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { education as educationProvider } from '../../lib/dataProvider'
import { badgesFor, checklistFor, checklistProgress, isModuleDone, moduleProgressFor } from '../../lib/education'
import { isWithinRange } from '../../lib/dateRange'
import ModuleProgressList from '../../components/education/ModuleProgressList'
import BadgeGrid from '../../components/education/BadgeGrid'
import AwardBadgeModal from '../../components/education/AwardBadgeModal'
import ChecklistPanel from '../../components/education/ChecklistPanel'
import AddChecklistItemModal from '../../components/education/AddChecklistItemModal'
import TeamProgressTable from '../../components/education/TeamProgressTable'
import DateRangeFilter from '../../components/common/DateRangeFilter'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

// badges_manage / onboarding_status_manage / onboarding_items_manage RLS'te
// sadece broker/owner.
const CAN_MANAGE_ROLES = ['broker', 'owner']

const CHECKLIST_TABS = [
  { key: 'baslangic', label: 'Süreç' },
  { key: 'ayrilis', label: 'Ayrılış' },
]

// Yükleme bitmeden önce data null olur — useMemo bağımlılıklarının her
// render'da referans değiştirmemesi için sabit, boş bir dizi kullanılır.
const EMPTY = []

async function loadAll() {
  const [modules, progress, badges, userBadges, checklistItems, checklistStatus] = await Promise.all([
    educationProvider.listModules(),
    educationProvider.listProgress(),
    educationProvider.listBadges(),
    educationProvider.listUserBadges(),
    educationProvider.listChecklistItems(),
    educationProvider.listChecklistStatus(),
  ])
  return { modules, progress, badges, userBadges, checklistItems, checklistStatus }
}

export default function EgitimTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [checklistTip, setChecklistTip] = useState('baslangic')
  const [checklistUserId, setChecklistUserId] = useState(user.id)
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [moduleFilters, setModuleFilters] = useState({ dateRange: 'tumu', customFrom: '', customTo: '' })

  const isManager = CAN_MANAGE_ROLES.includes(role)

  const modules = data?.modules ?? EMPTY
  const progress = data?.progress ?? EMPTY
  const badges = data?.badges ?? EMPTY
  const userBadges = data?.userBadges ?? EMPTY
  const checklistItems = data?.checklistItems ?? EMPTY
  const checklistStatus = data?.checklistStatus ?? EMPTY

  const teamMembers = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')

  // Eğitim modülleri eklendikleri tarihe göre filtrelenebilir (ör. "sadece bu
  // dönem eklenen eğitimler"). Varsayılan "tümü" — hiçbir modül sessizce
  // gizlenmesin (Fırsatlar/Operasyon'da yaşanan 30 günlük varsayılan filtre
  // sorununu burada tekrarlamamak için).
  const filteredModules = useMemo(
    () => modules.filter((m) => isWithinRange(m.createdAt, moduleFilters.dateRange, moduleFilters.customFrom, moduleFilters.customTo)),
    [modules, moduleFilters],
  )

  const myModuleProgress = useMemo(
    () => moduleProgressFor(user.id, filteredModules, progress),
    [filteredModules, progress, user.id],
  )
  const myBadges = useMemo(() => badgesFor(user.id, userBadges, badges), [userBadges, badges, user.id])
  const checklistEntries = useMemo(
    () => checklistFor(checklistUserId, checklistTip, checklistItems, checklistStatus),
    [checklistUserId, checklistTip, checklistItems, checklistStatus],
  )

  const teamRows = useMemo(() => {
    if (!isManager) return []
    return teamMembers.map((u) => {
      const mp = moduleProgressFor(u.id, filteredModules, progress)
      const cp = checklistProgress(u.id, 'baslangic', checklistItems, checklistStatus)
      return {
        id: u.id,
        name: u.name,
        modulePercent: mp.percent,
        checklistPercent: cp.percent,
        badgeCount: badgesFor(u.id, userBadges, badges).length,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, filteredModules, progress, checklistItems, checklistStatus, userBadges, badges])

  const userName = (id) => knownUsers[id]?.name ?? '—'

  async function toggleModule(moduleId) {
    const done = isModuleDone(moduleId, user.id, progress)
    try {
      await educationProvider.toggleModuleProgress(moduleId, user.id, !done)
      setData((prev) => ({
        ...prev,
        progress: done
          ? prev.progress.filter((p) => !(p.moduleId === moduleId && p.userId === user.id))
          : [...prev.progress, { moduleId, userId: user.id, doneAt: new Date().toISOString() }],
      }))
    } catch (err) {
      showToast(err.message ?? 'Modül durumu güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function toggleChecklistItem(itemId) {
    const existing = checklistStatus.find((s) => s.itemId === itemId && s.userId === checklistUserId)
    try {
      await educationProvider.toggleChecklistItem(itemId, checklistUserId, !existing, user.id)
      setData((prev) => ({
        ...prev,
        checklistStatus: existing
          ? prev.checklistStatus.filter((s) => !(s.itemId === itemId && s.userId === checklistUserId))
          : [
              ...prev.checklistStatus,
              { itemId, userId: checklistUserId, doneAt: new Date().toISOString(), doneBy: user.id },
            ],
      }))
    } catch (err) {
      showToast(err.message ?? 'Checklist güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleAddChecklistItem({ tip, baslik }) {
    setSubmitting(true)
    try {
      const maxOrder = checklistItems.filter((i) => i.tip === tip).reduce((max, i) => Math.max(max, i.sortOrder), 0)
      const created = await educationProvider.createChecklistItem({ tip, baslik, sortOrder: maxOrder + 1 })
      setData((prev) => ({ ...prev, checklistItems: [...prev.checklistItems, created] }))
      setShowAddItemModal(false)
      showToast('Madde eklendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Madde eklenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
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
    try {
      await Promise.all([
        educationProvider.updateChecklistItemOrder(a.id, bOrder),
        educationProvider.updateChecklistItemOrder(b.id, aOrder),
      ])
      setData((prev) => ({
        ...prev,
        checklistItems: prev.checklistItems.map((it) => {
          if (it.id === a.id) return { ...it, sortOrder: bOrder }
          if (it.id === b.id) return { ...it, sortOrder: aOrder }
          return it
        }),
      }))
    } catch (err) {
      showToast(err.message ?? 'Sıralama değiştirilemedi, tekrar dene.', 'error')
    }
  }

  async function handleAwardBadge({ userId, badgeId }) {
    setSubmitting(true)
    try {
      const awarded = await educationProvider.awardBadge(userId, badgeId)
      setData((prev) => ({ ...prev, userBadges: [...prev.userBadges, awarded] }))
      setShowAwardModal(false)
      showToast('Rozet verildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Rozet verilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-ink-400">Power Camp modülleri, rozetler ve checklist</p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink-900">Modüllerim</h2>
              <span className="text-xs text-ink-400">
                {myModuleProgress.completed}/{myModuleProgress.total} tamamlandı ({myModuleProgress.percent}%)
              </span>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setModuleFilters((f) => ({ ...f, dateRange: 'tumu' }))}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  moduleFilters.dateRange === 'tumu' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                Tümü
              </button>
              <DateRangeFilter value={moduleFilters} onChange={setModuleFilters} />
            </div>
            <ModuleProgressList
              modules={filteredModules}
              isDone={(id) => isModuleDone(id, user.id, progress)}
              onToggle={toggleModule}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Rozetlerim</h2>
              {isManager && (
                <button
                  onClick={() => setShowAwardModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  <Award size={14} /> Rozet Ver
                </button>
              )}
            </div>
            <BadgeGrid badges={myBadges} />
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink-900">Süreç / Ayrılış Checklist</h2>
              <div className="flex items-center gap-2">
                {isManager && (
                  <select
                    value={checklistUserId}
                    onChange={(e) => setChecklistUserId(e.target.value)}
                    className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-600"
                  >
                    {teamMembers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-1">
                  {CHECKLIST_TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setChecklistTip(t.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        checklistTip === t.key ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {isManager && (
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                  >
                    <Plus size={14} /> Madde Ekle
                  </button>
                )}
              </div>
            </div>
            {!isManager && (
              <p className="mb-2 text-xs text-ink-400">
                Bu liste yönetim tarafından işaretlenir, kendin değiştiremezsin.
              </p>
            )}
            <ChecklistPanel
              entries={checklistEntries}
              isManager={isManager}
              onToggle={toggleChecklistItem}
              onMove={isManager ? moveChecklistItem : undefined}
              resolveName={userName}
            />
          </section>

          {isManager && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink-900">Ekip İlerlemesi</h2>
              <TeamProgressTable rows={teamRows} />
            </section>
          )}
        </>
      )}

      {showAwardModal && (
        <AwardBadgeModal
          onClose={() => setShowAwardModal(false)}
          onSubmit={handleAwardBadge}
          submitting={submitting}
          users={teamMembers}
          badges={badges}
        />
      )}

      {showAddItemModal && (
        <AddChecklistItemModal
          onClose={() => setShowAddItemModal(false)}
          onSubmit={handleAddChecklistItem}
          submitting={submitting}
          defaultTip={checklistTip}
        />
      )}
    </div>
  )
}
