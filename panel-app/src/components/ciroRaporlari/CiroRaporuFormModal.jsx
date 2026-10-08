import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import { formatThousands, parseThousands } from '../../lib/format'
import { ISLEM_TIPI_LABELS, guncelAnlasmaOrani, komisyonTutariOnerisi } from '../../lib/ciroRaporlari'

const today = () => new Date().toISOString().slice(0, 10)

// Danışman kendi kapattığı bir işlem için ciro raporu oluşturup direkt
// onaya gönderir — "taslak" durumu kullanıcıya hiç gösterilmiyor (create +
// submit burada tek adımda, bkz. pages/CiroRaporlari.jsx handleCreate).
// Ortak çalışma seçiliyse pay oranı ikiye bölünür, toplam 100'den
// sapıyorsa gönder düğmesi kapanır (DB'deki deferred trigger'la aynı kural,
// bkz. lib/ciroRaporlari.js toplamPayOrani).
export default function CiroRaporuFormModal({ onClose, onSubmit, submitting, opportunities, danismanOptions, anlasmalar, user }) {
  const [form, setForm] = useState({
    opportunityId: '',
    islemTipi: 'satis',
    islemTutari: '',
    islemTarihi: today(),
    notlar: '',
  })
  const [ortakVar, setOrtakVar] = useState(false)
  const [partnerId, setPartnerId] = useState('')
  const [payOraniSelf, setPayOraniSelf] = useState('50')
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const parsedTutar = parseThousands(form.islemTutari)
  const payOraniPartner = ortakVar ? Math.max(0, 100 - Number(payOraniSelf || 0)) : 0
  const toplamPay = ortakVar ? Number(payOraniSelf || 0) + payOraniPartner : 100

  const anlasmaSelf = useMemo(
    () => guncelAnlasmaOrani(anlasmalar, user.id, form.islemTarihi),
    [anlasmalar, user.id, form.islemTarihi],
  )
  const anlasmaPartner = useMemo(
    () => (partnerId ? guncelAnlasmaOrani(anlasmalar, partnerId, form.islemTarihi) : null),
    [anlasmalar, partnerId, form.islemTarihi],
  )

  const canSubmit =
    form.opportunityId &&
    parsedTutar !== null &&
    parsedTutar > 0 &&
    form.islemTarihi &&
    (!ortakVar || (partnerId && toplamPay > 0 && toplamPay <= 100))

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const katilimcilar = ortakVar
      ? [
          {
            danismanId: user.id,
            payOrani: Number(payOraniSelf),
            anlasmaOraniSnapshot: anlasmaSelf,
            komisyonTutariOnerisi: komisyonTutariOnerisi(parsedTutar, Number(payOraniSelf), anlasmaSelf),
          },
          {
            danismanId: partnerId,
            payOrani: payOraniPartner,
            anlasmaOraniSnapshot: anlasmaPartner,
            komisyonTutariOnerisi: komisyonTutariOnerisi(parsedTutar, payOraniPartner, anlasmaPartner),
          },
        ]
      : [
          {
            danismanId: user.id,
            payOrani: 100,
            anlasmaOraniSnapshot: anlasmaSelf,
            komisyonTutariOnerisi: komisyonTutariOnerisi(parsedTutar, 100, anlasmaSelf),
          },
        ]
    onSubmit({
      opportunityId: form.opportunityId,
      islemTipi: form.islemTipi,
      islemTutari: parsedTutar,
      islemTarihi: form.islemTarihi,
      notlar: form.notlar.trim() || null,
      katilimcilar,
    })
  }

  return (
    <Modal title="Yeni Ciro Raporu" onClose={onClose} dismissible={false}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Hangi işlem için</label>
          <select
            required
            value={form.opportunityId}
            onChange={(e) => set({ opportunityId: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          >
            <option value="">Fırsat seç</option>
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
            {submitting ? 'Gönderiliyor...' : 'Onaya Gönder'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
