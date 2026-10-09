import { useMemo, useState } from 'react'
import { Plus, Link2, Undo2, Unlock, Receipt } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  opportunities as opportunitiesProvider,
  ciroRaporlari as ciroRaporlariProvider,
  bankaHareketleri as bankaHareketleriProvider,
  categories as categoriesProvider,
} from '../../lib/dataProvider'
import { BANKA_HAREKETI_DURUM_LABELS, BANKA_HAREKETI_DURUM_STYLES, canManageBankaHareketleri, eslesmeAdaylari } from '../../lib/bankaHareketleri'
import { slugify } from '../../lib/categories'
import { formatDateOnly, formatThousands, parseThousands } from '../../lib/format'
import { LoadingState, ErrorState, RestrictedAccess } from '../common/AsyncState'
import BlokeCozumleModal from './BlokeCozumleModal'
import MasrafIsaretleModal from './MasrafIsaretleModal'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const today = () => new Date().toISOString().slice(0, 10)

async function loadAll() {
  const [hareketler, raporlar, opportunities, kategoriler] = await Promise.all([
    bankaHareketleriProvider.list(),
    ciroRaporlariProvider.list(),
    opportunitiesProvider.list(),
    categoriesProvider.list('masraflar'),
  ])
  return { hareketler, raporlar, opportunities, kategoriler }
}

