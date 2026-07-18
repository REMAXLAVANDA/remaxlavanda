import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { docs as docsProvider, categories as categoriesProvider } from '../lib/dataProvider'
import { canManageDocs, currentVersion, versionsForDoc } from '../lib/docs'
import { uploadDocFile, deleteDocFile } from '../lib/storage'
import FolderList from '../components/rehber/FolderList'
import DocCard from '../components/rehber/DocCard'
import PreviewModal from '../components/rehber/PreviewModal'
import UploadDocModal from '../components/rehber/UploadDocModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const EMPTY = []

async function loadAll() {
  const [docs, versions, categories] = await Promise.all([
    docsProvider.listDocs(),
    docsProvider.listVersions(),
    categoriesProvider.list('docs'),
  ])
  return { docs, versions, categories }
}

export default function Rehber() {
  const { user, role } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [previewVersion, setPreviewVersion] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canManage = canManageDocs(role)
  const docs = data?.docs ?? EMPTY
  const versions = data?.versions ?? EMPTY
  const categories = data?.categories ?? EMPTY
  const userName = (id) => knownUsers[id]?.name ?? '—'

  // Kategoriler yüklendikten sonra ilk klasör otomatik seçilsin.
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].key)
  }, [categories, selectedCategory])

  const docsInCategory = useMemo(
    () => docs.filter((d) => d.categoryKey === selectedCategory),
    [docs, selectedCategory],
  )

  function countFor(categoryKey) {
    return docs.filter((d) => d.categoryKey === categoryKey).length
  }

  async function handleSubmitDoc(form) {
    setSubmitting(true)
    try {
      // Sadece başlık düzeltmesi (dosya dokümanları için "Düzenle") —
      // ne yeni versiyon ne içerik değişir.
      if (form.mode === 'rename') {
        await docsProvider.update(form.docId, { baslik: form.baslik })
        setData((prev) => ({
          ...prev,
          docs: prev.docs.map((d) => (d.id === form.docId ? { ...d, baslik: form.baslik } : d)),
        }))
        showToast('Başlık güncellendi.', 'success')
        setEditingDoc(null)
        return
      }

      let targetDocId = form.docId
      if (!targetDocId) {
        const sameCategory = docs.filter((d) => d.categoryKey === form.categoryKey)
        const maxOrder = sameCategory.reduce((max, d) => Math.max(max, d.sortOrder ?? 0), 0)
        const created = await docsProvider.createDoc(
          { categoryKey: form.categoryKey, baslik: form.baslik, sortOrder: maxOrder + 1 },
          user.id,
        )
        targetDocId = created.id
        setData((prev) => ({ ...prev, docs: [...prev.docs, created] }))
      }

      if (form.mode === 'file') {
        const storagePath = await uploadDocFile(form.file, { categoryKey: form.categoryKey, docId: targetDocId })
        const version = await docsProvider.addVersion(
          { docId: targetDocId, filename: form.file.name, storagePath },
          user.id,
        )
        setData((prev) => ({
          ...prev,
          versions: [...prev.versions.map((v) => (v.docId === targetDocId ? { ...v, isCurrent: false } : v)), version],
        }))
        showToast('Dosya yüklendi.', 'success')
      } else {
        const patch = { contentText: form.contentText, ...(form.baslik ? { baslik: form.baslik } : {}) }
        await docsProvider.update(targetDocId, patch)
        setData((prev) => ({
          ...prev,
          docs: prev.docs.map((d) => (d.id === targetDocId ? { ...d, ...patch } : d)),
        }))
        showToast('Yazı kaydedildi.', 'success')
      }

      setSelectedCategory(form.categoryKey)
      setShowUpload(false)
      setEditingDoc(null)
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteDoc(doc) {
    setDeleting(true)
    try {
      const docVersions = versionsForDoc(doc.id, versions)
      // Gerçek dosya baytları DB cascade'ine dahil değil — her versiyonun
      // Storage'daki asıl dosyasını ayrı ayrı siliyoruz (bkz. docs.remove()
      // notu). '#' olanlar eski/sahte demo kayıtları, storage'da karşılığı
      // yok, atlanıyor.
      await Promise.all(
        docVersions.filter((v) => v.url && v.url !== '#').map((v) => deleteDocFile(v.url).catch(() => {})),
      )
      await docsProvider.remove(doc.id)
      setData((prev) => ({
        ...prev,
        docs: prev.docs.filter((d) => d.id !== doc.id),
        versions: prev.versions.filter((v) => v.docId !== doc.id),
      }))
      showToast('Doküman silindi.', 'success')
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleMoveDoc(id, direction) {
    const list = docsInCategory
    const index = list.findIndex((d) => d.id === id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= list.length) return
    const a = list[index]
    const b = list[swapIndex]
    const aOrder = a.sortOrder ?? 0
    const bOrder = b.sortOrder ?? 0
    try {
      await Promise.all([
        docsProvider.update(a.id, { sortOrder: bOrder }),
        docsProvider.update(b.id, { sortOrder: aOrder }),
      ])
      setData((prev) => ({
        ...prev,
        docs: prev.docs
          .map((d) => {
            if (d.id === a.id) return { ...d, sortOrder: bOrder }
            if (d.id === b.id) return { ...d, sortOrder: aOrder }
            return d
          })
          .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0)),
      }))
    } catch (err) {
      showToast(err.message ?? 'Sıra değiştirilemedi, tekrar dene.', 'error')
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Ekle
          </button>
        </div>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="grid gap-5 md:grid-cols-[200px_1fr]">
          <FolderList categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} countFor={countFor} />

          <div className="space-y-3">
            {docsInCategory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-sm text-ink-400">
                Bu klasörde henüz doküman yok.
              </div>
            ) : (
              docsInCategory.map((doc, index) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  current={currentVersion(doc.id, versions)}
                  history={versionsForDoc(doc.id, versions)}
                  onPreview={setPreviewVersion}
                  resolveName={userName}
                  canManage={canManage}
                  onEdit={() => setEditingDoc(doc)}
                  onDeleteRequest={() => setDeleteTarget(doc)}
                  onMove={(direction) => handleMoveDoc(doc.id, direction)}
                  isFirst={index === 0}
                  isLast={index === docsInCategory.length - 1}
                />
              ))
            )}
          </div>
        </div>
      )}

      {previewVersion && <PreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />}

      {showUpload && (
        <UploadDocModal
          onClose={() => setShowUpload(false)}
          onSubmit={handleSubmitDoc}
          submitting={submitting}
          docsInCategory={docsInCategory}
          defaultCategory={selectedCategory}
          categories={categories}
        />
      )}

      {editingDoc && (
        <UploadDocModal
          editingDoc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleSubmitDoc}
          submitting={submitting}
          docsInCategory={docsInCategory}
          categories={categories}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Bu dokümanı silmek istiyor musun?"
          message={`"${deleteTarget.baslik}" ve tüm sürümleri kalıcı olarak silinecek, geri alınamaz.`}
          confirmLabel="Evet, sil"
          tone="danger"
          onConfirm={() => handleDeleteDoc(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          confirming={deleting}
        />
      )}
    </div>
  )
}
