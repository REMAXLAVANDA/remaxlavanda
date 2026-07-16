import { useState } from 'react'
import { Users, Shield, Tag, ScrollText, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { users as usersProvider } from '../lib/dataProvider'
import { canManageUsers } from '../lib/roles'
import ModulePlaceholder from '../components/common/ModulePlaceholder'
import UsersTable from '../components/settings/UsersTable'
import CreateUserModal from '../components/settings/CreateUserModal'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const TABS = [
  { key: 'kullanicilar', label: 'Kullanıcılar', icon: Users },
  { key: 'yetki', label: 'Yetki', icon: Shield },
  { key: 'kategori', label: 'Kategori', icon: Tag },
  { key: 'log', label: 'Log', icon: ScrollText },
]

export default function Ayarlar() {
  const { role } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState(TABS[0].key)
  const active = TABS.find((t) => t.key === tab)
  const canManage = canManageUsers(role)

  const { data: allUsers, setData: setAllUsers, loading, error, reload } = useAsyncList(
    () => usersProvider.listAll(),
    [],
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
    } catch (err) {
      showToast(err.message ?? 'Kullanıcı oluşturulamadı, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2 border-b border-ink-100">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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

      {tab === 'kullanicilar' ? (
        <>
          {loading && <LoadingState />}
          {!loading && error && <ErrorState error={error} onRetry={reload} />}
          {!loading && !error && (
            <UsersTable
              rows={allUsers ?? []}
              canManage={canManage}
              onChangeRole={handleChangeRole}
              onToggleDurum={handleToggleDurum}
            />
          )}
        </>
      ) : (
        <ModulePlaceholder
          icon={active.icon}
          title={active.label}
          description="Yetki, kategori ve log yönetimi burada toplanacak."
          note="İlgili modüllerle birlikte doldurulacak"
        />
      )}

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateUser} submitting={submitting} />
      )}
    </div>
  )
}
