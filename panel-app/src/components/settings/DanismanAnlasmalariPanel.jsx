import { useState } from 'react'
import { formatDateOnly } from '../../lib/format'
import { guncelAnlasmaOrani, guncelRtPayOrani } from '../../lib/ciroRaporlari'

// Danışman Anlaşmaları — her danışmanın Ciro Raporu sisteminde kullanılan
// komisyon paylaşım oranı (ör. %48, %80). Tarih aralıklı: yeni oran
// eklendiğinde önceki açık satır otomatik kapanır, geçmiş raporlar eski
// oranla donmuş kalır (bkz. dataProvider.danismanAnlasmalari.create,
// social_activity_log'daki puan_snapshot ile AYNI desen). Broker/owner'a
// açık — Ciro Raporu onay yetkisiyle (canApproveCiroRaporu) aynı seviye.
export default function DanismanAnlasmalariPanel({ danismanlar, anlasmalar, onCreate, submitting }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ paylasimOrani: '', rtPayOrani: '', gecerlilikBaslangic: new Date().toISOString().slice(0, 10) })
  const bugun = new Date().toISOString().slice(0, 10)

  function gecmis(danismanId) {
    return anlasmalar
      .filter((a) => a.danismanId === danismanId)
      .sort((a, b) => new Date(b.gecerlilikBaslangic) - new Date(a.gecerlilikBaslangic))
  }

  async function handleSave(danismanId) {
    if (!form.paylasimOrani) return
    await onCreate(danismanId, Number(form.paylasimOrani), form.rtPayOrani === '' ? null : Number(form.rtPayOrani), form.gecerlilikBaslangic)
    setEditingId(null)
    setForm({ paylasimOrani: '', rtPayOrani: '', gecerlilikBaslangic: new Date().toISOString().slice(0, 10) })
  }

  return (
    <div>
      <p className="mb-4 text-xs text-text-muted">
        Her danışmanın cirosundan kendisine kalan pay oranı ve RE/MAX Türkiye'ye giden RT Payı oranı — Ciro
        Raporu'nda önerilen tutarların hesabında kullanılır. Yeni oran girildiğinde eskisi otomatik kapanır, geçmiş
        raporlar eski oranla donmuş kalır.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-sunken text-text-muted">
              <th className="px-4 py-2.5 font-medium">Danışman</th>
              <th className="px-4 py-2.5 font-medium">Çalışan Payı</th>
              <th className="px-4 py-2.5 font-medium">RT Payı</th>
              <th className="px-4 py-2.5 font-medium">Geçerlilik Başlangıcı</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {danismanlar.map((d) => {
              const gecmisListe = gecmis(d.id)
              const guncelOran = guncelAnlasmaOrani(anlasmalar, d.id, bugun)
              const guncelRt = guncelRtPayOrani(anlasmalar, d.id, bugun)
              const guncelSatir = gecmisListe.find((a) => a.paylasimOrani === guncelOran && !a.gecerlilikBitis)
              const satirAcik = editingId === d.id
              return (
                <tr key={d.id} className="border-b border-border-subtle last:border-0 align-top">
                  <td className="px-4 py-2.5 text-text-primary">{d.name}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{guncelOran != null ? `%${guncelOran}` : '—'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{guncelRt != null ? `%${guncelRt}` : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">
                    {guncelSatir ? formatDateOnly(guncelSatir.gecerlilikBaslangic) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {satirAcik ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="Çalışan %"
                          value={form.paylasimOrani}
                          onChange={(e) => setForm((f) => ({ ...f, paylasimOrani: e.target.value }))}
                          className="w-20 rounded-lg border border-border-default px-2 py-1 text-xs text-text-primary"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="RT %"
                          value={form.rtPayOrani}
                          onChange={(e) => setForm((f) => ({ ...f, rtPayOrani: e.target.value }))}
                          className="w-20 rounded-lg border border-border-default px-2 py-1 text-xs text-text-primary"
                        />
                        <input
                          type="date"
                          value={form.gecerlilikBaslangic}
                          onChange={(e) => setForm((f) => ({ ...f, gecerlilikBaslangic: e.target.value }))}
                          className="rounded-lg border border-border-default px-2 py-1 text-xs text-text-primary"
                        />
                        <button
                          onClick={() => handleSave(d.id)}
                          disabled={submitting || !form.paylasimOrani}
                          className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          Kaydet
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-surface-sunken">
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(d.id)
                          setForm({ paylasimOrani: '', rtPayOrani: '', gecerlilikBaslangic: new Date().toISOString().slice(0, 10) })
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        {guncelOran != null ? 'Oranı Güncelle' : 'Oran Ata'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
