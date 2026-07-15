import { useMemo, useState } from 'react'
import { Award, GraduationCap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  MOCK_MODULES,
  MOCK_PROGRESS,
  MOCK_BADGES,
  MOCK_USER_BADGES,
  MOCK_CHECKLIST_ITEMS,
  MOCK_CHECKLIST_STATUS,
} from '../data/mockEducation'
import { badgesFor, checklistFor, checklistProgress, isModuleDone, moduleProgressFor } from '../lib/education'
import { KNOWN_USERS, userName } from '../lib/knownUsers'
import ModuleProgressList from '../components/education/ModuleProgressList'
import BadgeGrid from '../components/education/BadgeGrid'
import AwardBadgeModal from '../components/education/AwardBadgeModal'
import ChecklistPanel from '../components/education/ChecklistPanel'
import TeamProgressTable from '../components/education/TeamProgressTable'
import { mutate } from '../lib/api'

// badges_manage / onboarding_status_manage RLS'te sadece broker/owner.
const CAN_MANAGE_ROLES = ['broker', 'owner']

export default function Egitim() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const [progress, setProgress] = useState(MOCK_PROGRESS)
  const [userBadges, setUserBadges] = useState(MOCK_USER_BADGES)
  const [checklistStatus, setChecklistStatus] = useState(MOCK_CHECKLIST_STATUS)
  const [checklistTip, setChecklistTip] = useState('baslangic')
  const [checklistUserId, setChecklistUserId] = useState(user.id)
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isManager = CAN_MANAGE_ROLES.includes(role)

  const myModuleProgress = useMemo(() => moduleProgressFor(user.id, MOCK_MODULES, progress), [progress, user.id])
  const myBadges = useMemo(() => badgesFor(user.id, userBadges, MOCK_BADGES), [userBadges, user.id])
  const checklistEntries = useMemo(
    () => checklistFor(checklistUserId, checklistTip, MOCK_CHECKLIST_ITEMS, checklistStatus),
    [checklistUserId, checklistTip, checklistStatus],
  )

  const teamRows = useMemo(() => {
    if (!isManager) return []
    return Object.values(KNOWN_USERS)
      .filter((u) => !u.role || u.role === 'danisman')
      .map((u) => {
        const mp = moduleProgressFor(u.id, MOCK_MODULES, progress)
        const cp = checklistProgress(u.id, 'baslangic', MOCK_CHECKLIST_ITEMS, checklistStatus)
        return {
          id: u.id,
          name: u.name,
          modulePercent: mp.percent,
          checklistPercent: cp.percent,
          badgeCount: badgesFor(u.id, userBadges, MOCK_BADGES).length,
        }
      })
  }, [isManager, progress, checklistStatus, userBadges])

  async function toggleModule(moduleId) {
    const done = isModuleDone(moduleId, user.id, progress)
    await mutate('education_progress.upsert', { moduleId, userId: user.id, done: !done })
    setProgress((prev) =>
      done
        ? prev.filter((p) => !(p.moduleId === moduleId && p.userId === user.id))
        : [...prev, { moduleId, userId: user.id, doneAt: new Date().toISOString() }],
    )
  }

  async function toggleChecklistItem(itemId) {
    const existing = checklistStatus.find((s) => s.itemId === itemId && s.userId === checklistUserId)
    await mutate('onboarding_checklist_status.upsert', { itemId, userId: checklistUserId, done: !existing })
    setChecklistStatus((prev) =>
      existing
        ? prev.filter((s) => !(s.itemId === itemId && s.userId === checklistUserId))
        : [...prev, { itemId, userId: checklistUserId, doneAt: new Date().toISOString(), doneBy: user.id }],
    )
  }

  async function handleAwardBadge({ userId, badgeId }) {
    setSubmitting(true)
    try {
      await mutate('user_badges.insert', { userId, badgeId })
      setUserBadges((prev) => [...prev, { userId, badgeId, earnedAt: new Date().toISOString() }])
      setShowAwardModal(false)
      showToast('Rozet verildi.', 'success')
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Modüllerim</h2>
          <span className="text-xs text-ink-400">
            {myModuleProgress.completed}/{myModuleProgress.total} tamamlandı ({myModuleProgress.percent}%)
          </span>
        </div>
        <ModuleProgressList
          modules={MOCK_MODULES}
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
                {Object.values(KNOWN_USERS)
                  .filter((u) => !u.role || u.role === 'danisman')
                  .map((u) => (
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

      {showAwardModal && (
        <AwardBadgeModal
          onClose={() => setShowAwardModal(false)}
          onSubmit={handleAwardBadge}
          submitting={submitting}
          users={Object.values(KNOWN_USERS).filter((u) => !u.role || u.role === 'danisman')}
          badges={MOCK_BADGES}
        />
      )}
    </div>
  )
}
