import { useState } from 'react'
import Modal from '../common/Modal'
import { BLOKE_AKSIYON_LABELS, kalanTutar } from '../../lib/bankaHareketleri'
import { formatDateOnly } from '../../lib/format'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

// Bağlanma parası tapu günü çözümlenir — 4 senaryo (broker: "ya geri
// gönderiyoruz, ya satıcıya gönderiyoruz, ya hizmet bedeline mahsup
// ediyoruz, ya mahsup edip kalanı gönderiyoruz"). Mahsup eden senaryolarda
// o fırsata ait "ödeme bekliyor" katılımcı seçilir — Ciro Raporu'ndaki
// mevcut eşleştirme akışıyla AYNI mekanizma (bkz. bankaHareketleri.js
// blokeyiCozumle).
export default function BlokeCozumleModal({ bloke, adaylar, userName, onClose, onSubmit, submitting }) {
  const [aksiyon, setAksiyon] = useState('mahsup_et')
  const [katilimciId, setKatilimciId] = useState(adaylar[0]?.katilimciId ?? '')
  const [mahsupTutari, setMahsupTutari] = useState('')
  const [aliciAdi, setAliciAdi] = useState('')

  const mahsupVar = aksiyon === 'mahsup_et' || aksiyon === 'kismi_mahsup'
  const kalan = aksiyon === 'kismi_mahsup' ? kalanTutar(bloke.tutar, mahsupTutari) : 0

  const canSubmit =
    (!mahsupVar || katilimciId) && (aksiyon !== 'kismi_mahsup' || (mahsupTutari && Number(mahsupTutari) > 0 && Number(mahsupTutari) < bloke.tutar))

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(aksiyon, { katilimciId: mahsupVar ? katilimciId : null, mahsupTutari: aksiyon === 'kismi_mahsup' ? Number(mahsupTutari) : null, aliciAdi: aliciAdi.trim() })
  }

  return (
    <Modal title="Bağlanma Parasını Çözümle" onClose={onClose} maxWidth="max-w-lg">
      <p className="mb-4 text-sm text-text-muted">
        {tl(bloke.tutar)} · {formatDateOnly(bloke.tarih)} · {bloke.gonderenAdi || 'Gönderen belirtilmemiş'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          {Object.entries(BLOKE_AKSIYON_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-border-default p-2.5 text-sm has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50">
              <input type="radio" name="aksiyon" value={key} checked={aksiyon === key} onChange={() => setAksiyon(key)} />
              {label}
            </label>
          ))}
        </div>

        {mahsupVar && (
          <div>
            <label className="mb-1 block text-xs text-text-muted">Hangi danışmanın hizmet bedeline mahsup edilsin</label>
            {adaylar.length === 0 ? (
              <p className="text-xs text-amber-700">Bu fırsata ait ödeme bekleyen bir Ciro Raporu kaydı yok.</p>
            ) : (
              <select
                value={katilimciId}
                onChange={(e) => setKatilimciId(e.target.value)}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              >
                {adaylar.map((a) => (
                  <option key={a.katilimciId} value={a.katilimciId}>
                    {userName(a.danismanId)} — {tl(a.tutar)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {aksiyon === 'kismi_mahsup' && (
          <div>
            <label className="mb-1 block text-xs text-text-muted">Mahsup edilecek tutar (kalanı otomatik gönderilecek)</label>
            <input
              required
              inputMode="numeric"
              value={mahsupTutari}
              onChange={(e) => setMahsupTutari(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Mahsup tutarı (₺)"
              className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            <p className="mt-1 text-xs text-text-muted">Kalan gönderilecek: {tl(kalan)}</p>
          </div>
        )}

        {(aksiyon === 'geri_gonder' || aksiyon === 'saticiya_gonder' || aksiyon === 'kismi_mahsup') && (
          <input
            value={aliciAdi}
            onChange={(e) => setAliciAdi(e.target.value)}
            placeholder={aksiyon === 'saticiya_gonder' ? 'Satıcı adı (opsiyonel)' : 'Alıcı adı (opsiyonel)'}
            className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : 'Çözümle'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
