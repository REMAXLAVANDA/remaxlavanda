// Ayarlar > Webhook Hataları — Santral (Telsam) bölümü. WebhookErrorsTable
// (Meta) ile aynı görsel desen, ayrı dosya çünkü "tur" değerleri ve
// sınıflandırma mantığı farklı (bkz. o dosyanın notu — bilerek ayrı tutuldu).
const KAYNAK_LABELS = {
  webhook: 'Santral webhook (anlık)',
  cdr_sync: 'CDR senkronizasyonu (dakikalık)',
}

function classify(row) {
  const fallback = {
    yetkilendirme_hatasi: { label: 'Yetkilendirme hatası', style: 'bg-red-50 text-red-700' },
    api_hatasi: { label: 'Telsam API hatası', style: 'bg-amber-50 text-amber-700' },
    kayit_hatasi: { label: 'Kayıt hatası', style: 'bg-red-50 text-red-700' },
  }
  return fallback[row.tur] ?? { label: row.tur, style: 'bg-ink-100 text-ink-600' }
}

function fullDate(dateIso) {
  if (!dateIso) return '—'
  return new Date(dateIso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TelsamWebhookErrorsTable({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">
        Hiç Santral entegrasyon hatası yok.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const info = classify(r)
        return (
          <div key={r.id} className="rounded-xl border border-ink-100 bg-white p-3.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${info.style}`}>{info.label}</span>
              <span className="text-xs text-ink-400">{KAYNAK_LABELS[r.kaynak] ?? r.kaynak}</span>
              {r.chanid && <span className="text-xs text-ink-400">chanid: {r.chanid}</span>}
              <span className="ml-auto shrink-0 text-xs text-ink-400">{fullDate(r.createdAt)}</span>
            </div>
            <p className="mt-2 break-words text-xs text-ink-500">{r.hataMesaji}</p>
          </div>
        )
      })}
    </div>
  )
}
