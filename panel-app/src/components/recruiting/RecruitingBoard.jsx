import { MessageSquare } from 'lucide-react'
import { RECRUITING_DURUM_SECILEBILIR, RECRUITING_DURUM_LABELS, RECRUITING_DURUM_STYLES, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

// Lead Havuzu'ndan dönüşen bir adayın hangi reklamdan geldiği — RecruitingTable
// ile AYNI desen.
function campaignLabel(c) {
  return [c.kampanyaKodu, c.reklamAdi].filter(Boolean).join(' — ') || null
}

function candidateDateLabel(createdAt) {
  return new Date(createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function CandidateCard({ c, resolveName, onClick, showCampaign, noteCount }) {
  return (
    <div
      onClick={() => onClick(c)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(c)
        }
      }}
      className="cursor-pointer rounded-xl border border-border-default bg-surface-raised p-3 outline-none transition-colors hover:border-brand-300 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium text-text-primary">{c.adSoyad}</p>
        {/* Kaç görüşme yapıldığı kart üzerinden, tıklamadan görünsün diye
            (broker kararı: "ne yaptı kaç görüşme yapıldı görülmeli"). */}
        {noteCount > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
            <MessageSquare size={11} /> {noteCount}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-text-secondary">{c.telefon ?? '—'}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-disabled">
        <span className="truncate">{RECRUITING_KAYNAK_LABELS[c.kaynak]}</span>
        <span className="shrink-0">{candidateDateLabel(c.createdAt)}</span>
      </div>
      {showCampaign && campaignLabel(c) && <p className="mt-1 truncate text-xs text-text-disabled">{campaignLabel(c)}</p>}
      {c.atananDanismanId && <p className="mt-1 truncate text-xs text-text-muted">{resolveName(c.atananDanismanId)}</p>}
    </div>
  )
}

// Broker isteği (2026-09-27): "her şey altalta" tek liste yerine, ilk portal
// prototipindeki gibi her aşama ayrı bir kutuda — Trello/kvCORE tarzı bir
// pipeline panosu. RecruitingTable (satır tablosu) YERİNE geçiyor, aynı
// candidates/onCardClick/resolveName/showCampaign prop'larını kullanıyor —
// filtreler (durum/atanan/kayıt tipi) değişmedi, RecruitingFilters zaten bir
// durum seçilirse o tek kolonu göstermeye devam eder (bilinçli, ayrı bir
// "board modu" filtresi eklenmedi).
//
// "Olumlu" kolonu BİLEREK yok (2026-09-27, broker: "hiç olumlu menüsü
// olmasın" — kanban panosunda ayrı bir sütun olması da aynı kurala giriyor,
// RECRUITING_DURUM_SECILEBILIR kullanılıyor, RecruitingDetailModal/
// RecruitingFilters ile AYNI desen). Bir aday "Danışman Olarak Ekle" ile
// olumluya geçince artık gerçek bir kullanıcı — hikayesi Ayarlar >
// Kullanıcılar'da (kaynak alanıyla) devam ediyor, Recruiting panosunda
// kartı kalmıyor.
export default function RecruitingBoard({ candidates, resolveName, onCardClick, showCampaign, noteCounts = {} }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
        Bu filtrelere uyan aday yok.
      </div>
    )
  }

  const columns = RECRUITING_DURUM_SECILEBILIR.map((durum) => ({
    durum,
    items: candidates.filter((c) => c.durum === durum),
  }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map(({ durum, items }) => (
        <div key={durum} className="flex w-72 shrink-0 flex-col rounded-2xl border border-border-default bg-surface-sunken">
          <div className="flex items-center justify-between gap-2 border-b border-border-default px-3.5 py-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${RECRUITING_DURUM_STYLES[durum]}`}>
              {RECRUITING_DURUM_LABELS[durum]}
            </span>
            <span className="shrink-0 text-xs font-medium text-text-muted">{items.length}</span>
          </div>
          <div className="flex flex-col gap-2 p-2.5">
            {items.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-text-disabled">Aday yok</p>
            ) : (
              items.map((c) => (
                <CandidateCard
                  key={c.id}
                  c={c}
                  resolveName={resolveName}
                  onClick={onCardClick}
                  showCampaign={showCampaign}
                  noteCount={noteCounts[c.id]}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
