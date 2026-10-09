import { useState } from 'react'
import Modal from '../common/Modal'
import { ROLES, ROLE_LABELS } from '../../lib/roles'
import { capitalizeWords } from '../../lib/format'
import { generateSecurePassword } from '../../lib/password'
import { formatPhoneInput } from '../../lib/phone'
import { DANISMAN_TIER_LABELS, DANISMAN_TIER_RATES } from '../../lib/danismanTier'

const ASSIGNABLE_ROLES = [ROLES.DANISMAN, ROLES.OFIS, ROLES.OWNER, ROLES.BROKER]
const TC_NO_PATTERN = /^\d{11}$/

// initialValues: Recruiting'de "Danışman Olarak Ekle" ile açıldığında
// aday bilgilerini (ad/telefon/email) ön-doldurur (bkz. Recruiting.jsx
// handleConvertToDanisman) — RecruitingDetailModal ile AYNI desen.
export default function CreateUserModal({ onClose, onSubmit, submitting, initialValues, canSetMentorPrimi, canSetAnlasma }) {
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
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tcNoValid = form.tcNo.trim().length === 0 || TC_NO_PATTERN.test(form.tcNo.trim())
  const showAnlasmaField = canSetAnlasma && form.rol === ROLES.DANISMAN
  const canSubmit =
    form.ad.trim() && form.email.trim() && form.password.length >= 8 && tcNoValid && (!showAnlasmaField || !!form.tier)

  return (
    <Modal title="Kullanıcı Ekle" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, ad: capitalizeWords(form.ad.trim()), tcNo: form.tcNo.trim() })
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
