import { useMemo, useState } from 'react'
import { RotateCcw, Info } from 'lucide-react'
import Modal from '../common/Modal'
import { formatPhoneInput } from '../../lib/phone'
import { capitalizeWords, capitalizeFirst, formatDateOnly } from '../../lib/format'
import { RECRUITING_DURUMLARI, RECRUITING_DURUM_LABELS, RECRUITING_KAYNAKLARI, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

const onlyDigits = (v) => (v ?? '').replace(/\D/g, '')

// Hem "+ Yeni Aday" (candidate=null) hem satır tıklaması (candidate=mevcut
// kayıt) AYNI paneli açar — Lead Havuzu'ndaki LeadDetailModal ile aynı
// desen. initialValues: Lead Havuzu'ndan "Recruiting'e Dönüştür" ile
// açıldığında ön-dolu alanlar (bkz. Leads.jsx handleConvertToRecruiting).
export default function RecruitingDetailModal({ candidate, initialValues, danismanOptions, existingCandidates = [], onClose, onSubmit, onReactivate, submitting }) {
  const [form, setForm] = useState({
    kaynak: candidate?.kaynak ?? initialValues?.kaynak ?? 'diger',
    adSoyad: candidate?.adSoyad ?? initialValues?.adSoyad ?? '',
    telefon: candidate?.telefon ?? initialValues?.telefon ?? '',
    email: candidate?.email ?? initialValues?.email ?? '',
    atananDanismanId: candidate?.atananDanismanId ?? initialValues?.atananDanismanId ?? '',
    durum: candidate?.durum ?? 'yeni_basvuru',
    aciklama: candidate?.aciklama ?? '',
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

        <select
          value={form.atananDanismanId}
          onChange={(e) => set({ atananDanismanId: e.target.value })}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
        >
          <option value="">Atanmadı</option>
          {danismanOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

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
