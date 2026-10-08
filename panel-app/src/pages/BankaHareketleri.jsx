import { useMemo, useState } from 'react'
import { Plus, Link2, Undo2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useKnownUsers } from '../context/UsersContext'
import { useAsyncList } from '../hooks/useAsyncList'
import { opportunities as opportunitiesProvider, ciroRaporlari as ciroRaporlariProvider, bankaHareketleri as bankaHareketleriProvider } from '../lib/dataProvider'
import { BANKA_HAREKETI_DURUM_LABELS, BANKA_HAREKETI_DURUM_STYLES, canManageBankaHareketleri, eslesmeAdaylari } from '../lib/bankaHareketleri'
import { formatDateOnly, formatThousands, parseThousands } from '../lib/format'
import { LoadingState, ErrorState, RestrictedAccess } from '../components/common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const today = () => new Date().toISOString().slice(0, 10)

async function loadAll() {
  const [hareketler, raporlar, opportunities] = await Promise.all([
    bankaHareketleriProvider.list(),
    ciroRaporlariProvider.list(),
    opportunitiesProvider.list(),
  ])
  return { hareketler, raporlar, opportunities }
}

export default function BankaHareketleri() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [form, setForm] = useState({ tutar: '', tarih: today(), gonderenAdi: '', aciklama: '', referansNo: '' })
  const [submitting, setSubmitting] = useState(false)
  const [matchTarget, setMatchTarget] = useState(null)

  // Ödeme bekleyen tüm katılımcı satırları — her bankadan gelen hareket
  // için en olası eşleşme adayları buradan çıkıyor (bkz. lib/
  // bankaHareketleri.js eslesmeAdaylari). Guard'dan (aşağıda) ÖNCE —
  // React Hook kuralları: hook'lar koşullu dönüşten önce, hep aynı
  // sırada çağrılmalı.
  const bekleyenKatilimcilar = useMemo(() => {
    const list = []
    for (const r of data?.raporlar ?? []) {
      for (const k of r.katilimcilar ?? []) {
        if (k.odemeDurumu !== 'bekliyor') continue
        list.push({
          katilimciId: k.id,
          danismanId: k.danismanId,
          tutar: k.faturaTutari ?? k.komisyonTutariOnerisi ?? 0,
          opportunityId: r.opportunityId,
          islemTarihi: r.islemTarihi,
        })
      }
    }
    return list
  }, [data])

  if (!canManageBankaHareketleri(role)) {
    return <RestrictedAccess message="Banka Hareketleri sadece broker ve owner rollerine açıktır." />
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const parsedTutar = parseThousands(form.tutar)
  const canSubmit = parsedTutar !== null && parsedTutar > 0 && form.tarih

  const userName = (id) => knownUsers[id]?.name ?? '—'
  const opportunityLabel = (id) => {
    const o = data?.opportunities?.find((o) => o.id === id)
    return o ? o.ozet || o.konum : 'Fırsat'
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await bankaHareketleriProvider.create(
        { tutar: parsedTutar, tarih: form.tarih, gonderenAdi: form.gonderenAdi.trim(), aciklama: form.aciklama.trim(), referansNo: form.referansNo.trim() },
        user.id,
      )
      setForm({ tutar: '', tarih: today(), gonderenAdi: '', aciklama: '', referansNo: '' })
      showToast('Hareket eklendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Eklenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEslestir(katilimciId) {
    setSubmitting(true)
    try {
      await bankaHareketleriProvider.eslestir(matchTarget.id, katilimciId, user.id)
      setMatchTarget(null)
      showToast('Eşleştirildi, ödeme alındı olarak işaretlendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Eşleştirilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleKaldir(hareketId) {
    try {
      await bankaHareketleriProvider.eslesmeyiKaldir(hareketId)
      showToast('Eşleşme kaldırıldı.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaldırılamadı, tekrar dene.', 'error')
    }
  }

  const hareketler = data?.hareketler ?? []
  const adaylar = matchTarget ? eslesmeAdaylari(matchTarget.tutar, bekleyenKatilimcilar) : []

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-text-primary">Banka Hareketleri</h1>
        <p className="text-sm text-text-muted">
          Banka API'si bağlanana kadar ekstreyi buraya elle gir, Ciro Raporu'ndaki ödeme bekleyen kayıtlarla eşleştir.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mb-6 grid gap-2 rounded-2xl border border-border-default bg-surface-raised p-4 sm:grid-cols-5">
        <input
          required
          inputMode="numeric"
          value={form.tutar}
          onChange={(e) => set({ tutar: formatThousands(e.target.value) })}
          placeholder="Tutar (₺)"
          className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <input
          required
          type="date"
          value={form.tarih}
          onChange={(e) => set({ tarih: e.target.value })}
          className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
        />
        <input
          value={form.gonderenAdi}
          onChange={(e) => set({ gonderenAdi: e.target.value })}
          placeholder="Gönderen adı"
          className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <input
          value={form.aciklama}
          onChange={(e) => set({ aciklama: e.target.value })}
          placeholder="Açıklama"
          className="rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Plus size={16} /> Ekle
        </button>
      </form>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-sunken text-text-muted">
                <th className="px-4 py-2.5 font-medium">Tarih</th>
                <th className="px-4 py-2.5 font-medium">Tutar</th>
                <th className="px-4 py-2.5 font-medium">Gönderen</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {hareketler.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    Henüz hareket yok.
                  </td>
                </tr>
              )}
              {hareketler.map((h) => (
                <tr key={h.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-2.5 text-text-secondary">{formatDateOnly(h.tarih)}</td>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{tl(h.tutar)}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{h.gonderenAdi || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BANKA_HAREKETI_DURUM_STYLES[h.durum]}`}>
                      {BANKA_HAREKETI_DURUM_LABELS[h.durum]}
                      {h.durum === 'eslesti' && h.eslesenKatilimciId ? ` — ${userName(bekleyenKatilimcilar.find((a) => a.katilimciId === h.eslesenKatilimciId)?.danismanId) ?? ''}` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {h.durum === 'eslesmedi' ? (
                      <button
                        onClick={() => setMatchTarget(h)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <Link2 size={13} /> Eşleştir
                      </button>
                    ) : (
                      <button
                        onClick={() => handleKaldir(h.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-surface-sunken"
                      >
                        <Undo2 size={13} /> Eşleşmeyi kaldır
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {matchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setMatchTarget(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
          >
            <h2 className="mb-1 text-base font-semibold text-ink-900">Eşleştir</h2>
            <p className="mb-4 text-sm text-text-muted">
              {tl(matchTarget.tutar)} · {formatDateOnly(matchTarget.tarih)} · {matchTarget.gonderenAdi || 'Gönderen belirtilmemiş'}
            </p>
            {adaylar.length === 0 ? (
              <p className="text-sm text-text-muted">Ödeme bekleyen kayıt yok.</p>
            ) : (
              <div className="space-y-2">
                {adaylar.map((a) => (
                  <button
                    key={a.katilimciId}
                    onClick={() => handleEslestir(a.katilimciId)}
                    disabled={submitting}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border-default p-3 text-left hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary">{userName(a.danismanId)}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {opportunityLabel(a.opportunityId)} · {formatDateOnly(a.islemTarihi)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-text-primary">{tl(a.tutar)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setMatchTarget(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-sunken">
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
