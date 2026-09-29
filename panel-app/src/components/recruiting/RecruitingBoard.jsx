import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { RECRUITING_DURUM_SECILEBILIR, RECRUITING_DURUM_LABELS, RECRUITING_DURUM_STYLES, RECRUITING_KAYNAK_LABELS } from '../../lib/recruiting'

// Olumsuz/Yanlış Başvuru BİLEREK varsayılan gizli (2026-09-27, broker:
// "hiç menüyü kalabalık etmese, bir düğmeye basıldığında görünse") —
// bunlar kapanmış/terminal aşamalar, günlük operasyonda odaklanılan aktif
// akış (Yeni Başvuru -> Randevu -> Karar Bekliyor) değil. Bir düğmeyle
// açılıp kapanıyor, tamamen kaldırılmıyor — veri kaybolmuyor, sadece
// varsayılan görünümden çıkıyor.
const NEGATIF_DURUMLAR = ['olumsuz', 'yanlis_basvuru']

function candidateDateLabel(createdAt) {
  return new Date(createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Kart BİLEREK sadece 3 alan gösteriyor: isim, kaynak, tarih (broker
// kararı, 2026-09-29: "isim soyisim kaynak ve tarih olsun, detaylar içine
// girince olsun") — telefon/reklam bilgisi/atanan danışman gibi geri
// kalan her şey artık SADECE RecruitingDetailModal'da (karta tıklayınca).
function CandidateCard({ c, onClick, noteCount }) {
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
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-text-disabled">
        <span className="truncate">{RECRUITING_KAYNAK_LABELS[c.kaynak]}</span>
        <span className="shrink-0">{candidateDateLabel(c.createdAt)}</span>
      </div>
    </div>
  )
}

// Broker isteği (2026-09-27): "her şey altalta" tek liste yerine, ilk portal
// prototipindeki gibi her aşama ayrı bir kutuda — Trello/kvCORE tarzı bir
// pipeline panosu. RecruitingTable (satır tablosu) YERİNE geçiyor — filtreler
// (durum/atanan/kayıt tipi) değişmedi, RecruitingFilters zaten bir durum
// seçilirse o tek kolonu göstermeye devam eder (bilinçli, ayrı bir "board
// modu" filtresi eklenmedi).
//
// "Olumlu" kolonu BİLEREK yok (2026-09-27, broker: "hiç olumlu menüsü
// olmasın" — kanban panosunda ayrı bir sütun olması da aynı kurala giriyor,
// RECRUITING_DURUM_SECILEBILIR kullanılıyor, RecruitingDetailModal/
// RecruitingFilters ile AYNI desen). Bir aday "Danışman Olarak Ekle" ile
// olumluya geçince artık gerçek bir kullanıcı — hikayesi Ayarlar >
// Kullanıcılar'da (kaynak alanıyla) devam ediyor, Recruiting panosunda
// kartı kalmıyor.
export default function RecruitingBoard({ candidates, onCardClick, noteCounts = {} }) {
  const [showNegatif, setShowNegatif] = useState(false)

  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-surface-raised py-16 text-center text-sm text-text-disabled">
        Bu filtrelere uyan aday yok.
      </div>
    )
  }

  const negatifCount = candidates.filter((c) => NEGATIF_DURUMLAR.includes(c.durum)).length
  const visibleDurumlar = showNegatif
    ? RECRUITING_DURUM_SECILEBILIR
    : RECRUITING_DURUM_SECILEBILIR.filter((d) => !NEGATIF_DURUMLAR.includes(d))
  const columns = visibleDurumlar.map((durum) => ({
    durum,
    items: candidates.filter((c) => c.durum === durum),
  }))

  return (
    <div>
      {negatifCount > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setShowNegatif((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border-default bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-sunken"
          >
            {showNegatif ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showNegatif ? 'Olumsuz / Yanlış Başvuruyu Gizle' : `Olumsuz / Yanlış Başvuruyu Göster (${negatifCount})`}
          </button>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map(({ durum, items }) => (
        <div key={durum} className="flex min-w-72 flex-1 shrink-0 flex-col rounded-2xl border border-border-default bg-surface-sunken">
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
                <CandidateCard key={c.id} c={c} onClick={onCardClick} noteCount={noteCounts[c.id]} />
              ))
            )}
          </div>
        </div>
        ))}
      </div>
    </div>
  )
}
