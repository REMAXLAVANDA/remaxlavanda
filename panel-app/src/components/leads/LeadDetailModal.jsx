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
// 'atandı' der ama bağlı kayıt olmaz" gerekçesi). Hedefi bulmak için ayrı
// bir kolon YOK — Leads.jsx zaten opportunities/recruiting_candidates
// listelerini yükleyip kaynak_lead_id eşleşmesiyle bu prop'u hesaplıyor.
// Atanan danışman burada YOK — o artık hedef modülün (Fırsatlar/
// Recruiting) işi, lead seviyesinde tutulmuyor.
function ConvertedView({ lead, convertedTarget, onClose, onViewTarget }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-700">
        Bu lead yönlendirildi, artık düzenlenemez.
      </div>
      <div className="space-y-1.5 text-sm text-ink-700">
        <p>
          <span className="text-ink-400">Tip:</span> {LEAD_TIP_LABELS[lead.tip]}
        </p>
        <p>
          <span className="text-ink-400">Telefon:</span> {lead.telefon || '—'}
        </p>
        <p>
          <span className="text-ink-400">E-posta:</span> {lead.email || '—'}
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
            {convertedTarget.type === 'call'
              ? "Operasyon'da Görüntüle"
              : convertedTarget.type === 'opportunity'
                ? 'Fırsatlarda Görüntüle'
                : "Recruiting'de Görüntüle"}{' '}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// Satır tıklaması bu paneli açar (elle yeni lead ekleme YOK — lead'ler
// sadece Meta webhook'undan gelir, bkz. AI_NOTLARI.md). Tüm alanlar her
// zaman düzenlenebilir, TEK istisna: lead zaten atandıysa (bkz.
// ConvertedView). Atanan danışman BİLEREK burada YOK — Lead Havuzu
// dağıtım noktası, atama hedef modülde yapılır (bkz. AI_NOTLARI.md
// radikal sadeleştirme notu).
export default function LeadDetailModal({
  lead,
  convertedTarget,
  onClose,
  onSubmit,
  onConvertToOpportunity,
  onConvertToRecruiting,
  onViewTarget,
  submitting,
}) {
  const [form, setForm] = useState({
    tip: lead.tip,
    kaynak: lead.kaynak,
    adSoyad: lead.adSoyad,
    telefon: lead.telefon ?? '',
    email: lead.email ?? '',
    durum: lead.durum,
    aciklama: lead.aciklama ?? '',
    kampanyaKodu: lead.kampanyaKodu ?? '',
    reklamAdi: lead.reklamAdi ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const canSubmit = form.adSoyad.trim().length > 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const autoFields = computeAutoFields(lead, form.durum)
    onSubmit({
      ...form,
      adSoyad: capitalizeWords(form.adSoyad.trim()),
      telefon: form.telefon ? formatPhoneInput(form.telefon) : '',
      email: form.email.trim(),
      aciklama: capitalizeFirst(form.aciklama.trim()),
      kampanyaKodu: form.kampanyaKodu || '',
      reklamAdi: form.reklamAdi.trim(),
      ...autoFields,
    })
  }

  const isConverted = lead.durum === 'atandi'

  return (
    <Modal title="Lead Detayı" onClose={onClose}>
      {isConverted ? (
        <ConvertedView lead={lead} convertedTarget={convertedTarget} onClose={onClose} onViewTarget={onViewTarget} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={form.adSoyad}
            onChange={(e) => set({ adSoyad: e.target.value })}
            onBlur={(e) => set({ adSoyad: capitalizeWords(e.target.value) })}
            placeholder="Ad Soyad"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

          <input
            type="tel"
            value={form.telefon}
            onChange={(e) => set({ telefon: formatPhoneInput(e.target.value) })}
            placeholder="Telefon"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

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

          <textarea
            value={form.aciklama}
            onChange={(e) => set({ aciklama: e.target.value })}
            placeholder="Açıklama"
            rows={2}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />

          {/* Kaynak Bilgisi — hepsi opsiyonel, dönüşüm/ölçüm için ama
              günlük kullanımda dikkat dağıtmasın diye en altta toplu. */}
          <div className="space-y-2 border-t border-ink-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Kaynak Bilgisi</p>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
            <input
              value={form.reklamAdi}
              onChange={(e) => set({ reklamAdi: e.target.value })}
              placeholder="Reklam adı"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>

          <div className="rounded-lg bg-ink-50 p-3">
            <button
              type="button"
              onClick={() => (form.tip === 'recruiting' ? onConvertToRecruiting(lead) : onConvertToOpportunity(lead))}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
            >
              {form.tip === 'recruiting' ? "Recruiting'e Gönder" : "Operasyon'a Gönder"} <ArrowRight size={14} />
            </button>
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
      )}
    </Modal>
  )
}
