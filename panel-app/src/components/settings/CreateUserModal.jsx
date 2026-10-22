import { useState } from 'react'
import Modal from '../common/Modal'
import { ROLES, ROLE_LABELS } from '../../lib/roles'
import { capitalizeWords } from '../../lib/format'
import { generateSecurePassword } from '../../lib/password'
import { formatPhoneInput } from '../../lib/phone'
import { DANISMAN_TIER_LABELS, DANISMAN_TIER_RATES } from '../../lib/danismanTier'
import { RECRUITING_KAYNAKLARI, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

const ASSIGNABLE_ROLES = [ROLES.DANISMAN, ROLES.OFIS, ROLES.OWNER, ROLES.BROKER]
const TC_NO_PATTERN = /^\d{11}$/

// initialValues: Recruiting'de "Danışman Olarak Ekle" ile açıldığında
// aday bilgilerini (ad/telefon/email) ön-doldurur (bkz. Recruiting.jsx
// handleConvertToDanisman) — RecruitingDetailModal ile AYNI desen.
//
// kaynakBelli: Recruiting dönüşümünde kaynak zaten biliniyor (aday hangi
// kanaldan geldiyse, bkz. candidateKaynakOzeti) — bu modal o yüzden kaynak
// SORMUYOR, Recruiting.jsx kendi onSubmit'inde ekliyor. Doğrudan "Kullanıcı
// Ekle" ile (kaynakBelli=false) eklenirken danışman kaynağı hiç
// bilinmiyordu (broker: "Ayla ... direk kaydetmiş, hangi kaynaktan
// geldiği bilinmiyor", 2026-10-22) — bu yüzden o yolda zorunlu.
//
// okul/meslek/deneyimYili: broker kararı (2026-10-22), "ölçümleyebileceği-
// miz şeyler" — SADECE danışman rolünde zorunlu, yoldan (direkt/Recruiting)
// bağımsız, her iki yolda da sorulur.
export default function CreateUserModal({
  onClose,
  onSubmit,
  submitting,
  initialValues,
  canSetMentorPrimi,
  canSetAnlasma,
  kaynakBelli,
}) {
  const [form, setForm] = useState({
    ad: initialValues?.ad ?? '',
    email: initialValues?.email ?? '',
    telefon: initialValues?.telefon ?? '',
    password: generateSecurePassword(),
    rol: ROLES.DANISMAN,
    dogumTarihi: '',
    tcNo: '',
    mentorBaslangicTarihi: '',
    tier: '',
    kaynak: '',
    okul: '',
    meslek: '',
    deneyimYili: '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tcNoValid = form.tcNo.trim().length === 0 || TC_NO_PATTERN.test(form.tcNo.trim())
  const showAnlasmaField = canSetAnlasma && form.rol === ROLES.DANISMAN
  const isDanisman = form.rol === ROLES.DANISMAN
  const showKaynakField = isDanisman && !kaynakBelli
  const canSubmit =
    form.ad.trim() &&
    form.email.trim() &&
    form.password.length >= 8 &&
    tcNoValid &&
    (!showAnlasmaField || !!form.tier) &&
    (!showKaynakField || !!form.kaynak) &&
    (!isDanisman || (form.okul.trim() && form.meslek.trim() && form.deneyimYili !== ''))

  return (
    <Modal title="Kullanıcı Ekle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            ...form,
            ad: capitalizeWords(form.ad.trim()),
            tcNo: form.tcNo.trim(),
            okul: form.okul.trim(),
            meslek: form.meslek.trim(),
            deneyimYili: form.deneyimYili === '' ? null : Number(form.deneyimYili),
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
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="E-posta"
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <input
            type="tel"
            value={form.telefon}
            onChange={(e) => set({ telefon: formatPhoneInput(e.target.value) })}
            placeholder="Telefon (opsiyonel)"
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>
        <div className="flex gap-2">
          <div className="w-full">
            <label className="mb-1 block text-xs text-text-secondary">Doğum tarihi (opsiyonel)</label>
            <input
              type="date"
              value={form.dogumTarihi}
              onChange={(e) => set({ dogumTarihi: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div className="w-full">
            <label className="mb-1 block text-xs text-text-secondary">TC Kimlik No (opsiyonel)</label>
            <input
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
        <select
          value={form.rol}
          onChange={(e) => set({ rol: e.target.value })}
          className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        {showKaynakField && (
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
            </select>
          </div>
        )}

        {isDanisman && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Son mezun olduğu okul</label>
              <input
                required
                value={form.okul}
                onChange={(e) => set({ okul: e.target.value })}
                placeholder="Örn. Marmara Üniversitesi"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Mesleği</label>
              <input
                required
                value={form.meslek}
                onChange={(e) => set({ meslek: e.target.value })}
                placeholder="Önceki/mevcut meslek"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-text-secondary">Çalışma hayatı (yıl)</label>
              <input
                required
                type="number"
                min="0"
                max="60"
                value={form.deneyimYili}
                onChange={(e) => set({ deneyimYili: e.target.value })}
                placeholder="Örn. 5"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>
        )}

        {/* Mentor Primi başlangıç tarihi — SADECE broker görüyor (bkz.
            canSetMentorPrimi, Ayarlar.jsx canViewMentorPrimi) ve SADECE
            danışman rolünde anlamlı. Broker "bence bunu danışman
            kaydettiğimiz yere alalım" dedi (2026-10-08) — eskiden Mentor
            Primi sekmesinde satır içi, onChange'de anında kaydeden bir
            tarih kutusuydu; kısmi/eksik bir tarih girişinde bile ağa istek
            atıyordu. Artık diğer alanlar gibi SADECE "Oluştur"a basınca
            kaydediliyor. */}
        {canSetMentorPrimi && form.rol === ROLES.DANISMAN && (
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              Mentorluk Başlangıç Tarihi (opsiyonel) <span className="text-text-muted">— sadece sen görürsün</span>
            </label>
            <input
              type="date"
              value={form.mentorBaslangicTarihi}
              onChange={(e) => set({ mentorBaslangicTarihi: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
          </div>
        )}

        {/* Paylaşım oranı (Rap/Max) — Ciro Raporu fatura hesabının tabanı,
            danışman eklenirken zorunlu (2026-10-09 broker kararı — bkz.
            lib/danismanTier.js). Ayrı bir "Danışman Anlaşmaları" menüsü
            YOK artık, oran kullanıcı kaydının kendi içinde tutuluyor. */}
        {showAnlasmaField && (
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Paylaşım Oranı</label>
            <div className="flex gap-2">
              {Object.entries(DANISMAN_TIER_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set({ tier: key })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    form.tier === key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-border-default text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.tier && (
              <p className="mt-1.5 text-xs text-text-muted">
                Çalışan Payı: %{DANISMAN_TIER_RATES[form.tier].paylasimOrani} · RT Payı: %{DANISMAN_TIER_RATES[form.tier].rtPayOrani}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-text-secondary">Geçici şifre (kullanıcıya sen ileteceksin)</label>
          <div className="flex gap-2">
            <input
              required
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => set({ password: generateSecurePassword() })}
              className="shrink-0 rounded-lg bg-surface-sunken px-3 py-2 text-xs font-medium text-text-secondary hover:bg-border-subtle"
            >
              Yeniden Üret
            </button>
          </div>
        </div>

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
            {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
