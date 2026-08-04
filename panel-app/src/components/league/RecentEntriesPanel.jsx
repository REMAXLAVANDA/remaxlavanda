import { History } from 'lucide-react'

// "Lig'e en son hangi ciroyu/sosyal medya verisini girdik" sorusuna
// cevap — AddScoreModal/AddSocialActivityModal içinde, "Veri Gir" ile o
// kategori seçilince açılır (broker: "veri girdiğimiz ekranda açılsın,
// sayfada görünmesin"). `detail` metni tutarı/adedi İÇERİR (broker: "RAKAM
// DA DAHİL YOKSA anlaşılmıyor") — bu panel sadece yöneticiye (isManager)
// açık bir denetim akışı olduğu için Lig'in podyum/sıralama
// ekranlarındaki "mutlak rakam yok" mahremiyet kuralı burada geçerli
// değil.
export default function RecentEntriesPanel({ entries }) {
  if (entries.length === 0) return null

  return (
    <div className="mb-5 rounded-2xl border border-border-default bg-surface-raised p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <History size={15} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-text-primary">Son İşlemler</h3>
      </div>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-text-secondary">
              <span className="font-medium text-text-primary">{e.danismanName}</span> — {e.detail}
            </span>
            <span className="shrink-0 text-xs text-text-disabled">{e.when}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
