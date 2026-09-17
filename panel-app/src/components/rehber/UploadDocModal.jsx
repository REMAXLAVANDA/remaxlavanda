import { useState } from 'react'
import { Upload, Sparkles } from 'lucide-react'
import Modal from '../common/Modal'
import { validateFile } from '../../lib/storage'
import { capitalizeFirst, capitalizeWords } from '../../lib/format'
import { suggestSubcategory } from '../../lib/subcategorySuggest'

const NEW_DOC = '__new__'
const NEW_SUBCATEGORY = '__new__'
// Alt kategori sadece SSS'de destekleniyor (bkz. broker isteği,
// 2026-09-17) — başka kategorilerde bu alan hiç gösterilmiyor.
const SUBCATEGORY_PARENT_KEY = 'sss'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Üç kullanım: (1) yeni dosya yükleme (Storage'a), (2) yeni yazı girme
// (docs.content_text — dosya gerektirmeyen şirket bilgisi gibi içerikler
// için), (3) var olan bir dokümanı düzenleme (editingDoc) — başlık HER
// zaman düzenlenebilir, içerik SADECE metin dokümanlarında (contentText
// dolu olanlarda) düzenlenebilir; dosya dokümanlarında yeni dosya/versiyon
// eklemek ayrı bir akış (bkz. "+ Yeni doküman" altındaki mevcut doküman
// seçimi), burada sadece başlık düzeltilir.
export default function UploadDocModal({
  onClose,
  onSubmit,
  submitting,
  docsInCategory,
  defaultCategory,
  categories,
  allCategories = [],
  editingDoc,
}) {
  const isEditingText = Boolean(editingDoc) && editingDoc.contentText != null
  const isEditingFile = Boolean(editingDoc) && editingDoc.contentText == null
  const [mode, setMode] = useState(isEditingText ? 'text' : 'file')
  const [categoryKey, setCategoryKey] = useState(editingDoc?.categoryKey ?? defaultCategory ?? categories[0]?.key ?? '')
  const [docId, setDocId] = useState(editingDoc?.id ?? NEW_DOC)
  const [baslik, setBaslik] = useState(editingDoc?.baslik ?? '')
  const [contentText, setContentText] = useState(editingDoc?.contentText ?? '')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [subcategoryChoice, setSubcategoryChoice] = useState('')
  const [newSubcategoryLabel, setNewSubcategoryLabel] = useState('')

  const isNewDoc = docId === NEW_DOC
  const canSubmit = isEditingFile
    ? baslik.trim().length > 0
    : mode === 'file'
      ? Boolean(file) && (isNewDoc ? baslik.trim().length > 0 : true)
      : baslik.trim().length > 0 && contentText.trim().length > 0

  // Alt kategori öner/seç — sadece yeni bir SSS yazı dokümanı eklenirken
  // gösteriliyor (var olan dokümanı düzenlerken veya başka bir kategoride
  // değil).
  const showSubcategoryPicker = !editingDoc && mode === 'text' && categoryKey === SUBCATEGORY_PARENT_KEY
  const sssParent = allCategories.find((c) => c.key === SUBCATEGORY_PARENT_KEY)
  const sssSubcategories = sssParent
    ? allCategories.filter((c) => c.parentId === sssParent.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : []

  function handleSuggestSubcategory() {
    const suggestion = suggestSubcategory(`${baslik} ${contentText}`)
    if (!suggestion) return
    const existing = sssSubcategories.find(
      (s) => s.label.toLocaleLowerCase('tr-TR') === suggestion.toLocaleLowerCase('tr-TR'),
    )
    if (existing) {
      setSubcategoryChoice(existing.key)
    } else {
      setSubcategoryChoice(NEW_SUBCATEGORY)
      setNewSubcategoryLabel(suggestion)
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0] ?? null
    if (!selected) {
      setFile(null)
      setFileError(null)
      return
    }
    const check = validateFile(selected)
    if (!check.ok) {
      setFile(null)
      setFileError(check.reason)
      return
    }
    setFile(selected)
    setFileError(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    if (isEditingFile) {
      onSubmit({ mode: 'rename', docId: editingDoc.id, baslik: capitalizeWords(baslik.trim()) })
    } else if (isEditingText) {
      onSubmit({
        mode: 'text',
        categoryKey: editingDoc.categoryKey,
        docId: editingDoc.id,
        baslik: capitalizeWords(baslik.trim()),
        contentText: capitalizeFirst(contentText.trim()),
      })
    } else if (mode === 'file') {
      onSubmit({ mode: 'file', categoryKey, docId: isNewDoc ? null : docId, baslik: isNewDoc ? capitalizeWords(baslik) : null, file })
    } else {
      onSubmit({
        mode: 'text',
        categoryKey,
        docId: isNewDoc ? null : docId,
        baslik: isNewDoc ? capitalizeWords(baslik) : null,
        contentText: capitalizeFirst(contentText.trim()),
        subcategoryKey:
          showSubcategoryPicker && subcategoryChoice && subcategoryChoice !== NEW_SUBCATEGORY ? subcategoryChoice : null,
        newSubcategoryLabel:
          showSubcategoryPicker && subcategoryChoice === NEW_SUBCATEGORY && newSubcategoryLabel.trim()
            ? newSubcategoryLabel.trim()
            : null,
      })
    }
  }

  return (
    <Modal title={editingDoc ? (isEditingFile ? 'Başlığı Düzenle' : 'Metni Düzenle') : 'Doküman Ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!editingDoc && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'file' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              Dosya Yükle
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'text' ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              Yazı Yaz
            </button>
          </div>
        )}

        {!editingDoc && (
          <select
            value={categoryKey}
            onChange={(e) => {
              setCategoryKey(e.target.value)
              setDocId(NEW_DOC)
            }}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        {mode === 'file' && !editingDoc && (
          <select
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            <option value={NEW_DOC}>+ Yeni doküman</option>
            {docsInCategory
              .filter((d) => !d.contentText)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.baslik} (yeni versiyon ekle)
                </option>
              ))}
          </select>
        )}

        {(isEditingFile || isEditingText || isNewDoc) && (
          <input
            required
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            onBlur={(e) => setBaslik(capitalizeWords(e.target.value))}
            placeholder="Doküman başlığı"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        )}

        {isEditingFile ? null : mode === 'file' ? (
          <div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50 px-3 py-3 text-sm text-ink-600 hover:bg-ink-100">
              <Upload size={16} className="shrink-0 text-ink-400" />
              <span className="truncate">{file ? `${file.name} (${formatSize(file.size)})` : 'Dosya seç (PDF, resim, Office, ZIP — 20 MB\'a kadar)'}</span>
              <input type="file" onChange={handleFileChange} className="hidden" />
            </label>
            {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          </div>
        ) : (
          <div>
            <textarea
              required
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              onBlur={(e) => setContentText(capitalizeFirst(e.target.value))}
              placeholder="Metni buraya yaz..."
              rows={8}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
            <p className="mt-1 text-xs text-ink-400">
              Biçimlendirme: <strong>**kalın metin**</strong>, satır başında "- " ile madde işareti, satır başında
              "# " ile başlık.
            </p>
          </div>
        )}

        {showSubcategoryPicker && (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <select
                value={subcategoryChoice}
                onChange={(e) => setSubcategoryChoice(e.target.value)}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
              >
                <option value="">Alt kategori yok</option>
                {sssSubcategories.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
                <option value={NEW_SUBCATEGORY}>+ Yeni alt kategori</option>
              </select>
              <button
                type="button"
                onClick={handleSuggestSubcategory}
                disabled={!baslik.trim() && !contentText.trim()}
                title="Soru/cevap metnine göre alt kategori öner (anahtar kelime eşleştirmesi, ücretsiz)"
                className="flex shrink-0 items-center gap-1 rounded-lg bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-50"
              >
                <Sparkles size={13} /> Öner
              </button>
            </div>
            {subcategoryChoice === NEW_SUBCATEGORY && (
              <input
                value={newSubcategoryLabel}
                onChange={(e) => setNewSubcategoryLabel(e.target.value)}
                onBlur={(e) => setNewSubcategoryLabel(capitalizeWords(e.target.value))}
                placeholder="Yeni alt kategori adı (ör. Komisyon)"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
