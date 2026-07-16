import { useMemo, useState } from 'react'
import { Award, GraduationCap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { education as educationProvider } from '../lib/dataProvider'
import { badgesFor, checklistFor, checklistProgress, isModuleDone, moduleProgressFor } from '../lib/education'
import ModuleProgressList from '../components/education/ModuleProgressList'
import BadgeGrid from '../components/education/BadgeGrid'
import AwardBadgeModal from '../components/education/AwardBadgeModal'
import ChecklistPanel from '../components/education/ChecklistPanel'
import TeamProgressTable from '../components/education/TeamProgressTable'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

// badges_manage / onboarding_status_manage RLS'te sadece broker/owner.
const CAN_MANAGE_ROLES = ['broker', 'owner']

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

export default function Egitim() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [checklistTip, setChecklistTip] = useState('baslangic')
  const [checklistUserId, setChecklistUserId] = useState(user.id)
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isManager = CAN_MANAGE_ROLES.includes(role)

  const modules = data?.modules ?? EMPTY
  const progress = data?.progress ?? EMPTY
  const badges = data?.badges ?? EMPTY
  const userBadges = data?.userBadges ?? EMPTY
  const checklistItems = data?.checklistItems ?? EMPTY
  const checklistStatus = data?.checklistStatus ?? EMPTY

  const teamMembers = Object.values(knownUsers).filter((u) => !u.role || u.role === 'danisman')

  const myModuleProgress = useMemo(() => moduleProgressFor(user.id, modules, progress), [modules, progress, user.id])
  const myBadges = useMemo(() => badgesFor(user.id, userBadges, badges), [userBadges, badges, user.id])
  const checklistEntries = useMemo(
    () => checklistFor(checklistUserId, checklistTip, checklistItems, checklistStatus),
    [checklistUserId, checklistTip, checklistItems, checklistStatus],
  )

  const teamRows = useMemo(() => {
    if (!isManager) return []
    return teamMembers.map((u) => {
      const mp = moduleProgressFor(u.id, modules, progress)
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
  }, [isManager, modules, progress, checklistItems, checklistStatus, userBadges, badges])

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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <GraduationCap size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-ink-900">Eğitim</h1>
          <p className="text-xs text-ink-400">Power Camp modülleri, rozetler ve checklist</p>
        </div>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">Modüllerim</h2>
              <span className="text-xs text-ink-400">
                {myModuleProgress.completed}/{myModuleProgress.total} tamamlandı ({myModuleProgress.percent}%)
              </span>
            </div>
            <ModuleProgressList
              modules={modules}
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
              <h2 className="text-sm font-semibold text-ink-900">Başlangıç / Ayrılış Checklist</h2>
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
                  {[
                    { key: 'baslangic', label: 'Başlangıç' },
                    { key: 'ayrilis', label: 'Ayrılış' },
                  ].map((t) => (
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
    </div>
  )
}
