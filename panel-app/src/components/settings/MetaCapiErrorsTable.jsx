// Ayarlar > Webhook Hataları — Portal -> Meta CAPI (durum geri bildirimi)
// bölümü. WebhookErrorsTable (Meta'dan bize) ile AYNI görsel desen ama TERS
// yön — ayrı dosya çünkü "tur" değerleri farklı (bkz. o dosyanın notu,
// bilerek ayrı tutuldu; supabase/functions/send-meta-conversion).
function classify(row) {
  const fallback = {
    gonderim_hatasi: { label: 'Meta\'ya gönderilemedi', style: 'bg-red-50 text-red-700' },
    yapilandirma_hatasi: { label: 'Yapılandırma eksik', style: 'bg-amber-50 text-amber-700' },
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

export default function MetaCapiErrorsTable({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">
        Hiç Meta durum bildirimi hatası yok.
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
              {r.eventName && <span className="text-xs text-ink-400">event: {r.eventName}</span>}
              {r.metaLeadId && <span className="text-xs text-ink-400">meta_lead_id: {r.metaLeadId}</span>}
              <span className="ml-auto shrink-0 text-xs text-ink-400">{fullDate(r.createdAt)}</span>
            </div>
            <p className="mt-2 break-words text-xs text-ink-500">{r.hataMesaji}</p>
          </div>
        )
      })}
    </div>
  )
}
