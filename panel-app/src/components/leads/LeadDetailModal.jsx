import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
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
  LEAD_KAMPANYA_KODLARI,
  computeAutoFields,
} from '../../lib/leads'

// Dönüştürülmüş bir lead artık düzenlenemez — form yerine salt okunur bir
// özet + hedef kayda giden bir buton gösterilir (bkz. "aksi halde durum
// 'dönüştürüldü' der ama bağlı kayıt olmaz" gerekçesi). Hedefi bulmak için
// ayrı bir kolon YOK — Leads.jsx zaten opportunities/recruiting_candidates
// listelerini yükleyip kaynak_lead_id eşleşmesiyle bu prop'u hesaplıyor.
function ConvertedView({ lead, danismanOptions, convertedTarget, onClose, onViewTarget }) {
  const atananAd = danismanOptions.find((u) => u.id === lead.atananDanismanId)?.name ?? 'Atanmadı'
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-700">
        Bu lead dönüştürüldü, artık düzenlenemez.
      </div>
      <div className="space-y-1.5 text-sm text-ink-700">
        <p>
          <span className="text-ink-400">Tip:</span> {LEAD_TIP_LABELS[lead.tip]}
        </p>
        <p>
          <span className="text-ink-400">Kaynak:</span> {LEAD_KAYNAK_LABELS[lead.kaynak]}
        </p>
        <p>
          <span className="text-ink-400">Telefon:</span> {lead.telefon || '—'}
        </p>
        <p>
          <span className="text-ink-400">E-posta:</span> {lead.email || '—'}
        </p>
        <p>
          <span className="text-ink-400">Atanan:</span> {atananAd}
        </p>
        {(lead.kampanyaKodu || lead.reklamAdi) && (
          <p>
            <span className="text-ink-400">Kampanya:</span> {[lead.kampanyaKodu, lead.reklamAdi].filter(Boolean).join(' — ')}
          </p>
        )}
        {lead.aciklama && (
          <p>
            <span className="text-ink-400">Açıklama:</span> {lead.aciklama}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
          Kapat
        </button>
        {convertedTarget && (
          <button
            type="button"
            onClick={onViewTarget}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {convertedTarget.type === 'opportunity' ? 'Fırsatlarda Görüntüle' : 'Recruiting\'de Görüntüle'} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// Hem "+ Yeni Lead" (lead=null) hem satır tıklaması (lead=mevcut kayıt)
// AYNI paneli açar (bkz. brief 3.5) — tüm alanlar her zaman düzenlenebilir,
// TEK istisna: lead zaten dönüştürüldüyse (bkz. ConvertedView).
export default function LeadDetailModal({
  lead,
  danismanOptions,
  convertedTarget,
  onClose,
  onSubmit,
  onConvertToOpportunity,
  onConvertToRecruiting,
  onViewTarget,
  submitting,
}) {
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
    kampanyaKodu: lead?.kampanyaKodu ?? '',
    reklamAdi: lead?.reklamAdi ?? '',
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
      kampanyaKodu: form.kampanyaKodu || '',
      reklamAdi: form.reklamAdi.trim(),
      ...autoFields,
    })
  }

  const isConverted = lead?.durum === 'donusturuldu'

  return (
    <Modal title={lead ? 'Lead Detayı' : 'Yeni Lead'} onClose={onClose}>
      {isConverted ? (
        <ConvertedView lead={lead} danismanOptions={danismanOptions} convertedTarget={convertedTarget} onClose={onClose} onViewTarget={onViewTarget} />
      ) : (
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

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.kampanyaKodu}
              onChange={(e) => set({ kampanyaKodu: e.target.value })}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
            >
              <option value="">Kampanya kodu yok</option>
              {LEAD_KAMPANYA_KODLARI.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              value={form.reklamAdi}
              onChange={(e) => set({ reklamAdi: e.target.value })}
              placeholder="Reklam adı"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
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

          {/* Dönüştürme aksiyonları — SADECE mevcut bir lead düzenlenirken
              (yeni lead oluştururken değil). Kiralık için buton yok, bkz.
              lib/leads.js LEAD_TIPLERI notu / kiralık teknik borcu. */}
          {lead && (form.tip === 'satici' || form.tip === 'alici' || form.tip === 'recruiting') && (
            <div className="rounded-lg bg-ink-50 p-3">
              <button
                type="button"
                onClick={() => (form.tip === 'recruiting' ? onConvertToRecruiting(lead) : onConvertToOpportunity(lead))}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
              >
                {form.tip === 'recruiting' ? "Recruiting'e Dönüştür" : 'Fırsata Dönüştür'} <ArrowRight size={14} />
              </button>
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
      )}
    </Modal>
  )
}
