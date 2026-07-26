import { useState } from 'react'
import Modal from '../common/Modal'
import { formatPhoneInput } from '../../lib/phone'
import { capitalizeWords, capitalizeFirst } from '../../lib/format'
import {
  LEAD_TIPLERI,
  LEAD_TIP_LABELS,
  LEAD_KAYNAKLARI,
  LEAD_KAYNAK_LABELS,
  LEAD_DURUMLARI,
  LEAD_DURUM_LABELS,
  computeAutoFields,
} from '../../lib/leads'

// Hem "+ Yeni Lead" (lead=null) hem satır tıklaması (lead=mevcut kayıt)
// AYNI paneli açar (bkz. brief 3.5) — tüm alanlar her zaman düzenlenebilir.
export default function LeadDetailModal({ lead, danismanOptions, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    tip: lead?.tip ?? 'satici',
    kaynak: lead?.kaynak ?? 'telefon',
    adSoyad: lead?.adSoyad ?? '',
    telefon: lead?.telefon ?? '',
    email: lead?.email ?? '',
    atananDanismanId: lead?.atananDanismanId ?? '',
    durum: lead?.durum ?? 'yeni',
    kayipNedeni: lead?.kayipNedeni ?? '',
    aciklama: lead?.aciklama ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const kayipNedeniGerekli = form.durum === 'kaybedildi'
  const canSubmit = form.adSoyad.trim().length > 0 && (!kayipNedeniGerekli || form.kayipNedeni.trim().length > 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    // Yeni kayıt için "önceki durum" her zaman 'yeni'/hiç temas yok kabul
    // edilir — bkz. lib/leads.js computeAutoFields notu.
    const previous = lead ?? { durum: 'yeni', ilkTemasAt: null }
    const autoFields = computeAutoFields(previous, form.durum)
    onSubmit({
      ...form,
      adSoyad: capitalizeWords(form.adSoyad.trim()),
      telefon: form.telefon ? formatPhoneInput(form.telefon) : '',
      email: form.email.trim(),
      kayipNedeni: kayipNedeniGerekli ? form.kayipNedeni.trim() : '',
      aciklama: capitalizeFirst(form.aciklama.trim()),
      ...autoFields,
    })
  }

  return (
    <Modal title={lead ? 'Lead Detayı' : 'Yeni Lead'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.tip}
            onChange={(e) => set({ tip: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {LEAD_TIPLERI.map((t) => (
              <option key={t} value={t}>
                {LEAD_TIP_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={form.kaynak}
            onChange={(e) => set({ kaynak: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {LEAD_KAYNAKLARI.map((k) => (
              <option key={k} value={k}>
                {LEAD_KAYNAK_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <input
          required
          value={form.adSoyad}
          onChange={(e) => set({ adSoyad: e.target.value })}
          onBlur={(e) => set({ adSoyad: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            value={form.telefon}
            onChange={(e) => set({ telefon: formatPhoneInput(e.target.value) })}
            placeholder="Telefon"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
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
          <select
            value={form.durum}
            onChange={(e) => set({ durum: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            {LEAD_DURUMLARI.map((d) => (
              <option key={d} value={d}>
                {LEAD_DURUM_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        {kayipNedeniGerekli && (
          <div>
            <input
              value={form.kayipNedeni}
              onChange={(e) => set({ kayipNedeni: e.target.value })}
              placeholder="Kayıp nedeni (zorunlu)"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
            {form.kayipNedeni.trim().length === 0 && (
              <p className="mt-1 text-xs text-red-600">Durum "Kaybedildi" seçildiğinde kayıp nedeni zorunlu.</p>
            )}
          </div>
        )}

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
