import { useState } from 'react'
import Modal from '../common/Modal'
import { capitalizeWords } from '../../lib/format'
import { DANISMAN_TIER_LABELS, DANISMAN_TIER_RATES } from '../../lib/danismanTier'
import { RECRUITING_KAYNAKLARI, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

const TC_NO_PATTERN = /^\d{11}$/

// Broker kararı (2026-10-22): "opsiyonel cümlesi hala duruyor" — Düzenle
// ekranında da hiçbir alan opsiyonel kalmasın, hepsi zorunlu. Sonucu:
// kaynak/okul/meslek/deneyim eksik olan mevcut danışmanlarda (bkz. 2026-10-22
// listesi) bu alanlar doldurulmadan HİÇBİR değişiklik (ör. telefon düzeltmesi)
// kaydedilemez — bilerek, broker'ın açık isteğiyle.
export default function EditUserModal({
  user,
  privateInfo,
  mentorBaslangicTarihi,
  canSetMentorPrimi,
  canSetAnlasma,
  guncelTier,
  onClose,
  onSubmit,
  submitting,
}) {
  const [form, setForm] = useState({
    ad: user.name,
    dogumTarihi: privateInfo?.dogumTarihi ?? '',
    tcNo: privateInfo?.tcNo ?? '',
    mentorBaslangicTarihi: mentorBaslangicTarihi ?? '',
    kaynak: user.kaynak ?? '',
    okul: privateInfo?.okul ?? '',
    meslek: privateInfo?.meslek ?? '',
    deneyimYili: privateInfo?.deneyimYili ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tcNoValid = TC_NO_PATTERN.test(form.tcNo.trim())
  const showMentorField = canSetMentorPrimi && user.role === 'danisman'
  const showProfileFields = user.role === 'danisman'
  // Paylaşım oranı (Rap/Max) hassas bir finansal ayar — yanlışlıkla
  // değişmesin diye varsayılan KAPALI, broker/owner bilerek tikler (2026-10-09
  // broker: "paylaşım oranını değiştir tiki olmalı"). Tiklenince mevcut
  // tier'dan başlar, değiştirilebilir.
  const showAnlasmaField = canSetAnlasma && user.role === 'danisman'
  const [anlasmaDegistir, setAnlasmaDegistir] = useState(false)
  const [tier, setTier] = useState(guncelTier ?? 'rap')
  const canSubmit =
    form.ad.trim().length > 0 &&
    !!form.dogumTarihi &&
    tcNoValid &&
    (!anlasmaDegistir || !!tier) &&
    (!showProfileFields || (!!form.kaynak && form.okul.trim() && form.meslek.trim() && form.deneyimYili !== '')) &&
    (!showMentorField || !!form.mentorBaslangicTarihi)

  return (
    <Modal title="Kullanıcıyı Düzenle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            ad: capitalizeWords(form.ad.trim()),
            dogumTarihi: form.dogumTarihi,
            tcNo: form.tcNo.trim(),
            mentorBaslangicTarihi: showMentorField ? form.mentorBaslangicTarihi : undefined,
            tier: showAnlasmaField && anlasmaDegistir ? tier : undefined,
            kaynak: showProfileFields ? form.kaynak : undefined,
            okul: showProfileFields ? form.okul.trim() : null,
            meslek: showProfileFields ? form.meslek.trim() : null,
            deneyimYili: showProfileFields ? Number(form.deneyimYili) : null,
          })
        }}
        className="space-y-3"
      >
        <input
          required
          value={form.ad}
          onChange={(e) => set({ ad: e.target.value })}
          onBlur={(e) => set({ ad: capitalizeWords(e.target.value) })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <div className="flex gap-2">
          <div className="w-full">
            <label className="mb-1 block text-xs text-text-secondary">Doğum tarihi</label>
            <input
              required
              type="date"
              value={form.dogumTarihi}
              onChange={(e) => set({ dogumTarihi: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-xs text-text-secondary">TC Kimlik No</label>
            <input
              required
              inputMode="numeric"
              maxLength={11}
              value={form.tcNo}
              onChange={(e) => set({ tcNo: e.target.value.replace(/\D/g, '') })}
              placeholder="11 haneli"
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            {!tcNoValid && <p className="mt-1 text-xs text-red-600">TC Kimlik No 11 haneli olmalı.</p>}
          </div>
        </div>

        {showProfileFields && (
          <>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Nereden geldi?</label>
              <select
                required
                value={form.kaynak}
                onChange={(e) => set({ kaynak: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              >
                <option value="" disabled>
                  Seç...
                </option>
                {RECRUITING_KAYNAKLARI.map((k) => (
                  <option key={k} value={k}>
                    {RECRUITING_KAYNAK_LABELS[k]}
                  </option>
                ))}
                {form.kaynak && !RECRUITING_KAYNAKLARI.includes(form.kaynak) && (
                  <option value={form.kaynak}>{form.kaynak}</option>
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Son mezun olduğu okul</label>
                <input
                  required
                  value={form.okul}
                  onChange={(e) => set({ okul: e.target.value })}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Mesleği</label>
                <input
                  required
                  value={form.meslek}
                  onChange={(e) => set({ meslek: e.target.value })}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-text-secondary">Çalışma hayatı yılı</label>
                <input
                  required
                  type="number"
                  min="0"
                  max="60"
                  value={form.deneyimYili}
                  onChange={(e) => set({ deneyimYili: e.target.value })}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                />
              </div>
            </div>
          </>
        )}

        {/* bkz. CreateUserModal'daki aynı not — Mentor Primi başlangıç
            tarihi artık sadece "Kaydet"e basınca yazılıyor, satır içi
            anında-kaydeden eski kutu kaldırıldı (2026-10-08 broker: "bence
            bunu danışman kaydettiğimiz yere alalım"). */}
        {showMentorField && (
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              Mentorluk Başlangıç Tarihi <span className="text-text-muted">— sadece sen görürsün</span>
            </label>
            <input
              required
              type="date"
              value={form.mentorBaslangicTarihi}
              onChange={(e) => set({ mentorBaslangicTarihi: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
        )}

        {showAnlasmaField && (
          <div className="rounded-lg bg-surface-sunken p-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={anlasmaDegistir} onChange={(e) => setAnlasmaDegistir(e.target.checked)} />
              Paylaşım oranını değiştir
              {guncelTier && <span className="text-text-muted"> — güncel: {DANISMAN_TIER_LABELS[guncelTier]}</span>}
            </label>
            {anlasmaDegistir && (
              <div className="mt-2">
                <div className="flex gap-2">
                  {Object.entries(DANISMAN_TIER_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTier(key)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                        tier === key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-border-default bg-surface-raised text-text-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tier && (
                  <p className="mt-1.5 text-xs text-text-muted">
                    Çalışan Payı: %{DANISMAN_TIER_RATES[tier].paylasimOrani} · RT Payı: %{DANISMAN_TIER_RATES[tier].rtPayOrani}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken"
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
