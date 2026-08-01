// Ayarlar > Webhook Hataları — meta-leads-webhook bir lead'i işleyemediğinde
// (imza/Graph API/alan eşleşme/insert hatası) burada listelenir. "graph_api_
// hatasi" türü ikiye ayrılır: field_data çekilemezse lead'in KENDİSİ hiç
// kaydedilmemiştir (isim/telefon dahi yok — Meta'nın veri saklama süresi
// dolmadan hızlıca fark edilip elle kurtarılmalı), reklam bilgisi çekilemezse
// lead zaten kayıtlıdır, sadece hangi reklamdan geldiği eksik kalır — çok
// daha düşük öncelikli. Bu ayrım broker'ın gerçek bir kayıp lead'i, kozmetik
// bir eksiklik arasında SQL'e inmeden anlayabilmesi için eklendi (bkz.
// AI_NOTLARI.md — bu ekranın doğduğu gerçek olay).
function classify(row) {
  if (row.tur === 'graph_api_hatasi' && row.hataMesaji?.startsWith('field_data çekilemedi')) {
    return { label: 'Lead kaybolmuş olabilir', style: 'bg-red-50 text-red-700' }
  }
  if (row.tur === 'graph_api_hatasi' && row.hataMesaji?.toLowerCase().startsWith('reklam bilgisi çekilemedi')) {
    return { label: 'Sadece reklam adı eksik', style: 'bg-amber-50 text-amber-700' }
  }
  const fallback = {
    imza_hatasi: { label: 'İmza doğrulama hatası', style: 'bg-red-50 text-red-700' },
    alan_eslesmedi: { label: 'Alan eşleşmedi', style: 'bg-ink-100 text-ink-600' },
    insert_hatasi: { label: 'Kayıt hatası', style: 'bg-red-50 text-red-700' },
    graph_api_hatasi: { label: 'Graph API hatası', style: 'bg-amber-50 text-amber-700' },
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

export default function WebhookErrorsTable({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">
        Hiç webhook hatası yok — Meta'dan gelen tüm lead'ler sorunsuz işlendi.
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
              {r.leadgenId && <span className="text-xs text-ink-400">leadgen_id: {r.leadgenId}</span>}
              <span className="ml-auto shrink-0 text-xs text-ink-400">{fullDate(r.createdAt)}</span>
            </div>
            <p className="mt-2 break-words text-xs text-ink-500">{r.hataMesaji}</p>
          </div>
        )
      })}
    </div>
  )
}
