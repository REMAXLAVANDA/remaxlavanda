import { useRef, useState } from 'react'
import Modal from '../common/Modal'
import { OPPORTUNITY_TYPE_LABELS, ISLEM_TIPI_LABELS } from '../../lib/opportunities'
import { OPPORTUNITY_CATEGORIES } from '../../lib/categories'
import { capitalizeFirst, capitalizeWords, formatThousands, parseThousands } from '../../lib/format'
import { formatPhoneInput, isPhoneComplete } from '../../lib/phone'

const ODA_SAYISI_OPTIONS = ['1+0', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1', '5+2', '6+1 ve üzeri']

// Tür/Kategori ARTIK burada da düzenlenebilir — eskiden bilerek dışarıda
// bırakılmıştı ("hangi kutuya düştüğünü değiştirmek ayrı bir işlem
// sayılır") ama Lead Havuzu'ndan Portföy'e sadece danışman ataması ile
// gönderilen bir kayıtta bu ikisi HİÇ bilinmiyor (broker alıcı/satıcı
// ayrımını da kategoriyi de bilmiyor — reklamlar ikisini birden
// topluyor). Danışman kendi kaydını ilk incelediğinde bunları kendisi
// seçip tamamlıyor (bkz. AI_NOTLARI.md, Leads.jsx AssignPortfolioLeadModal).
export default function EditOpportunityModal({ opportunity: opp, contact, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    type: opp.type,
    category: opp.category,
    leadAd: contact?.leadAd ?? '',
    leadTelefon: formatPhoneInput(contact?.leadTelefon ?? ''),
    islemTipi: opp.islemTipi ?? 'satilik',
    konum: opp.konum ?? '',
    fiyat: opp.fiyat != null ? formatThousands(String(opp.fiyat)) : '',
    fiyatMin: opp.fiyatMin != null ? formatThousands(String(opp.fiyatMin)) : '',
    fiyatMax: opp.fiyatMax != null ? formatThousands(String(opp.fiyatMax)) : '',
    ozet: opp.ozet ?? '',
    m2: opp.m2 != null ? String(opp.m2) : '',
    odaSayisi: opp.odaSayisi ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const phoneRef = useRef(null)
  const isAlici = form.type === 'alici'
  const isKonut = form.category === 'konut'
  const isKiralik = form.islemTipi === 'kiralik'
  const minVal = parseThousands(form.fiyatMin)
  const maxVal = parseThousands(form.fiyatMax)
  const budgetRangeInvalid = isAlici && minVal !== null && maxVal !== null && minVal > maxVal
  const canSubmit =
    form.leadAd.trim().length > 0 &&
    form.konum.trim().length > 0 &&
    !budgetRangeInvalid &&
    isPhoneComplete(form.leadTelefon)

  return (
    <Modal title="Fırsatı Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          // Tarayıcı otomatik doldurma gibi yollar formatPhoneInput'u
          // atlayıp React state'ini güncellemeden kutuya değer yazabiliyor
          // — kaydetme anında kutunun gerçek DOM değerini tekrar okuyup
          // biçimlendiriyoruz, sadece state'e güvenmiyoruz.
          const leadTelefon = formatPhoneInput(phoneRef.current?.value ?? form.leadTelefon)
          if (
            form.leadAd.trim().length === 0 ||
            form.konum.trim().length === 0 ||
            budgetRangeInvalid ||
            !isPhoneComplete(leadTelefon)
          ) {
            return
          }
          onSubmit({
            type: form.type,
            category: form.category,
            leadAd: capitalizeWords(form.leadAd.trim()),
            leadTelefon,
            islemTipi: form.islemTipi,
            konum: capitalizeWords(form.konum.trim()),
            fiyat: form.fiyat,
            fiyatMin: form.fiyatMin,
            fiyatMax: form.fiyatMax,
            ozet: capitalizeFirst(form.ozet.trim()),
            m2: form.m2,
            odaSayisi: form.odaSayisi,
          })
        }}
        className="space-y-3"
      >
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

        <div className="flex gap-1.5">
          {Object.entries(ISLEM_TIPI_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ islemTipi: key })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                form.islemTipi === key ? 'bg-ink-800 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          required
          value={form.leadAd}
          onChange={(e) => set({ leadAd: e.target.value })}
          onBlur={(e) => set({ leadAd: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
        <div>
          <input
            ref={phoneRef}
            type="tel"
            value={form.leadTelefon}
            onChange={(e) => set({ leadTelefon: formatPhoneInput(e.target.value) })}
            placeholder="Telefon"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          {!isPhoneComplete(form.leadTelefon) && (
            <p className="mt-1 text-xs text-red-600">Telefon 11 haneli olmalı — 0 (5XX) XXX XX XX</p>
          )}
        </div>
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
                placeholder={isKiralik ? 'Kira bütçesi min (₺)' : 'Bütçe min (₺)'}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
              />
              <input
                inputMode="numeric"
                value={form.fiyatMax}
                onChange={(e) => set({ fiyatMax: formatThousands(e.target.value) })}
                placeholder={isKiralik ? 'Kira bütçesi max (₺)' : 'Bütçe max (₺)'}
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
            placeholder={isKiralik ? 'Aylık Kira (₺)' : 'Yaklaşık Fiyat (₺)'}
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
