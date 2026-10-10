import { useRef, useState } from 'react'
import Modal from '../common/Modal'
import { OPPORTUNITY_CATEGORIES } from '../../lib/categories'
import { OPPORTUNITY_TYPE_LABELS, ISLEM_TIPI_LABELS, tarafLabel } from '../../lib/opportunities'
import { capitalizeFirst, capitalizeWords, formatThousands, parseThousands } from '../../lib/format'
import { formatPhoneInput, isPhoneComplete } from '../../lib/phone'

function emptyForm(defaultType, initialValues) {
  return {
    type: defaultType,
    category: OPPORTUNITY_CATEGORIES[0].key,
    // Satıcı: mülk satılık mı kiralık mı. Alıcı: satın almak mı kiralamak
    // mı istiyor. Her iki tarafta da geçerli (bkz. broker kararı).
    islemTipi: 'satilik',
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
    ...initialValues,
  }
}

// Konut için standart oda sayısı seçenekleri — serbest metin yerine
// listeden seçilsin diye (yazım farklılıkları/hatalar olmasın).
const ODA_SAYISI_OPTIONS = ['1+0', '1+1', '2+1', '3+1', '4+1', '4+2', '5+1', '5+2', '6+1 ve üzeri']

// showPoolToggle: sadece danışman rolünde (ya da Operasyon'dan atanmış bir
// çağrı dönüştürülürken herkeste) gösterilir — diğer roller zaten her zaman
// havuza ekliyor (bkz. Firsatlar.jsx CAN_CREATE_ROLES/handleCreate).
// defaultType: hangi bölümün "+" butonundan açıldığına göre (Satıcılar/Alıcılar).
// initialValues/kaynakLeadId: Lead Havuzu'ndan "Fırsata Dönüştür" ile
// açıldığında ön-dolu alanlar (bkz. Leads.jsx handleConvertToOpportunity).
// kaynakLeadId form alanı DEĞİL — kullanıcı görmez/değiştiremez, submit'te
// ayrıca payload'a eklenir.
// poolToggleNote: varsayılan metni ("tik kapalıysa sende kalır") ezer —
// Operasyon'da broker/ofis BAŞKASINA atanmış bir çağrıyı dönüştürürken
// fırsat "sende" değil, çağrının atandığı danışmanda kalıyor; bu durumda
// doğru kişiyi adıyla belirten bir not gönderilir (bkz. OperasyonTab.jsx).
// Not: Lead Havuzu'ndan Portföy'e giden lead'ler artık bu formu HİÇ
// açmıyor — broker property detaylarını bilmediği için (bkz.
// AssignPortfolioLeadModal), sadece danışman seçip minimal bir kayıt
// oluşturuyor, danışman geri kalanını kendi ekranından tamamlıyor.
export default function NewOpportunityModal({
  onClose,
  onSubmit,
  submitting,
  showPoolToggle = false,
  poolToggleNote,
  defaultType = 'satici',
  initialValues,
  kaynakLeadId,
}) {
  const [form, setForm] = useState(() => emptyForm(defaultType, initialValues))
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const phoneRef = useRef(null)

  const isAlici = form.type === 'alici'
  const isKiralik = form.islemTipi === 'kiralik'
  const isKonut = form.category === 'konut'
  const minVal = parseThousands(form.fiyatMin)
  const maxVal = parseThousands(form.fiyatMax)
  const budgetRangeInvalid = isAlici && minVal !== null && maxVal !== null && minVal > maxVal
  const canSubmit =
    Boolean(form.type) &&
    form.leadAd.trim().length > 0 &&
    form.konum.trim().length > 0 &&
    !budgetRangeInvalid &&
    isPhoneComplete(form.leadTelefon)

  return (
    <Modal title="Yeni Fırsat" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          // Tarayıcı otomatik doldurma gibi yollar formatPhoneInput'u
          // atlayıp React state'ini güncellemeden kutuya değer yazabiliyor
          // — kaydetme anında kutunun gerçek DOM değerini tekrar okuyup
          // biçimlendiriyoruz, sadece state'e güvenmiyoruz.
          const leadTelefon = formatPhoneInput(phoneRef.current?.value ?? form.leadTelefon)
          if (
            !form.type ||
            form.leadAd.trim().length === 0 ||
            form.konum.trim().length === 0 ||
            budgetRangeInvalid ||
            !isPhoneComplete(leadTelefon)
          ) {
            return
          }
          onSubmit({
            ...form,
            leadAd: capitalizeWords(form.leadAd.trim()),
            leadTelefon,
            konum: capitalizeWords(form.konum.trim()),
            ozet: capitalizeFirst(form.ozet.trim()),
            kaynakLeadId: kaynakLeadId ?? null,
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
              zaman açılmaz, sadece sahibi görür. {poolToggleNote ?? 'Tik kapalıysa fırsat direkt sende kalır.'}
            </span>
          </label>
        )}
        <div>
          <span className="mb-1 block text-xs font-medium text-ink-600">Müşteri ne istiyor?</span>
          <div className="flex gap-1.5">
            {Object.keys(OPPORTUNITY_TYPE_LABELS).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={form.type === key}
                onClick={() => set({ type: key })}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  form.type === key ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {tarafLabel(form.category, form.islemTipi, key)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-ink-600">Satılık mı, kiralık mı?</span>
          <div className="flex gap-1.5">
            {Object.entries(ISLEM_TIPI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={form.islemTipi === key}
                onClick={() => set({ islemTipi: key })}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  form.islemTipi === key ? 'bg-ink-800 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-kategori">
            Kategori
          </label>
          <select
            id="opp-new-kategori"
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
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-ad">
            Ad Soyad <span className="text-red-600">*</span>
          </label>
          <input
            id="opp-new-ad"
            required
            value={form.leadAd}
            onChange={(e) => set({ leadAd: e.target.value })}
            onBlur={(e) => set({ leadAd: capitalizeWords(e.target.value) })}
            placeholder="Ad Soyad"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-telefon">
            Telefon <span className="text-red-600">*</span>
          </label>
          <input
            id="opp-new-telefon"
            ref={phoneRef}
            type="tel"
            value={form.leadTelefon}
            onChange={(e) => set({ leadTelefon: formatPhoneInput(e.target.value) })}
            placeholder="0 (5XX) XXX XX XX"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          {!isPhoneComplete(form.leadTelefon) && (
            <p className="mt-1 text-xs text-red-600">Telefon 11 haneli olmalı — 0 (5XX) XXX XX XX</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-mahalle">
            Mahalle <span className="text-red-600">*</span>
          </label>
          <input
            id="opp-new-mahalle"
            required
            value={form.konum}
            onChange={(e) => set({ konum: e.target.value })}
            onBlur={(e) => set({ konum: capitalizeWords(e.target.value) })}
            placeholder="ör. Hürriyet Mahallesi"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>

        {isAlici ? (
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-600">
              {isKiralik ? 'Kira bütçesi' : 'Bütçe'}
            </span>
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
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-fiyat">
              {isKiralik ? 'Aylık Kira' : 'Fiyat'}
            </label>
            <input
              id="opp-new-fiyat"
              inputMode="numeric"
              value={form.fiyat}
              onChange={(e) => set({ fiyat: formatThousands(e.target.value) })}
              placeholder={isKiralik ? 'Aylık Kira (₺)' : 'Yaklaşık Fiyat (₺)'}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-m2">
              m²
            </label>
            <input
              id="opp-new-m2"
              type="number"
              min="0"
              value={form.m2}
              onChange={(e) => set({ m2: e.target.value })}
              placeholder="m²"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
          {isKonut && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-oda">
                Oda sayısı
              </label>
              <select
                id="opp-new-oda"
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
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-600" htmlFor="opp-new-ozet">
            Ek notlar
          </label>
          <textarea
            id="opp-new-ozet"
            value={form.ozet}
            onChange={(e) => set({ ozet: e.target.value })}
            onBlur={(e) => set({ ozet: capitalizeFirst(e.target.value) })}
            placeholder="Konum yukarıdaki Mahalle alanına yazılmalı, buraya değil"
            rows={3}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
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
