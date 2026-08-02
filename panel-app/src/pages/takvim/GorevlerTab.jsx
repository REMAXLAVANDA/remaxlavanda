import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { tasks as tasksProvider } from '../../lib/dataProvider'
import { canViewTask, canManageTasks, canToggleTask } from '../../lib/tasks'
import { ROLE_LABELS, ROLE_ORDER } from '../../lib/roles'
import { sortByName } from '../../lib/format'
import TaskRow from '../../components/gorevler/TaskRow'
import TaskFormModal from '../../components/gorevler/TaskFormModal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../../components/common/AsyncState'

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'tamamlandi' ? 1 : -1
    if (a.status === 'tamamlandi') return new Date(b.completedAt ?? 0) - new Date(a.completedAt ?? 0)
    if (!a.dueDate && !b.dueDate) return new Date(b.createdAt) - new Date(a.createdAt)
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
}

// Tek uzun liste "kime ne atanmış" sorusunu okumayı zorlaştırıyordu (bkz.
// "sağlıklı bir görünümü yok, owner/ofis/danışmanlar için ayrı widget
// olmalı" geri bildirimi) — artık görevler ATANAN kişinin ROLÜNE göre ayrı
// kartlara bölünüyor (Broker/Owner/Ofis/Danışman sırasıyla, ROLE_ORDER).
// Danışman gibi tek kişi kendi görevini görüyorsa zaten tek kart (kendi
// rolü) görünür — yönetim hepsini rol rol ayrışmış görür. Rolü çözülemeyen
// (silinmiş kullanıcı vb.) görevler "Diğer" kartına düşer, kaybolmasın.
function groupByAssigneeRole(list, knownUsers) {
  const groups = new Map()
  for (const t of list) {
    const role = knownUsers[t.assigneeId]?.role
    const key = role && ROLE_ORDER.includes(role) ? role : 'diger'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(t)
  }
  const ordered = [...ROLE_ORDER, 'diger']
  return ordered
    .filter((key) => groups.has(key))
    .map((key) => ({
      key,
      label: key === 'diger' ? 'Diğer' : ROLE_LABELS[key],
      tasks: sortTasks(groups.get(key)),
    }))
}

export default function GorevlerTab() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data: taskList, setData: setTaskList, loading, error, reload } = useAsyncList(() => tasksProvider.list(), [])
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isManager = canManageTasks(role)
  const userName = (id) => knownUsers[id]?.name ?? '—'
  // Broker de görev alabiliyor — atanabilir listede danışman + broker + ofis
  // hepsi var, kimin kime görev verdiği önemli değil.
  const assigneeOptions = sortByName(Object.values(knownUsers))

  const visible = useMemo(() => {
    const list = (taskList ?? []).filter((t) => canViewTask(t, user))
    return sortTasks(list)
  }, [taskList, user])

  const groups = useMemo(() => groupByAssigneeRole(visible, knownUsers), [visible, knownUsers])

  async function handleToggle(id, status) {
    try {
      const updated = await tasksProvider.update(id, { status })
      setTaskList((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (err) {
      showToast(err.message ?? 'Görev güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleCreate(form) {
    setSubmitting(true)
    try {
      const created = await tasksProvider.create(form, user.id)
      setTaskList((prev) => [created, ...prev])
      setShowModal(false)
      showToast('Görev oluşturuldu.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Görev oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(form) {
    if (!editingTask) return
    setSubmitting(true)
    try {
      const updated = await tasksProvider.update(editingTask.id, form)
      setTaskList((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditingTask(null)
      showToast('Görev güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await tasksProvider.remove(deleteTarget.id)
      setTaskList((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast('Görev silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Görev silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">
          {isManager ? 'Ekibe verilen görev ve sorumluluklar' : 'Sana atanan görevler'}
        </p>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Yeni Görev
          </button>
        )}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && visible.length === 0 && (
        <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-400">Henüz görev yok.</p>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key} className="rounded-2xl border border-ink-100 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                {g.label}
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-500">
                  {g.tasks.length}
                </span>
              </h3>
              <div className="space-y-2">
                {g.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    assigneeName={userName(t.assigneeId)}
                    canToggle={canToggleTask(t, user)}
                    canManage={isManager}
                    onToggle={handleToggle}
                    onEdit={setEditingTask}
                    onDeleteRequest={setDeleteTarget}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TaskFormModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          assigneeOptions={assigneeOptions}
        />
      )}

      {editingTask && (
        <TaskFormModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditSubmit}
          submitting={submitting}
          assigneeOptions={assigneeOptions}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Bu görevi silmek istiyor musun?"
          message={`"${deleteTarget.title}" kalıcı olarak silinecek, geri alınamaz.`}
          confirmLabel="Evet, sil"
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirming={deleting}
        />
      )}
    </div>
  )
}
