import { useState } from 'react'
import { Users, Shield, Tag, ScrollText, Plus, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import {
  users as usersProvider,
  categories as categoriesProvider,
  calendarEvents as calendarProvider,
  auditLog as auditLogProvider,
} from '../lib/dataProvider'
import { canManageUsers } from '../lib/roles'
import { nextBirthdayDate } from '../lib/calendar'
import { slugify } from '../lib/categories'
import UsersTable from '../components/settings/UsersTable'
import CreateUserModal from '../components/settings/CreateUserModal'
import EditUserModal from '../components/settings/EditUserModal'
import CategoryManager from '../components/settings/CategoryManager'
import PermissionMatrix from '../components/settings/PermissionMatrix'
import AuditLogTable from '../components/settings/AuditLogTable'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const TABS = [
  { key: 'kullanicilar', label: 'Kullanıcılar', icon: Users },
  { key: 'yetki', label: 'Yetki', icon: Shield },
  { key: 'kategori', label: 'Kategori', icon: Tag },
  { key: 'log', label: 'Log', icon: ScrollText },
]

export default function Ayarlar() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const [tab, setTab] = useState(TABS[0].key)
  const canManage = canManageUsers(role)
  const resolveName = (id) => knownUsers[id]?.name ?? '—'

  const { data: allUsers, setData: setAllUsers, loading, error, reload } = useAsyncList(
    () => (canManage ? usersProvider.listAll() : Promise.resolve([])),
    [canManage],
  )
  const { data: privateInfoList, setData: setPrivateInfoList } = useAsyncList(
    () => (canManage ? usersProvider.listAllPrivateInfo() : Promise.resolve([])),
    [canManage],
  )
  const {
    data: docCategories,
    setData: setDocCategories,
    loading: loadingCategories,
    error: categoriesError,
    reload: reloadCategories,
  } = useAsyncList(() => (canManage ? categoriesProvider.list('docs') : Promise.resolve([])), [canManage])
  const {
    data: auditRows,
    loading: loadingAudit,
    error: auditError,
    reload: reloadAudit,
  } = useAsyncList(() => (canManage && tab === 'log' ? auditLogProvider.list() : Promise.resolve([])), [canManage, tab])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function handleChangeRole(id, role) {
    try {
      await usersProvider.updateUser(id, { role })
      setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
      showToast('Rol güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Rol güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleToggleDurum(id, durum) {
    try {
      await usersProvider.updateUser(id, { durum })
      setAllUsers((prev) => prev.map((u) => (u.id === id ? { ...u, durum } : u)))
      showToast(durum === 'aktif' ? 'Kullanıcı aktifleştirildi.' : 'Kullanıcı pasifleştirildi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleCreateUser(form) {
    setSubmitting(true)
    try {
      const created = await usersProvider.createUser(form)
      setAllUsers((prev) => [...prev, { ...created, durum: 'aktif' }])
      setShowCreateModal(false)
      showToast('Kullanıcı oluşturuldu.', 'success')
      if (form.dogumTarihi || form.tcNo) {
        try {
          await usersProvider.upsertPrivateInfo(created.id, { dogumTarihi: form.dogumTarihi || null, tcNo: form.tcNo || null })
        } catch {
          showToast('Kullanıcı oluşturuldu ama doğum tarihi/TC no kaydedilemedi.', 'error')
        }
      }
      if (form.dogumTarihi) {
        try {
          await calendarProvider.create(
            {
              type: 'etkinlik',
              title: `🎂 ${created.name} — Doğum Günü`,
              date: nextBirthdayDate(form.dogumTarihi),
              startTime: '09:00',
              endTime: '',
              inviteeIds: [created.id],
            },
            user.id,
          )
        } catch {
          // İkincil bir aksiyon — takvime eklenemese de kullanıcı oluşturma
          // akışını bloke etmiyoruz, sessizce vazgeçiyoruz.
        }
      }
    } catch (err) {
      showToast(err.message ?? 'Kullanıcı oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditUser(patch) {
    if (!editingUser) return
    setSubmitting(true)
    try {
      await usersProvider.updateUser(editingUser.id, { name: patch.ad })
      setAllUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, name: patch.ad } : u)))
      await usersProvider.upsertPrivateInfo(editingUser.id, { dogumTarihi: patch.dogumTarihi, tcNo: patch.tcNo })
      setPrivateInfoList((prev) => [
        ...(prev ?? []).filter((p) => p.userId !== editingUser.id),
        { userId: editingUser.id, dogumTarihi: patch.dogumTarihi, tcNo: patch.tcNo },
      ])
      setEditingUser(null)
      showToast('Kullanıcı güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Güncellenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await usersProvider.deleteUser(deleteTarget.id)
      setAllUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast('Kullanıcı silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kullanıcı silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddCategory(label) {
    try {
      const maxOrder = (docCategories ?? []).reduce((max, c) => Math.max(max, c.sortOrder), 0)
      const created = await categoriesProvider.create({
        module: 'docs',
        key: slugify(label),
        label,
        sortOrder: maxOrder + 1,
      })
      setDocCategories((prev) => [...prev, created])
      showToast('Kategori eklendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kategori eklenemedi, tekrar dene.', 'error')
    }
  }

  async function handleRenameCategory(id, label) {
    try {
      await categoriesProvider.update(id, { label })
      setDocCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
      showToast('Kategori güncellendi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kategori güncellenemedi, tekrar dene.', 'error')
    }
  }

  async function handleDeleteCategory(id) {
    try {
      await categoriesProvider.remove(id)
      setDocCategories((prev) => prev.filter((c) => c.id !== id))
      showToast('Kategori silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Kategori silinemedi, tekrar dene.', 'error')
    }
  }

  async function handleMoveCategory(id, direction) {
    const list = docCategories ?? []
    const index = list.findIndex((c) => c.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= list.length) return
    const a = list[index]
    const b = list[swapIndex]
    const aOrder = a.sortOrder
    const bOrder = b.sortOrder
    try {
      await Promise.all([
        categoriesProvider.update(a.id, { sortOrder: bOrder }),
        categoriesProvider.update(b.id, { sortOrder: aOrder }),
      ])
      setDocCategories((prev) =>
        prev
          .map((c) => {
            if (c.id === a.id) return { ...c, sortOrder: bOrder }
            if (c.id === b.id) return { ...c, sortOrder: aOrder }
            return c
          })
          .sort((x, y) => x.sortOrder - y.sortOrder),
      )
    } catch (err) {
      showToast(err.message ?? 'Sıra değiştirilemedi, tekrar dene.', 'error')
    }
  }

  if (!canManage) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
        <Lock size={28} className="text-ink-300" />
        <p className="text-sm font-medium text-ink-600">Bu sayfaya erişim yetkin yok.</p>
        <p className="text-xs text-ink-400">Ayarlar sadece broker ve owner rollerine açıktır.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-ink-100">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'kullanicilar' && canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="mb-2 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Kullanıcı Ekle
          </button>
        )}
      </div>

      {tab === 'kullanicilar' && (
        <>
          {loading && <LoadingState />}
          {!loading && error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && (
            <UsersTable
              rows={allUsers ?? []}
              canManage={canManage}
              onChangeRole={handleChangeRole}
              onToggleDurum={handleToggleDurum}
              onEdit={setEditingUser}
              onDeleteRequest={setDeleteTarget}
            />
          )}
        </>
      )}

      {tab === 'kategori' && (
        <>
          {loadingCategories && <LoadingState />}
          {!loadingCategories && categoriesError && <ErrorState error={categoriesError} onRetry={reloadCategories} />}
          {!loadingCategories && !categoriesError && (
            <>
              <p className="mb-4 text-xs text-ink-400">
                Rehber sayfasındaki klasörler — ekle, yeniden adlandır, sil veya sırasını değiştir.
              </p>
              <CategoryManager
                categories={docCategories ?? []}
                onAdd={handleAddCategory}
                onRename={handleRenameCategory}
                onDelete={handleDeleteCategory}
                onMove={handleMoveCategory}
              />
            </>
          )}
        </>
      )}

      {tab === 'yetki' && <PermissionMatrix />}

      {tab === 'log' && (
        <>
          <p className="mb-4 text-xs text-ink-400">
            Kullanıcı, fırsat ve skor değişiklikleri — en son 200 kayıt.
          </p>
          {loadingAudit && <LoadingState />}
          {!loadingAudit && auditError && <ErrorState error={auditError} onRetry={reloadAudit} />}
          {!loadingAudit && !auditError && <AuditLogTable rows={auditRows ?? []} resolveName={resolveName} />}
        </>
      )}

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateUser} submitting={submitting} />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          privateInfo={(privateInfoList ?? []).find((p) => p.userId === editingUser.id)}
          onClose={() => setEditingUser(null)}
          onSubmit={handleEditUser}
          submitting={submitting}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Kullanıcıyı sil"
          message={`${deleteTarget.name} kalıcı olarak silinecek — hesabı, TC no/doğum tarihi kaydı VE bu kullanıcıya bağlı tüm geçmiş (ciro müşterileri, katılım kayıtları, skor girişleri) birlikte silinir. Bu işlem geri alınamaz. Ayrılan bir danışman için "Pasif" yapmak daha güvenli bir alternatif.`}
          confirmLabel="Kalıcı Olarak Sil"
          tone="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
          confirming={deleting}
        />
      )}
    </div>
  )
}
