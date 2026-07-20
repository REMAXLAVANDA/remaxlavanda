import { useState } from 'react'
import Modal from '../common/Modal'
import { OPPORTUNITY_CATEGORIES } from '../../lib/categories'
import { OPPORTUNITY_TYPE_LABELS } from '../../lib/opportunities'
import { capitalizeFirst, capitalizeWords, formatThousands, parseThousands } from '../../lib/format'

const EMPTY_FORM = {
  type: 'satici',
  category: OPPORTUNITY_CATEGORIES[0].key,
  leadAd: '',
  leadTelefon: '',
  konum: '',
  fiyat: '',
  fiyatMin: '',
  fiyatMax: '',
  ozet: '',
  m2: '',
  odaSayisi: '',
  havuzaAt: false,
}

// Konut için standart oda sayısı seçenekleri — serbest metin yerine
// listeden seçilsin diye (yazım farklılıkları/hatalar olmasın).
const ODA_SAYISI_OPTIONS = ['1+0', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1', '5+2', '6+1 ve üzeri']

// showPoolToggle: sadece danışman rolünde gösterilir — diğer roller zaten
// her zaman havuza ekliyor (bkz. Firsatlar.jsx CAN_CREATE_ROLES/handleCreate).
export default function NewOpportunityModal({ onClose, onSubmit, submitting, showPoolToggle = false }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const isAlici = form.type === 'alici'
  const isKonut = form.category === 'konut'
  const minVal = parseThousands(form.fiyatMin)
  const maxVal = parseThousands(form.fiyatMax)
  const budgetRangeInvalid = isAlici && minVal !== null && maxVal !== null && minVal > maxVal
  const canSubmit = form.leadAd.trim().length > 0 && form.konum.trim().length > 0 && !budgetRangeInvalid

  return (
    <Modal title="Yeni Fırsat" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            ...form,
            leadAd: capitalizeWords(form.leadAd.trim()),
            konum: capitalizeWords(form.konum.trim()),
            ozet: capitalizeFirst(form.ozet.trim()),
          })
        }}
        className="space-y-3"
      >
        {showPoolToggle && (
          <label className="flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={form.havuzaAt}
              onChange={(e) => set({ havuzaAt: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-ink-300"
            />
            <span>
              Havuza at — diğer danışmanlar görüp ilgi gösterebilsin. Müşteri ad/telefonu ilgi gösterene hiçbir
              zaman açılmaz, sadece sen görürsün. Tik kapalıysa fırsat direkt sende kalır.
            </span>
          </label>
        )}
        <div className="flex gap-1.5">
          {Object.entries(OPPORTUNITY_TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ type: key })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                form.type === key ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={form.category}
          onChange={(e) => set({ category: e.target.value, odaSayisi: '' })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          {OPPORTUNITY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          required
          value={form.leadAd}
          onChange={(e) => set({ leadAd: e.target.value })}
          onBlur={(e) => set({ leadAd: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <input
          value={form.leadTelefon}
          onChange={(e) => set({ leadTelefon: e.target.value })}
          placeholder="Telefon"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <input
          required
          value={form.konum}
          onChange={(e) => set({ konum: e.target.value })}
          onBlur={(e) => set({ konum: capitalizeWords(e.target.value) })}
          placeholder="Mahalle (ör. Hürriyet Mahallesi) — zorunlu"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        {isAlici ? (
          <div>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                value={form.fiyatMin}
                onChange={(e) => set({ fiyatMin: formatThousands(e.target.value) })}
                placeholder="Bütçe min (₺)"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
              />
              <input
                inputMode="numeric"
                value={form.fiyatMax}
                onChange={(e) => set({ fiyatMax: formatThousands(e.target.value) })}
                placeholder="Bütçe max (₺)"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
              />
            </div>
            {budgetRangeInvalid && <p className="mt-1 text-xs text-red-600">Bütçe min, max'tan büyük olamaz.</p>}
          </div>
        ) : (
          <input
            inputMode="numeric"
            value={form.fiyat}
            onChange={(e) => set({ fiyat: formatThousands(e.target.value) })}
            placeholder="Yaklaşık Fiyat (₺)"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            value={form.m2}
            onChange={(e) => set({ m2: e.target.value })}
            placeholder="m²"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          {isKonut && (
            <select
              value={form.odaSayisi}
              onChange={(e) => set({ odaSayisi: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            >
              <option value="">Oda sayısı seç</option>
              {ODA_SAYISI_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
        </div>

        <textarea
          value={form.ozet}
          onChange={(e) => set({ ozet: e.target.value })}
          onBlur={(e) => set({ ozet: capitalizeFirst(e.target.value) })}
          placeholder="Ek notlar (konum yukarıdaki Mahalle alanına yazılmalı, buraya değil)"
          rows={3}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

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
