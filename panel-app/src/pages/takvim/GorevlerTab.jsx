import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { tasks as tasksProvider } from '../../lib/dataProvider'
import { canViewTask, canManageTasks, canToggleTask } from '../../lib/tasks'
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
  const assigneeOptions = Object.values(knownUsers)

  const visible = useMemo(() => {
    const list = (taskList ?? []).filter((t) => canViewTask(t, user))
    return sortTasks(list)
  }, [taskList, user])

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
        <div className="space-y-2">
          {visible.map((t) => (
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
