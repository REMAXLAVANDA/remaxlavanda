import { useState } from 'react'
import Modal from '../common/Modal'
import { OPPORTUNITY_TYPE_LABELS } from '../../lib/opportunities'
import { categoryLabel } from '../../lib/categories'
import { capitalizeWords, formatThousands } from '../../lib/format'

const ODA_SAYISI_OPTIONS = ['1+0', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1', '5+2', '6+1 ve üzeri']

// Yeni Fırsat formunun aksine tip/kategori burada değiştirilemez — hangi
// kutuya düştüğünü değiştirmek ayrı bir işlem sayılır, bu form sadece
// "yanlış yazılmış" alanları düzeltmek için (bkz. canEditOpportunity).
export default function EditOpportunityModal({ opportunity: opp, contact, onClose, onSubmit, submitting }) {
  const isAlici = opp.type === 'alici'
  const isKonut = opp.category === 'konut'
  const [form, setForm] = useState({
    leadAd: contact?.leadAd ?? '',
    leadTelefon: contact?.leadTelefon ?? '',
    konum: opp.konum ?? '',
    fiyat: opp.fiyat != null ? String(opp.fiyat) : '',
    fiyatMin: opp.fiyatMin != null ? String(opp.fiyatMin) : '',
    fiyatMax: opp.fiyatMax != null ? String(opp.fiyatMax) : '',
    ozet: opp.ozet ?? '',
    m2: opp.m2 != null ? String(opp.m2) : '',
    odaSayisi: opp.odaSayisi ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.leadAd.trim().length > 0

  return (
    <Modal title="Fırsatı Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            leadAd: capitalizeWords(form.leadAd.trim()),
            leadTelefon: form.leadTelefon.trim(),
            konum: form.konum.trim(),
            fiyat: form.fiyat,
            fiyatMin: form.fiyatMin,
            fiyatMax: form.fiyatMax,
            ozet: form.ozet.trim(),
            m2: form.m2,
            odaSayisi: form.odaSayisi,
          })
        }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
            {OPPORTUNITY_TYPE_LABELS[opp.type]}
          </span>
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-500">
            {categoryLabel(opp.category)}
          </span>
        </div>

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
          value={form.konum}
          onChange={(e) => set({ konum: e.target.value })}
          placeholder="Mahalle (ör. Hürriyet Mahallesi)"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        {isAlici ? (
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
          placeholder="Kısa özet"
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
