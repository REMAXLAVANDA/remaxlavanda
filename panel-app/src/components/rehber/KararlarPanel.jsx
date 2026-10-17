import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { kararlar as kararlarProvider, categories as categoriesProvider } from '../../lib/dataProvider'
import { canManageKararlar } from '../../lib/kararlar'
import { ROLES } from '../../lib/roles'
import { slugify } from '../../lib/categories'
import { formatDateOnly } from '../../lib/format'
import { LoadingState, ErrorState, RestrictedAccess } from '../common/AsyncState'
import KararFormModal from '../kararlar/KararFormModal'
import ConfirmDialog from '../common/ConfirmDialog'

async function loadAll() {
  const [liste, kategoriler] = await Promise.all([kararlarProvider.list(), categoriesProvider.list('kararlar')])
  return { liste, kategoriler }
}

// Rehber > Kararlar — broker, 2026-10-17: önce ayrı menü maddesiydi,
// sonra "Kararlar'ı Rehber'in içine al" dedi, Rehber'in bir sekmesi
// oldu (bkz. pages/Rehber.jsx). Sadece broker/owner görür (bkz.
// lib/kararlar.js canManageKararlar) — Rehber'in kendisi herkese açık
// olduğu için bu kontrol burada iç koruma olarak duruyor.
export default function KararlarPanel() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedKategori, setSelectedKategori] = useState(null)

  const kararAlanOptions = useMemo(
    () =>
      Object.values(knownUsers)
        .filter((u) => u.role === ROLES.BROKER || u.role === ROLES.OWNER)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [knownUsers],
  )

  if (!canManageKararlar(role)) {
    return <RestrictedAccess message="Kararlar sadece broker ve owner rollerine açıktır." />
  }

  const liste = data?.liste ?? []
  const kategoriler = data?.kategoriler ?? []
  const userName = (id) => knownUsers[id]?.name ?? '—'
  const kategoriLabel = (key) => kategoriler.find((k) => k.key === key)?.label ?? key

  const filteredListe = selectedKategori ? liste.filter((k) => k.kategoriKey === selectedKategori) : liste

  function countFor(key) {
    return liste.filter((k) => k.kategoriKey === key).length
  }

  async function handleKategoriEkle(label) {
    const maxOrder = kategoriler.reduce((max, k) => Math.max(max, k.sortOrder), 0)
    const created = await categoriesProvider.create({
      module: 'kararlar',
      key: slugify(label),
      label,
      sortOrder: maxOrder + 1,
      visibility: 'yonetim',
    })
    setData((prev) => ({ ...prev, kategoriler: [...(prev?.kategoriler ?? []), created] }))
    showToast('Kategori eklendi.', 'success')
    return created
  }

  async function handleSubmit(form) {
    setSubmitting(true)
    try {
      if (editTarget) {
        const updated = await kararlarProvider.update(editTarget.id, form)
        setData((prev) => ({ ...prev, liste: prev.liste.map((k) => (k.id === editTarget.id ? updated : k)) }))
        showToast('Karar güncellendi.', 'success')
      } else {
        const created = await kararlarProvider.create(form, user.id)
        setData((prev) => ({ ...prev, liste: [created, ...prev.liste] }))
        showToast('Karar kaydedildi.', 'success')
      }
      setShowForm(false)
      setEditTarget(null)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await kararlarProvider.remove(deleteTarget.id)
      setData((prev) => ({ ...prev, liste: prev.liste.filter((k) => k.id !== deleteTarget.id) }))
      showToast('Karar silindi.', 'success')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Yönetim olarak alınan kararların kaydı — sadece broker/owner görür.</p>
        <button
          onClick={() => {
            setEditTarget(null)
            setShowForm(true)
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Yeni Karar
        </button>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedKategori(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedKategori === null ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
              }`}
            >
              Tümü ({liste.length})
            </button>
            {kategoriler.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelectedKategori(k.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  selectedKategori === k.key ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
                }`}
              >
                {k.label} ({countFor(k.key)})
              </button>
            ))}
          </div>

          {filteredListe.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-muted">
              {selectedKategori ? 'Bu kategoride henüz karar yok.' : 'Henüz hiç karar kaydedilmemiş.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredListe.map((k) => (
                <div key={k.id} className="rounded-2xl border border-border-default bg-surface-raised p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{k.baslik}</span>
                        {k.kategoriKey && (
                          <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-text-muted">
                            {kategoriLabel(k.kategoriKey)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {formatDateOnly(k.tarih)}
                        {k.kararAlanId && ` · ${userName(k.kararAlanId)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => {
                          setEditTarget(k)
                          setShowForm(true)
                        }}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-sunken"
                      >
                        <Pencil size={13} /> Düzenle
                      </button>
                      <button
                        onClick={() => setDeleteTarget(k)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} /> Sil
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{k.icerik}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <KararFormModal
          editing={editTarget}
          kategoriler={kategoriler}
          kararAlanOptions={kararAlanOptions}
          defaultKararAlanId={user.id}
          onClose={() => {
            setShowForm(false)
            setEditTarget(null)
          }}
          onSubmit={handleSubmit}
          onKategoriEkle={handleKategoriEkle}
          submitting={submitting}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Bu kararı silmek istiyor musun?"
          message={`"${deleteTarget.baslik}" kalıcı olarak silinecek, geri alınamaz.`}
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
