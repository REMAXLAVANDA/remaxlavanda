import { useState } from 'react'
import { formatDateOnly } from '../../lib/format'
import { faturaTutarsizMi } from '../../lib/ciroRaporlari'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

// Fatura alanları SADECE o katılımcının kendisi tarafından düzenlenir
// (co-listing'de her danışman kendi vergi no'suyla ayrı fatura keser —
// bkz. migration 20261008120000, ciro_raporu_katilimcilari_update RLS'i).
// odemeDurumu farklı: ofise paranın gelip gelmediğini broker/owner işaretler,
// danışman değil — bu yüzden onToggleOdeme sadece canToggleOdeme true'yken verilir.
//
// GD Cirosu / Çalışan Payı (fatura tutarı) / RT Payı / Ofis Payı üçlemesi
// 2026-10-09'da eklendi (RE/MAX Türkiye'nin resmi ciro ekranı referans
// alındı) — Ofis Payı HER ZAMAN kalan, elle girilmez (bkz.
// lib/ciroRaporlari.js ofisPayiTutari, dataProvider'daki senkron).
export default function CiroRaporuKatilimciRow({ k, userName, isOwnRow, canToggleOdeme, onSaveFatura, onToggleOdeme, submitting }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    faturaNo: k.faturaNo ?? '',
    faturaTarihi: k.faturaTarihi ?? '',
    faturaTutari: k.faturaTutari ?? '',
    kdvOrani: k.kdvOrani ?? '',
    vergiNo: k.vergiNo ?? '',
    faturaDosyaUrl: k.faturaDosyaUrl ?? '',
    rtPayiTutari: k.rtPayiTutari ?? '',
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const tutarsiz = faturaTutarsizMi(k.faturaTutari, k.komisyonTutariOnerisi)

  return (
    <div className="rounded-lg border border-border-subtle p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-text-primary">
          <span className="font-medium">{userName(k.danismanId)}</span>
          <span className="text-text-muted"> — pay %{k.payOrani}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-text-muted">
            Önerilen fatura: {tl(k.komisyonTutariOnerisi)}
          </span>
          {canToggleOdeme && (
            <button
              onClick={() => onToggleOdeme(k.id, k.odemeDurumu === 'alindi' ? 'bekliyor' : 'alindi')}
              className={`rounded-full px-2 py-0.5 font-medium ${
                k.odemeDurumu === 'alindi' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {k.odemeDurumu === 'alindi' ? 'Ödeme alındı' : 'Ödeme bekliyor'}
            </button>
          )}
        </div>
      </div>

      {k.gdCirosu != null && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
          <span>GD Cirosu: <span className="font-medium text-text-primary">{tl(k.gdCirosu)}</span></span>
          <span>Çalışan Payı: {tl(k.faturaTutari ?? k.komisyonTutariOnerisi)}</span>
          <span>RT Payı: {tl(k.rtPayiTutari)}</span>
          <span>Ofis Payı: {tl(k.ofisPayiTutari)}</span>
        </div>
      )}

      {tutarsiz && (
        <p className="mt-2 text-xs font-medium text-red-600">
          Girilen fatura tutarı ({tl(k.faturaTutari)}) önerilenden farklı — onaylamadan önce kontrol et.
        </p>
      )}

      {!editing && (k.faturaNo || k.faturaTutari) && (
        <div className="mt-2 text-xs text-text-muted">
          Fatura {k.faturaNo || '—'} · {k.faturaTarihi ? formatDateOnly(k.faturaTarihi) : '—'} · {tl(k.faturaTutari)}
          {k.kdvOrani != null && ` · KDV %${k.kdvOrani}`}
        </div>
      )}

      {isOwnRow && !editing && (
        <button onClick={() => setEditing(true)} className="mt-2 text-xs font-medium text-brand-700 hover:underline">
          {k.faturaNo || k.faturaTutari ? 'Fatura bilgisini düzenle' : 'Fatura bilgisi ekle'}
        </button>
      )}

      {isOwnRow && editing && (
        <div className="mt-3 space-y-2 rounded-lg bg-surface-sunken p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.faturaNo}
              onChange={(e) => set({ faturaNo: e.target.value })}
              placeholder="Fatura no"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              type="date"
              value={form.faturaTarihi}
              onChange={(e) => set({ faturaTarihi: e.target.value })}
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              inputMode="numeric"
              value={form.faturaTutari}
              onChange={(e) => set({ faturaTutari: e.target.value })}
              placeholder="Fatura tutarı (₺) — Çalışan Payı"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              inputMode="numeric"
              value={form.rtPayiTutari}
              onChange={(e) => set({ rtPayiTutari: e.target.value })}
              placeholder="RT Payı (₺)"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              inputMode="numeric"
              value={form.kdvOrani}
              onChange={(e) => set({ kdvOrani: e.target.value })}
              placeholder="KDV oranı (%)"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              value={form.vergiNo}
              onChange={(e) => set({ vergiNo: e.target.value })}
              placeholder="Vergi no"
              className="rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
            <input
              value={form.faturaDosyaUrl}
              onChange={(e) => set({ faturaDosyaUrl: e.target.value })}
              placeholder="Fatura dosyası linki (opsiyonel)"
              className="col-span-2 rounded-lg border border-border-default px-2 py-1.5 text-xs text-text-primary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-border-subtle"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                await onSaveFatura(k.id, form)
                setEditing(false)
              }}
              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
