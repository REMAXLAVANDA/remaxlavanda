import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import Modal from '../common/Modal'
import { MANUAL_SCORE_CATEGORIES } from '../../lib/league'
import { formatThousands, parseThousands } from '../../lib/format'

const today = () => new Date().toISOString().slice(0, 10)

// Ciro kümülatiftir: her "Kaydet" BİR SATIŞ ekler, dönem toplamına yazılmaz
// üstüne — bu yüzden burada girilen tutar her zaman "bu satışın tutarı"dır,
// önceki toplam değil. Müşteri isimleri de AYNI formda eklenebiliyor, ayrı
// bir "Yorum Hakkı" menüsüne gitmeye gerek kalmasın diye. Sadece isim
// eklemek (yeni bir satış olmadan) için Yorum Hakkı panelindeki "isim ekle"
// kullanılmalı — buradan 0 tutarla göndermek satış sayısını bozar.
export default function AddScoreModal({ onClose, onSubmit, submitting, danismanOptions, defaultType }) {
  const initialType = MANUAL_SCORE_CATEGORIES.some((c) => c.key === defaultType) ? defaultType : MANUAL_SCORE_CATEGORIES[0].key
  const [form, setForm] = useState({ userId: '', type: initialType, value: '', tarih: today() })
  const [musteriler, setMusteriler] = useState([])
  const [nameDraft, setNameDraft] = useState('')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const category = MANUAL_SCORE_CATEGORIES.find((c) => c.key === form.type)
  const parsedValue = parseThousands(form.value)
  // Ciro binlik ayraçlı ("4.750.000") gösterilsin diye type="number" yerine
  // formatThousands ile biçimlenen bir metin alanı kullanılıyor — native
  // number input'lar Türkçe binlik ayracını (nokta) geçersiz sayıp değeri
  // sessizce boşaltıyor, bu da Kaydet'i hiç açılmayan gri bir düğmeye
  // çeviriyordu.
  const canSubmit = form.userId && parsedValue !== null && form.tarih

  function addName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    setMusteriler((m) => [...m, trimmed])
    setNameDraft('')
  }

  return (
    <Modal title="Skor Gir" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ userId: form.userId, type: form.type, value: parsedValue, tarih: form.tarih, musteriler })
        }}
        className="space-y-3"
      >
        <select
          required
          value={form.userId}
          onChange={(e) => set({ userId: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          <option value="">Danışman seç</option>
          {danismanOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select
          value={form.type}
          onChange={(e) => set({ type: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          {MANUAL_SCORE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          required
          inputMode="numeric"
          value={form.value}
          onChange={(e) => set({ value: formatThousands(e.target.value) })}
          placeholder={category?.unit === 'tl' ? 'Bu satışın tutarı (₺)' : 'Değer (puan)'}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        {category?.unit === 'tl' && (
          <div className="space-y-1.5 rounded-lg bg-ink-50 p-3">
            <p className="text-xs text-ink-500">
              Bu satışa dönen müşteri(ler) — her isim 1 yorum hakkı getirir.
            </p>
            {musteriler.length > 0 && (
              <div className="space-y-1">
                {musteriler.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-ink-700">
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => setMusteriler((m) => m.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded p-0.5 text-ink-300 hover:bg-ink-100 hover:text-ink-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addName()
                  }
                }}
                placeholder="İsim soyisim"
                className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800 placeholder:text-ink-400"
              />
              <button
                type="button"
                onClick={addName}
                className="shrink-0 rounded-lg bg-brand-50 p-1.5 text-brand-700 hover:bg-brand-100"
                title="Ekle"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-ink-500">
            Hangi tarih için (geriye/ileriye tarihli girilebilir — o tarihi kapsayan döneme yazılır)
          </label>
          <input
            required
            type="date"
            value={form.tarih}
            onChange={(e) => set({ tarih: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
        </div>

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
