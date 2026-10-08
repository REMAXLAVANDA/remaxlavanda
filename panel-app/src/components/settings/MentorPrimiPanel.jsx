import MonthFilter, { monthRangeFor } from '../common/MonthFilter'
import { formatPrice } from '../../lib/opportunities'
import { formatDateOnly } from '../../lib/format'

// Mentor Primi — Selen'in (owner) yeni başlayan danışmanların cirosundan
// mentorluk başlangıç tarihinden itibaren belirli bir süre boyunca aldığı
// primi hesaplar. Mentorluk başlangıç tarihi danışmanın hesap açılış
// tarihinden DEĞİL, broker'ın her danışman için burada ayrıca girdiği
// tarihten gelir (2026-10-08 broker kararı: "danışman giriş tarihi
// otomatik seçildi ve herkesten prim alıyor, biz başlangıç tarihini
// belirleyebilelim"). Oran/gün sayısı KALICI DEĞİL (migration
// gerektirmiyor) — form state'i, broker değiştirirse anında yeniden
// hesaplanır (bkz. lib/mentorPrimi.js). Bu sekme SADECE broker'a açık
// (Ayarlar.jsx canViewMentorPrimi) — owner dahil kimse göremesin diye.
export default function MentorPrimiPanel({ form, onFormChange, rows, toplam, onSetBaslangic, savingUserId }) {
  const set = (patch) => onFormChange({ ...form, ...patch })

  return (
    <div>
      <p className="mb-4 text-xs text-text-muted">
        Her danışmanın cirosu, aşağıda kendisi için girdiğin başlangıç tarihinden itibaren {form.gunSayisi} gün
        boyunca sayılır — başlangıç tarihi girilmemiş bir danışman hiç hesaba katılmaz. Sadece bu sekmeyi sen
        görüyorsun.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-border-subtle bg-surface-sunken p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Prim oranı (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.oran}
            onChange={(e) => set({ oran: Number(e.target.value) })}
            className="w-24 rounded-lg border border-border-default bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Mentorluk süresi (gün)
          <input
            type="number"
            min="1"
            value={form.gunSayisi}
            onChange={(e) => set({ gunSayisi: Number(e.target.value) })}
            className="w-28 rounded-lg border border-border-default bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary"
          />
        </label>
        <div className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Ay
          <MonthFilter monthKey={form.monthKey} onSelect={(monthKey) => set({ monthKey, ...monthRangeFor(monthKey) })} />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-xs font-medium text-brand-700">Toplam Mentor Primi</p>
        <p className="mt-1 text-2xl font-semibold text-brand-800">{formatPrice(toplam)}</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-sunken text-text-muted">
              <th className="px-4 py-2.5 font-medium">Danışman</th>
              <th className="px-4 py-2.5 font-medium">Mentorluk Başlangıcı</th>
              <th className="px-4 py-2.5 font-medium">Ciro Toplamı</th>
              <th className="px-4 py-2.5 font-medium">Prim</th>
              <th className="px-4 py-2.5 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-border-subtle last:border-0">
                <td className="px-4 py-2.5 text-text-primary">{r.name}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="date"
                    value={r.baslangicTarihi ?? ''}
                    disabled={savingUserId === r.userId}
                    onChange={(e) => onSetBaslangic(r.userId, e.target.value)}
                    className="rounded-lg border border-border-default bg-surface-raised px-2.5 py-1.5 text-sm text-text-primary disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{r.izleniyor ? formatPrice(r.ciroToplam) : '—'}</td>
                <td className="px-4 py-2.5 font-medium text-brand-700">{r.izleniyor ? formatPrice(r.prim) : '—'}</td>
                <td className="px-4 py-2.5 text-xs text-text-muted">
                  {!r.izleniyor ? (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 font-medium text-ink-500">
                      Başlangıç tarihi girilmedi
                    </span>
                  ) : (
                    <>
                      {formatDateOnly(r.baslangicTarihi)} – {formatDateOnly(r.mentorlukBitis)}
                      {r.mentorlukDevamEdiyor && (
                        <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          devam ediyor
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