export default function BankaHareketleriPanel() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, setData, loading, error, reload } = useAsyncList(loadAll, [])
  const [form, setForm] = useState({ tip: 'giris', tutar: '', tarih: today(), gonderenAdi: '', aciklama: '', referansNo: '', bloke: false, opportunityId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [matchTarget, setMatchTarget] = useState(null)
  const [blokeTarget, setBlokeTarget] = useState(null)
  const [masrafTarget, setMasrafTarget] = useState(null)

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

  const danismanOptions = useMemo(
    () => Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi),
    [knownUsers],
  )

  if (!canManageBankaHareketleri(role)) {
    return <RestrictedAccess message="Banka Hareketleri sadece broker rolüne açıktır." />
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const parsedTutar = parseThousands(form.tutar)
  const cikis = form.tip === 'cikis'
  const canSubmit = parsedTutar !== null && parsedTutar > 0 && form.tarih && (cikis || !form.bloke || form.opportunityId)

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
        {
          tip: form.tip,
          tutar: parsedTutar,
          tarih: form.tarih,
          gonderenAdi: form.gonderenAdi.trim(),
          aciklama: form.aciklama.trim(),
          referansNo: form.referansNo.trim(),
          opportunityId: !cikis && form.bloke ? form.opportunityId : null,
          bloke: !cikis && form.bloke,
        },
        user.id,
      )
      setForm({ tip: form.tip, tutar: '', tarih: today(), gonderenAdi: '', aciklama: '', referansNo: '', bloke: false, opportunityId: '' })
      showToast(form.bloke ? 'Bağlanma parası bloke olarak kaydedildi.' : 'Hareket eklendi.', 'success')
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

  async function handleBlokeCozumle(aksiyon, payload) {
    setSubmitting(true)
    try {
      await bankaHareketleriProvider.blokeyiCozumle(blokeTarget.id, { aksiyon, ...payload }, user.id)
      setBlokeTarget(null)
      showToast('Bağlanma parası çözümlendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Çözümlenemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMasrafIsaretle(payload) {
    setSubmitting(true)
    try {
      await bankaHareketleriProvider.masrafOlarakIsaretle(masrafTarget.id, payload, user.id)
      setMasrafTarget(null)
      showToast('Masraf olarak kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleKategoriEkle(label) {
    const maxOrder = (data?.kategoriler ?? []).reduce((max, k) => Math.max(max, k.sortOrder), 0)
    const created = await categoriesProvider.create({
      module: 'masraflar',
      key: slugify(label),
      label,
      sortOrder: maxOrder + 1,
      visibility: 'yonetim',
    })
    setData((prev) => ({ ...prev, kategoriler: [...(prev?.kategoriler ?? []), created] }))
    showToast('Kategori eklendi.', 'success')
    return created
  }

  const hareketler = data?.hareketler ?? []
  const kategoriler = data?.kategoriler ?? []
  const adaylar = matchTarget ? eslesmeAdaylari(matchTarget.tutar, bekleyenKatilimcilar) : []
  const blokeAdaylari = blokeTarget ? bekleyenKatilimcilar.filter((a) => a.opportunityId === blokeTarget.opportunityId) : []

  return (
    <div>
      <p className="mb-5 text-sm text-text-muted">
        Banka API'si bağlanana kadar ekstreyi buraya elle gir — bir ödeme bekleyen kayıtla eşleştir, ya da masraf olarak
        işaretle.
      </p>

      <form onSubmit={handleCreate} className="mb-6 space-y-2 rounded-2xl border border-border-default bg-surface-raised p-4">
        <div className="flex gap-2">
          {[
            { key: 'giris', label: 'Giriş' },
            { key: 'cikis', label: 'Çıkış' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => set({ tip: t.key, bloke: false, opportunityId: '' })}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                form.tip === t.key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-border-default text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
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
            placeholder={cikis ? 'Alıcı adı' : 'Gönderen adı'}
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
        </div>
        {!cikis && (
          <>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={form.bloke} onChange={(e) => set({ bloke: e.target.checked, opportunityId: '' })} />
              Bu bir bağlanma parası (tapu gününe kadar bloke bekleyecek)
            </label>
            {form.bloke && (
              <select
                required
                value={form.opportunityId}
                onChange={(e) => set({ opportunityId: e.target.value })}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary sm:w-1/2"
              >
                <option value="">Hangi fırsata ait</option>
                {(data?.opportunities ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ozet || o.konum}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </form>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-sunken text-text-muted">
                <th className="px-4 py-2.5 font-medium">Tarih</th>
                <th className="px-4 py-2.5 font-medium">Tip</th>
                <th className="px-4 py-2.5 font-medium">Tutar</th>
                <th className="px-4 py-2.5 font-medium">Gönderen</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {hareketler.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                    Henüz hareket yok.
                  </td>
                </tr>
              )}
              {hareketler.map((h) => (
                <tr key={h.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-2.5 text-text-secondary">{formatDateOnly(h.tarih)}</td>
                  <td className="px-4 py-2.5 text-text-muted">
                    {h.tip === 'cikis' ? 'Çıkış' : h.tur === 'baglanma_parasi' ? 'Bağlanma Parası' : 'Giriş'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{tl(h.tutar)}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{h.gonderenAdi || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BANKA_HAREKETI_DURUM_STYLES[h.durum]}`}>
                      {BANKA_HAREKETI_DURUM_LABELS[h.durum]}
                      {h.durum === 'eslesti' && h.eslesenKatilimciId ? ` — ${userName(bekleyenKatilimcilar.find((a) => a.katilimciId === h.eslesenKatilimciId)?.danismanId) ?? ''}` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {h.durum === 'eslesmedi' && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setMatchTarget(h)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                        >
                          <Link2 size={13} /> Eşleştir
                        </button>
                        <button
                          onClick={() => setMasrafTarget(h)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Receipt size={13} /> Masraf
                        </button>
                      </div>
                    )}
                    {h.durum === 'blokede' && (
                      <button
                        onClick={() => setBlokeTarget(h)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                      >
                        <Unlock size={13} /> Çözümle
                      </button>
                    )}
                    {h.durum === 'eslesti' && (
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

      {blokeTarget && (
        <BlokeCozumleModal
          bloke={blokeTarget}
          adaylar={blokeAdaylari}
          userName={userName}
          onClose={() => setBlokeTarget(null)}
          onSubmit={handleBlokeCozumle}
          submitting={submitting}
        />
      )}

      {masrafTarget && (
        <MasrafIsaretleModal
          hareket={masrafTarget}
          kategoriler={kategoriler}
          danismanOptions={danismanOptions}
          onClose={() => setMasrafTarget(null)}
          onSubmit={handleMasrafIsaretle}
          onKategoriEkle={handleKategoriEkle}
          submitting={submitting}
        />
      )}
    </div>
  )
}
