import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import { formatThousands, parseThousands } from '../../lib/format'
import {
  ISLEM_TIPI_LABELS,
  PORTFOY_TIPI_LABELS,
  guncelAnlasmaOrani,
  guncelRtPayOrani,
  komisyonTutariOnerisi,
  toplamHizmetBedeli,
  gdCirosu,
  rtPayiOnerisi,
} from '../../lib/ciroRaporlari'

const today = () => new Date().toISOString().slice(0, 10)

// Danışman kendi kapattığı bir işlem için ciro raporu oluşturur — rapor
// "taslak" durumunda kalır, onaya gönderme ayrı bir adım (fatura no
// girilmesi şart, bkz. CiroRaporlariPanel.jsx handleCreate/
// handleSubmitTaslak — 2026-10-09 broker kararı: "fatura kestikten
// sonra asıl o zaman onaya göndermiş olmalı").
// Ortak çalışma seçiliyse pay oranı ikiye bölünür, toplam 100'den
// sapıyorsa gönder düğmesi kapanır (DB'deki deferred trigger'la aynı kural,
// bkz. lib/ciroRaporlari.js toplamPayOrani).
//
// Satıcı/Alıcı hizmet bedeli bölümleri RE/MAX Türkiye'nin resmi ciro
// ekranındaki gibi checkbox'la açılıyor (2026-10-09 broker kararı: "sadece
// bir tık koyalım") — toplamı GD Cirosu'nun (RT Payı/Ofis Payı hesabının)
// tabanı, satış tutarından (Lig'e giden ayrı metrik) bağımsız.
export default function CiroRaporuFormModal({ onClose, onSubmit, submitting, opportunities, danismanOptions, anlasmalar, user }) {
  const [form, setForm] = useState({
    opportunityId: '',
    islemTipi: 'satis',
    islemTutari: '',
    islemTarihi: today(),
    notlar: '',
  })
  const [portfoyTipi, setPortfoyTipi] = useState('portfoyum')
  const [disBeyanKodu, setDisBeyanKodu] = useState('')
  const [saticiVar, setSaticiVar] = useState(false)
  const [satici, setSatici] = useState({ adSoyad: '', telefon: '', kimlikNo: '', hizmetBedeli: '' })
  const [aliciVar, setAliciVar] = useState(false)
  const [alici, setAlici] = useState({ adSoyad: '', telefon: '', kimlikNo: '', hizmetBedeli: '' })
  const [ortakVar, setOrtakVar] = useState(false)
  const [partnerId, setPartnerId] = useState('')
  const [payOraniSelf, setPayOraniSelf] = useState('50')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const parsedTutar = parseThousands(form.islemTutari)
  const payOraniPartner = ortakVar ? Math.max(0, 100 - Number(payOraniSelf || 0)) : 0
  const toplamPay = ortakVar ? Number(payOraniSelf || 0) + payOraniPartner : 100

  const saticiHizmetBedeliParsed = parseThousands(satici.hizmetBedeli)
  const aliciHizmetBedeliParsed = parseThousands(alici.hizmetBedeli)

  const toplamHizmetBedeliDeger = useMemo(
    () =>
      toplamHizmetBedeli({
        saticiHizmetBedeli: saticiVar ? saticiHizmetBedeliParsed : 0,
        aliciHizmetBedeli: aliciVar ? aliciHizmetBedeliParsed : 0,
      }),
    [saticiVar, saticiHizmetBedeliParsed, aliciVar, aliciHizmetBedeliParsed],
  )

  const anlasmaSelf = useMemo(
    () => guncelAnlasmaOrani(anlasmalar, user.id, form.islemTarihi),
    [anlasmalar, user.id, form.islemTarihi],
  )
  const anlasmaPartner = useMemo(
    () => (partnerId ? guncelAnlasmaOrani(anlasmalar, partnerId, form.islemTarihi) : null),
    [anlasmalar, partnerId, form.islemTarihi],
  )
  const rtOranSelf = useMemo(
    () => guncelRtPayOrani(anlasmalar, user.id, form.islemTarihi),
    [anlasmalar, user.id, form.islemTarihi],
  )
  const rtOranPartner = useMemo(
    () => (partnerId ? guncelRtPayOrani(anlasmalar, partnerId, form.islemTarihi) : null),
    [anlasmalar, partnerId, form.islemTarihi],
  )

  const canSubmit =
    (portfoyTipi === 'portfoyum' ? !!form.opportunityId : disBeyanKodu.trim().length > 0) &&
    parsedTutar !== null &&
    parsedTutar > 0 &&
    form.islemTarihi &&
    (!saticiVar || (saticiHizmetBedeliParsed !== null && saticiHizmetBedeliParsed > 0)) &&
    (!aliciVar || (aliciHizmetBedeliParsed !== null && aliciHizmetBedeliParsed > 0)) &&
    (!ortakVar || (partnerId && toplamPay > 0 && toplamPay <= 100))

  function katilimciSatiri(danismanId, payOrani, anlasmaOrani, rtOrani) {
    const gdCirosuDeger = gdCirosu(toplamHizmetBedeliDeger, payOrani)
    return {
      danismanId,
      payOrani,
      anlasmaOraniSnapshot: anlasmaOrani,
      komisyonTutariOnerisi: komisyonTutariOnerisi(toplamHizmetBedeliDeger, payOrani, anlasmaOrani),
      gdCirosu: gdCirosuDeger,
      rtPayOraniSnapshot: rtOrani,
      rtPayiTutari: rtPayiOnerisi(gdCirosuDeger, rtOrani),
      ofisPayiTutari: null,
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const katilimcilar = ortakVar
      ? [
          katilimciSatiri(user.id, Number(payOraniSelf), anlasmaSelf, rtOranSelf),
          katilimciSatiri(partnerId, payOraniPartner, anlasmaPartner, rtOranPartner),
        ]
      : [katilimciSatiri(user.id, 100, anlasmaSelf, rtOranSelf)]
    onSubmit({
      opportunityId: portfoyTipi === 'portfoyum' ? form.opportunityId : null,
      islemTipi: form.islemTipi,
      islemTutari: parsedTutar,
      islemTarihi: form.islemTarihi,
      notlar: form.notlar.trim() || null,
      portfoyTipi,
      disBeyanKodu: disBeyanKodu.trim() || null,
      saticiHizmetBedeliAlindi: saticiVar,
      saticiAdSoyad: satici.adSoyad.trim(),
      saticiTelefon: satici.telefon.trim(),
      saticiKimlikNo: satici.kimlikNo.trim(),
      saticiHizmetBedeli: saticiHizmetBedeliParsed,
      aliciHizmetBedeliAlindi: aliciVar,
      aliciAdSoyad: alici.adSoyad.trim(),
      aliciTelefon: alici.telefon.trim(),
      aliciKimlikNo: alici.kimlikNo.trim(),
      aliciHizmetBedeli: aliciHizmetBedeliParsed,
      katilimcilar,
    })
  }

  return (
    <Modal title="Yeni Ciro Raporu" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          {Object.entries(PORTFOY_TIPI_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPortfoyTipi(key)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                portfoyTipi === key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">Hangi işlem için</label>
          {portfoyTipi === 'portfoyum' ? (
            <>
              <select
                required
                value={form.opportunityId}
                onChange={(e) => set({ opportunityId: e.target.value })}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
              >
                <option value="">Portföy seç</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ozet || o.konum}
                  </option>
                ))}
              </select>
              {opportunities.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  "Kapandı" durumunda, henüz raporu olmayan bir işlemin yok. Fırsatı önce Fırsatlar sayfasında kapat.
                </p>
              )}
              <input
                value={disBeyanKodu}
                onChange={(e) => setDisBeyanKodu(e.target.value)}
                placeholder="Kod (opsiyonel)"
                className="mt-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
              />
            </>
          ) : (
            <input
              required
              value={disBeyanKodu}
              onChange={(e) => setDisBeyanKodu(e.target.value)}
              placeholder="Dış Beyan Kodu"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          )}
        </div>

        <div className="flex gap-2">
          {Object.entries(ISLEM_TIPI_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ islemTipi: key })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                form.islemTipi === key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          required
          inputMode="numeric"
          value={form.islemTutari}
          onChange={(e) => set({ islemTutari: formatThousands(e.target.value) })}
          placeholder="İşlem tutarı (₺)"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div>
          <label className="mb-1 block text-xs text-ink-500">
            İşlem tarihi (sözleşme/devir tarihi — raporu ne zaman doldurduğun değil)
          </label>
          <input
            required
            type="date"
            value={form.islemTarihi}
            onChange={(e) => set({ islemTarihi: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
        </div>

        <div className="rounded-lg bg-ink-50 p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input type="checkbox" checked={saticiVar} onChange={(e) => setSaticiVar(e.target.checked)} />
            Satıcıdan hizmet bedeli aldım
          </label>
          {saticiVar && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={satici.adSoyad}
                onChange={(e) => setSatici((s) => ({ ...s, adSoyad: e.target.value }))}
                placeholder="Ad Soyad"
                className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                value={satici.telefon}
                onChange={(e) => setSatici((s) => ({ ...s, telefon: e.target.value }))}
                placeholder="Telefon"
                className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                value={satici.kimlikNo}
                onChange={(e) => setSatici((s) => ({ ...s, kimlikNo: e.target.value }))}
                placeholder="TC veya Vergi No"
                className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                required={saticiVar}
                inputMode="numeric"
                value={satici.hizmetBedeli}
                onChange={(e) => setSatici((s) => ({ ...s, hizmetBedeli: formatThousands(e.target.value) }))}
                placeholder="Hizmet Bedeli (KDV Dahil)"
                className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-ink-50 p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input type="checkbox" checked={aliciVar} onChange={(e) => setAliciVar(e.target.checked)} />
            Alıcıdan/Kiracıdan hizmet bedeli aldım
          </label>
          {aliciVar && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={alici.adSoyad}
                onChange={(e) => setAlici((s) => ({ ...s, adSoyad: e.target.value }))}
                placeholder="Ad Soyad"
                className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                value={alici.telefon}
                onChange={(e) => setAlici((s) => ({ ...s, telefon: e.target.value }))}
                placeholder="Telefon"
                className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                value={alici.kimlikNo}
                onChange={(e) => setAlici((s) => ({ ...s, kimlikNo: e.target.value }))}
                placeholder="TC veya Vergi No"
                className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                required={aliciVar}
                inputMode="numeric"
                value={alici.hizmetBedeli}
                onChange={(e) => setAlici((s) => ({ ...s, hizmetBedeli: formatThousands(e.target.value) }))}
                placeholder="Hizmet Bedeli (KDV Dahil)"
                className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-ink-50 p-3">
          <label className="flex items-center gap-2 text-xs text-ink-700">
            <input type="checkbox" checked={ortakVar} onChange={(e) => setOrtakVar(e.target.checked)} />
            Bu işlemde ortak çalıştığım bir danışman var
          </label>
          {ortakVar && (
            <div className="mt-2 space-y-2">
              <select
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800"
              >
                <option value="">Ortak danışman seç</option>
                {danismanOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 text-xs text-ink-600">
                <span>Benim payım</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={payOraniSelf}
                  onChange={(e) => setPayOraniSelf(e.target.value)}
                  className="w-20 rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs text-ink-800"
                />
                <span>% — ortağımın payı otomatik %{payOraniPartner}</span>
              </div>
              {toplamPay > 100 && <p className="text-xs text-red-600">Toplam pay %100'ü geçemez.</p>}
            </div>
          )}
        </div>

        <textarea
          value={form.notlar}
          onChange={(e) => set({ notlar: e.target.value })}
          placeholder="Not (opsiyonel)"
          rows={2}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Taslak Olarak Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
