import { useState } from 'react'
import Modal from '../common/Modal'
import { MANUAL_SCORE_CATEGORIES } from '../../lib/league'
import { formatThousands, parseThousands } from '../../lib/format'

const today = () => new Date().toISOString().slice(0, 10)

export default function AddScoreModal({ onClose, onSubmit, submitting, danismanOptions, defaultType }) {
  const initialType = MANUAL_SCORE_CATEGORIES.some((c) => c.key === defaultType) ? defaultType : MANUAL_SCORE_CATEGORIES[0].key
  const [form, setForm] = useState({ userId: '', type: initialType, value: '', tarih: today() })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const category = MANUAL_SCORE_CATEGORIES.find((c) => c.key === form.type)
  const parsedValue = parseThousands(form.value)
  // Ciro binlik ayraçlı ("4.750.000") gösterilsin diye type="number" yerine
  // formatThousands ile biçimlenen bir metin alanı kullanılıyor — native
  // number input'lar Türkçe binlik ayracını (nokta) geçersiz sayıp değeri
  // sessizce boşaltıyor, bu da Kaydet'i hiç açılmayan gri bir düğmeye
  // çeviriyordu.
  const canSubmit = form.userId && parsedValue !== null && form.tarih

  return (
    <Modal title="Skor Gir" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ userId: form.userId, type: form.type, value: parsedValue, tarih: form.tarih })
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
          placeholder={category?.unit === 'tl' ? 'Değer (₺)' : 'Değer (puan)'}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

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
