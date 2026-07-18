import { forwardRef } from 'react'
import { TrendingUp, Heart, Megaphone, Crown } from 'lucide-react'
import { MEDALS } from '../../lib/league'

const CATEGORY_STYLE = {
  ciro: { icon: TrendingUp, from: 'from-amber-400', to: 'to-amber-600' },
  memnuniyet: { icon: Heart, from: 'from-sky-400', to: 'to-sky-600' },
  sosyal_medya: { icon: Megaphone, from: 'from-fuchsia-400', to: 'to-fuchsia-600' },
}

// format: 'story' (9:16, WhatsApp/Instagram Hikaye) | 'post' (4:5, Instagram
// Gönderi) — ikisi de aynı içerik, sadece kart oranı değişiyor.
const DIMENSIONS = {
  story: 'h-[640px] w-[360px]',
  post: 'h-[450px] w-[360px]',
}

// Sosyal medyada paylaşılabilecek görsel — mutlak TL/puan değeri ya da
// görece fark BURADA HİÇ GÖSTERİLMEZ (in-app listeden bile daha kısıtlı):
// sadece isim + kaçıncı sırada olduğu. Kişisel/mali bilgi sızmasın diye
// danışman bunu çekinmeden kendi hesabında paylaşabilsin. categories tek
// elemanlı verilirse (danışman sadece kendi güçlü olduğu alanı paylaşmak
// isteyebilir) o kategori büyütülerek tek başına gösterilir.
const ShareCard = forwardRef(function ShareCard({ categories, rankingsByCategory, periodLabel, format = 'story' }, ref) {
  const single = categories.length === 1

  return (
    <div
      ref={ref}
      className={`relative flex ${DIMENSIONS[format]} flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-brand-800 via-brand-700 to-brand-900 p-6 text-white`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/10 blur-2xl" />

      <div className="relative flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-brand-700">
          RL
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">RE/MAX Lavanda</p>
          <p className="text-[11px] leading-tight text-white/70">{periodLabel}</p>
        </div>
      </div>

      <h2 className="relative mt-5 text-lg font-bold leading-snug">
        {single ? `${categories[0].label} Liderleri 🏆` : 'Bu Dönemin Liderleri 🏆'}
      </h2>

      <div className={`relative mt-4 flex-1 space-y-4 ${single ? 'flex flex-col justify-center' : ''}`}>
        {categories.map((c) => {
          const style = CATEGORY_STYLE[c.key]
          const Icon = style.icon
          const top3 = (rankingsByCategory[c.key] ?? []).slice(0, 3)
          return (
            <div key={c.key} className={`rounded-2xl bg-white/10 backdrop-blur-sm ${single ? 'p-5' : 'p-3'}`}>
              <div className={`flex items-center gap-1.5 ${single ? 'mb-4' : 'mb-2'}`}>
                <span
                  className={`flex items-center justify-center rounded-full bg-gradient-to-br ${style.from} ${style.to} ${single ? 'h-9 w-9' : 'h-6 w-6'}`}
                >
                  <Icon size={single ? 18 : 13} className="text-white" />
                </span>
                <span className={`font-bold uppercase tracking-wide text-white/90 ${single ? 'text-base' : 'text-xs'}`}>
                  {c.label}
                </span>
              </div>
              {top3.length === 0 ? (
                <p className="py-2 text-center text-xs text-white/50">Henüz veri yok</p>
              ) : (
                <div className={single ? 'space-y-2.5' : 'space-y-1'}>
                  {top3.map((r) => (
                    <div
                      key={r.userId}
                      className={`flex items-center gap-2 rounded-lg bg-white/10 ${single ? 'px-3 py-3' : 'px-2 py-1.5'}`}
                    >
                      <span className={`shrink-0 text-center ${single ? 'w-8 text-2xl' : 'w-5 text-sm'}`}>
                        {MEDALS[r.rank - 1]}
                      </span>
                      <span className={`min-w-0 flex-1 truncate font-medium text-white ${single ? 'text-lg' : 'text-sm'}`}>
                        {r.name}
                      </span>
                      {r.isLeader && <Crown size={single ? 18 : 13} className="shrink-0 text-amber-300" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="relative mt-4 text-center text-[11px] font-medium text-white/60">remaxlavanda.com.tr</p>
    </div>
  )
})

export default ShareCard
