import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { docs as docsProvider, categories as categoriesProvider } from '../lib/dataProvider'
import { canManageDocs, currentVersion, versionsForDoc } from '../lib/docs'
import { canViewManagerCategories } from '../lib/roles'
import { slugify } from '../lib/categories'
import { uploadDocFile, deleteDocFile } from '../lib/storage'
import FolderList from '../components/rehber/FolderList'
import DocCard from '../components/rehber/DocCard'
import FaqAccordionItem from '../components/rehber/FaqAccordionItem'
import PreviewModal from '../components/rehber/PreviewModal'
import UploadDocModal from '../components/rehber/UploadDocModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { LoadingState, ErrorState } from '../components/common/AsyncState'

const EMPTY = []
// SSS kategorisi DocCard yerine akordiyon (FaqAccordionItem) ile
// gösteriliyor — bkz. broker isteği. Kategori kimliği bu projede hep
// `key` ile eşleşiyor (bkz. lib/league.js aynı desen), bu yüzden burada da
// key karşılaştırması kullanılıyor.
const FAQ_CATEGORY_KEY = 'sss'

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
  const canViewManager = canViewManagerCategories(role)
  const docs = data?.docs ?? EMPTY
  const versions = data?.versions ?? EMPTY
  const allCategories = data?.categories ?? EMPTY
  // "Yönetime özel" klasörler zaten RLS ile gelmiyor (broker/owner/ofis
  // dışındaki rollere) — bu filtre mock modda (RLS yok) aynı davranışı
  // sağlamak ve UI'nin tutarlı kalması için (bkz. lib/roles.js). Sadece
  // üst seviye (parentId yok) klasörler — SSS alt kategorileri sol menüde
  // ayrı bir klasör olarak GÖRÜNMEZ, sadece SSS görünümü içinde gruplama
  // için kullanılır (bkz. lib/subcategorySuggest.js).
  const categories = useMemo(
    () => allCategories.filter((c) => !c.parentId && (c.visibility !== 'yonetim' || canViewManager)),
    [allCategories, canViewManager],
  )
  const userName = (id) => knownUsers[id]?.name ?? '—'

  // Kategoriler yüklendikten sonra ilk klasör otomatik seçilsin.
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].key)
  }, [categories, selectedCategory])

  const selectedCategoryRow = useMemo(
    () => allCategories.find((c) => c.key === selectedCategory) ?? null,
    [allCategories, selectedCategory],
  )
  // Seçili klasörün alt kategorileri varsa (bkz. SSS) onlara ait
  // dokümanlar da aynı görünümde listelenir — sadece klasörün kendisine
  // bağlı dokümanlarla sınırlı kalmaz.
  const sssSubcategories = useMemo(
    () =>
      selectedCategoryRow
        ? allCategories
            .filter((c) => c.parentId === selectedCategoryRow.id)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : EMPTY,
    [allCategories, selectedCategoryRow],
  )
  const docsInCategory = useMemo(() => {
    const childKeys = sssSubcategories.map((c) => c.key)
    return docs.filter((d) => d.categoryKey === selectedCategory || childKeys.includes(d.categoryKey))
  }, [docs, selectedCategory, sssSubcategories])

  // SSS görünümünde her dokümanın hangi alt kategoriye ait olduğunu (varsa)
  // ve o alt kategori başlığının ilk kez mi gösterileceğini önceden
  // hesaplıyoruz — docsInCategory ile aynı sırada, index hizalı.
  const sssGroupLabels = useMemo(() => {
    if (selectedCategory !== FAQ_CATEGORY_KEY) return EMPTY
    let lastKey
    return docsInCategory.map((doc) => {
      const isSubcategory = doc.categoryKey !== selectedCategory
      const label = isSubcategory && doc.categoryKey !== lastKey
        ? allCategories.find((c) => c.key === doc.categoryKey)?.label ?? null
        : null
      lastKey = doc.categoryKey
      return label
    })
  }, [selectedCategory, docsInCategory, allCategories])

  function countFor(categoryKey) {
    const category = allCategories.find((c) => c.key === categoryKey)
    const childKeys = category ? allCategories.filter((c) => c.parentId === category.id).map((c) => c.key) : []
    return docs.filter((d) => d.categoryKey === categoryKey || childKeys.includes(d.categoryKey)).length
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

      // SSS'de broker yeni bir alt kategori adı yazdıysa (öneriyi kabul
      // ettiyse ya da elle girdiyse) doküman oluşturulmadan ÖNCE o alt
      // kategori (categories satırı, parentId=üst kategori) oluşturuluyor
      // — üst kategorinin visibility'si aynen kopyalanıyor.
      let targetCategoryKey = form.categoryKey
      if (form.newSubcategoryLabel) {
        const parent = allCategories.find((c) => c.key === form.categoryKey)
        const siblings = allCategories.filter((c) => c.parentId === parent?.id)
        const maxSubOrder = siblings.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), 0)
        const createdSub = await categoriesProvider.create({
          module: 'docs',
          key: slugify(form.newSubcategoryLabel),
          label: form.newSubcategoryLabel,
          sortOrder: maxSubOrder + 1,
          visibility: parent?.visibility ?? 'herkes',
          parentId: parent?.id ?? null,
        })
        setData((prev) => ({ ...prev, categories: [...prev.categories, createdSub] }))
        targetCategoryKey = createdSub.key
      } else if (form.subcategoryKey) {
        targetCategoryKey = form.subcategoryKey
      }

      let targetDocId = form.docId
      if (!targetDocId) {
        const sameCategory = docs.filter((d) => d.categoryKey === targetCategoryKey)
        const maxOrder = sameCategory.reduce((max, d) => Math.max(max, d.sortOrder ?? 0), 0)
        const created = await docsProvider.createDoc(
          { categoryKey: targetCategoryKey, baslik: form.baslik, sortOrder: maxOrder + 1 },
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
          <FolderList categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} countFor={countFor} />

          <div className="space-y-3">
            {docsInCategory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
                Bu klasörde henüz doküman yok.
              </div>
            ) : (
              docsInCategory.map((doc, index) =>
                selectedCategory === FAQ_CATEGORY_KEY ? (
                  <div key={doc.id}>
                    {sssGroupLabels[index] && (
                      <p className="mb-1.5 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-text-disabled first:mt-0">
                        {sssGroupLabels[index]}
                      </p>
                    )}
                    <FaqAccordionItem
                      doc={doc}
                      canManage={canManage}
                      onEdit={() => setEditingDoc(doc)}
                      onDeleteRequest={() => setDeleteTarget(doc)}
                      onMove={(direction) => handleMoveDoc(doc.id, direction)}
                      isFirst={index === 0}
                      isLast={index === docsInCategory.length - 1}
                    />
                  </div>
                ) : (
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
                ),
              )
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
          allCategories={allCategories}
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
          allCategories={allCategories}
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
