import { useMemo, useState } from 'react'
import { RotateCcw, Info, CalendarClock } from 'lucide-react'
import Modal from '../common/Modal'
import { formatPhoneInput } from '../../lib/phone'
import { capitalizeWords, capitalizeFirst, formatDateOnly } from '../../lib/format'
import { RECRUITING_DURUMLARI, RECRUITING_DURUM_LABELS, RECRUITING_KAYNAKLARI, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

const onlyDigits = (v) => (v ?? '').replace(/\D/g, '')

// interviewEvent.startAt (ISO) -> ayrı date/time input değerleri. Yeni
// aday ya da henüz görüşme tarihi girilmemiş adayda ikisi de boş.
function toDateTimeParts(iso) {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

// Hem "+ Yeni Aday" (candidate=null) hem satır tıklaması (candidate=mevcut
// kayıt) AYNI paneli açar — Lead Havuzu'ndaki LeadDetailModal ile aynı
// desen. initialValues: Lead Havuzu'ndan "Recruiting'e Dönüştür" ile
// açıldığında ön-dolu alanlar (bkz. Leads.jsx handleConvertToRecruiting).
// Bir gayrimenkul danışmanının işe alım adayına atanması hiçbir bağlamda
// anlamlı değil ("biz herhangi bir gayrimenkul danışmanı da bunu
// atamayacağız" kararı) — bu yüzden atananDanismanId seçimi buradan
// TAMAMEN kaldırıldı (sadece Lead dönüşümünde değil, Recruiting'in kendi
// yönetim ekranında da). Eski kayıtlarda kolon/veri DB'de durabilir,
// RecruitingTable/RecruitingFilters'taki salt-okunur gösterim ve filtre
// buna dokunmuyor — sadece BURADAN bir daha set edilemiyor.
export default function RecruitingDetailModal({
  candidate,
  initialValues,
  existingCandidates = [],
  interviewEvent,
  onClose,
  onSubmit,
  onReactivate,
  submitting,
}) {
  const interviewParts = toDateTimeParts(interviewEvent?.startAt)
  const [form, setForm] = useState({
    kaynak: candidate?.kaynak ?? initialValues?.kaynak ?? 'diger',
    adSoyad: candidate?.adSoyad ?? initialValues?.adSoyad ?? '',
    telefon: candidate?.telefon ?? initialValues?.telefon ?? '',
    email: candidate?.email ?? initialValues?.email ?? '',
    durum: candidate?.durum ?? 'yeni_basvuru',
    aciklama: candidate?.aciklama ?? '',
    gorusmeTarih: interviewParts.date,
    gorusmeSaat: interviewParts.time,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.adSoyad.trim().length > 0

  // Aynı numarayla daha önce aday girilmiş mi — sadece YENİ aday eklerken
  // anlamlı (düzenlerken kayıt kendi numarasıyla eşleşip yanlış uyarı
  // verir), o yüzden candidate varken hiç hesaplanmıyor. Engellemiyor,
  // sadece bilgilendiriyor (bkz. "tekrar giriliyorsa uyarı verse" isteği).
  const duplicateMatch = useMemo(() => {
    if (candidate) return null
    const digits = onlyDigits(form.telefon)
    if (digits.length !== 11) return null
    return existingCandidates.find((c) => onlyDigits(c.telefon) === digits) ?? null
  }, [candidate, form.telefon, existingCandidates])

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      ...form,
      adSoyad: capitalizeWords(form.adSoyad.trim()),
      telefon: form.telefon ? formatPhoneInput(form.telefon) : '',
      email: form.email.trim(),
      aciklama: capitalizeFirst(form.aciklama.trim()),
      kaynakLeadId: candidate ? undefined : (initialValues?.kaynakLeadId ?? null),
      // Saat girilmeden tarih anlamsız — ikisi birlikte doluysa Takvim'e
      // işleniyor (bkz. Recruiting.jsx handleSave), biri eksikse hiç
      // gönderilmiyor.
      gorusmeTarih: form.gorusmeTarih && form.gorusmeSaat ? form.gorusmeTarih : '',
      gorusmeSaat: form.gorusmeTarih && form.gorusmeSaat ? form.gorusmeSaat : '',
    })
  }

  return (
    <Modal title={candidate ? 'Aday Detayı' : 'Yeni Aday'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Arşivden taşınmış, henüz raporlu sürece alınmamış kayıtlar için
            — kayit_tipi='gecmis' olan HER kayıtta görünür, durum fark
            etmez (bkz. lib/recruiting.js / Recruiting.jsx handleReactivate). */}
        {candidate?.kayitTipi === 'gecmis' && (
          <div className="rounded-lg bg-ink-50 p-3">
            <button
              type="button"
              onClick={() => onReactivate(candidate)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
            >
              <RotateCcw size={14} /> Yeniden Aktifleştir
            </button>
          </div>
        )}
        <input
          required
          value={form.adSoyad}
          onChange={(e) => set({ adSoyad: e.target.value })}
          onBlur={(e) => set({ adSoyad: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="tel"
              value={form.telefon}
              onChange={(e) => set({ telefon: formatPhoneInput(e.target.value) })}
              placeholder="Telefon"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
            {duplicateMatch && (
              <p className="mt-1 flex items-start gap-1 text-xs text-amber-600">
                <Info size={13} className="mt-0.5 shrink-0" />
                Bu numarayla daha önce aday girilmiş: {duplicateMatch.adSoyad} — {formatDateOnly(duplicateMatch.createdAt)}
              </p>
            )}
          </div>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="E-posta"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.kaynak}
            onChange={(e) => set({ kaynak: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {RECRUITING_KAYNAKLARI.map((k) => (
              <option key={k} value={k}>
                {RECRUITING_KAYNAK_LABELS[k]}
              </option>
            ))}
          </select>
          <select
            value={form.durum}
            onChange={(e) => set({ durum: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {RECRUITING_DURUMLARI.map((d) => (
              <option key={d} value={d}>
                {RECRUITING_DURUM_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <CalendarClock size={13} /> Görüşme / Randevu Tarihi
            <span className="font-normal text-ink-400">(opsiyonel — Takvim'e işlenir)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={form.gorusmeTarih}
              onChange={(e) => set({ gorusmeTarih: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
            <input
              type="time"
              value={form.gorusmeSaat}
              onChange={(e) => set({ gorusmeSaat: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            />
          </div>
        </div>

        <textarea
          value={form.aciklama}
          onChange={(e) => set({ aciklama: e.target.value })}
          placeholder="Açıklama"
          rows={2}
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
