import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import {
  ciroRaporlari as ciroRaporlariProvider,
  islemMasraflari as islemMasraflariProvider,
  cariHareketler as cariHareketlerProvider,
  bankaHareketleri as bankaHareketleriProvider,
  opportunities as opportunitiesProvider,
  categories as categoriesProvider,
} from '../../lib/dataProvider'
import { canManageMasraflar } from '../../lib/islemMasraflari'
import { cariOzetiByDanisman } from '../../lib/cariHesap'
import { formatDateOnly, formatThousands, parseThousands } from '../../lib/format'
import { LoadingState, ErrorState, RestrictedAccess } from '../common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const today = () => new Date().toISOString().slice(0, 10)
const currentMonthKey = () => today().slice(0, 7) // YYYY-MM

async function loadAll() {
  const [raporlar, masraflar, hareketler, bankaHareketler, opportunities, kategoriler] = await Promise.all([
    ciroRaporlariProvider.list(),
    islemMasraflariProvider.listAll(),
    cariHareketlerProvider.list(),
    bankaHareketleriProvider.list(),
    opportunitiesProvider.list(),
    categoriesProvider.list('masraflar'),
  ])
  return { raporlar, masraflar, hareketler, bankaHareketler, opportunities, kategoriler }
}

export default function MasraflarPanel() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])

  const [faturaForm, setFaturaForm] = useState({ danismanId: '', kategori: 'sahibinden_bedeli', tutar: '', tarih: today(), aciklama: '' })
  const [submitting, setSubmitting] = useState(false)

  const danismanOptions = useMemo(
    () => Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi),
    [knownUsers],
  )

  // Özet bölümü (2026-10-09 broker: "üstte kalan bölüme bir rapor
  // eklemesi yapalım, özet olsun — bloke'de kimin ne kadar parası var, bu
  // ay ne kadar masraf olmuş, danışman alacak/borç durumu") — tab'ın en
  // üstünde, salt okunur. Guard'dan ÖNCE — hook kuralları.
  const ozet = useMemo(() => {
    const masraflar = data?.masraflar ?? []
    const hareketler = data?.hareketler ?? []
    const bankaHareketler = data?.bankaHareketler ?? []
    const raporlar = data?.raporlar ?? []
    const opportunities = data?.opportunities ?? []
    const monthKey = currentMonthKey()

    const bloke = bankaHareketler
      .filter((h) => h.durum === 'blokede')
      .map((h) => ({ ...h, opportunityLabel: opportunities.find((o) => o.id === h.opportunityId)?.ozet ?? opportunities.find((o) => o.id === h.opportunityId)?.konum ?? 'Fırsat' }))

    const buAykiMasraflar = masraflar.filter((m) => (m.createdAt ?? '').slice(0, 7) === monthKey)
    const buAykiMasrafToplam = buAykiMasraflar.reduce((s, m) => s + Number(m.tutar), 0)
    const kategoriKirilimi = {}
    for (const m of buAykiMasraflar) kategoriKirilimi[m.tur] = (kategoriKirilimi[m.tur] ?? 0) + Number(m.tutar)

    const danismaniBagliMasrafToplam = buAykiMasraflar.filter((m) => m.danismanId).reduce((s, m) => s + Number(m.tutar), 0)
    const genelOfisGideri = buAykiMasrafToplam - danismaniBagliMasrafToplam
    const aktifDanismanSayisi = Math.max(1, danismanOptions.length)
    const kisiBasiGenelGider = genelOfisGideri / aktifDanismanSayisi

    const cariOzet = cariOzetiByDanisman(hareketler)
      .map((r) => ({ ...r, name: knownUsers[r.danismanId]?.name ?? '—' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))

    const kazancByDanisman = {}
    for (const r of raporlar) {
      if (r.durum !== 'onaylandi') continue
      if (!(r.islemTarihi ?? '').startsWith(monthKey)) continue
      for (const k of r.katilimcilar ?? []) {
        const tutar = Number(k.faturaTutari ?? k.komisyonTutariOnerisi ?? 0)
        kazancByDanisman[k.danismanId] = (kazancByDanisman[k.danismanId] ?? 0) + tutar
      }
    }
    const kazancListesi = Object.entries(kazancByDanisman)
      .map(([danismanId, tutar]) => ({ danismanId, tutar, name: knownUsers[danismanId]?.name ?? '—' }))
      .sort((a, b) => b.tutar - a.tutar)

    return { bloke, buAykiMasrafToplam, kategoriKirilimi, cariOzet, kazancListesi, genelOfisGideri, kisiBasiGenelGider }
  }, [data, knownUsers, danismanOptions.length])

  if (!canManageMasraflar(role)) {
    return <RestrictedAccess message="Masraflar sadece broker rolüne açıktır." />
  }

  const kategoriLabel = (key) => (data?.kategoriler ?? []).find((k) => k.key === key)?.label ?? key

  async function handleFaturaSubmit(e) {
    e.preventDefault()
    const parsed = parseThousands(faturaForm.tutar)
    if (!faturaForm.danismanId || parsed === null || parsed <= 0 || !faturaForm.tarih) return
    setSubmitting(true)
    try {
      await cariHareketlerProvider.create(
        {
          danismanId: faturaForm.danismanId,
          tarih: faturaForm.tarih,
          tur: 'borc',
          tutar: parsed,
          kategori: faturaForm.kategori,
          aciklama: faturaForm.aciklama.trim(),
        },
        user.id,
      )
      setFaturaForm({ danismanId: '', kategori: 'sahibinden_bedeli', tutar: '', tarih: today(), aciklama: '' })
      showToast('Fatura cari hesaba işlendi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const masraflar = data?.masraflar ?? []

  return (
    <div>
      <p className="mb-5 text-sm text-text-muted">
        Masraflar artık Banka Hareketleri'nden atanıyor — bir çıkış hareketini "Masraf Olarak İşaretle" dediğinde burada
        otomatik listelenir.
      </p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
              <p className="text-xs font-medium text-text-muted">Blokede Bekleyen</p>
              <p className="mt-1 text-lg font-semibold text-sky-700">{tl(ozet.bloke.reduce((s, h) => s + Number(h.tutar), 0))}</p>
              {ozet.bloke.length === 0 ? (
                <p className="mt-1 text-xs text-text-muted">Blokede bekleyen yok.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {ozet.bloke.map((h) => (
                    <li key={h.id} className="text-xs text-text-secondary">
                      {h.opportunityLabel} — {tl(h.tutar)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
              <p className="text-xs font-medium text-text-muted">Bu Ay Toplam Masraf</p>
              <p className="mt-1 text-lg font-semibold text-red-600">{tl(ozet.buAykiMasrafToplam)}</p>
              {Object.keys(ozet.kategoriKirilimi).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {Object.entries(ozet.kategoriKirilimi).map(([kategori, tutar]) => (
                    <li key={kategori} className="text-xs text-text-secondary">
                      {kategoriLabel(kategori)} — {tl(tutar)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-text-muted">Kişi başı genel ofis gideri: {tl(ozet.kisiBasiGenelGider)}</p>
            </div>

            <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
              <p className="text-xs font-medium text-text-muted">Danışman Alacak/Borç</p>
              {ozet.cariOzet.length === 0 ? (
                <p className="mt-1 text-xs text-text-muted">Henüz cari hareket yok.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {ozet.cariOzet.map((d) => (
                    <li key={d.danismanId} className="flex justify-between text-xs">
                      <span className="text-text-secondary">{d.name}</span>
                      <span className={`font-medium ${d.netBakiye >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(d.netBakiye)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {ozet.kazancListesi.length > 0 && (
            <div className="mb-6 rounded-2xl border border-border-default bg-surface-raised p-4">
              <p className="mb-2 text-xs font-medium text-text-muted">Bu Ay Danışman Bazlı Kazanç (onaylanan Ciro Raporları)</p>
              <ul className="space-y-1">
                {ozet.kazancListesi.map((k) => (
                  <li key={k.danismanId} className="flex justify-between text-xs">
                    <span className="text-text-secondary">{k.name}</span>
                    <span className="font-medium text-text-primary">{tl(k.tutar)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Masraf Listesi</h2>
              {masraflar.length === 0 ? (
                <p className="text-sm text-text-muted">Henüz Banka Hareketleri'nden işaretlenmiş bir masraf yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-text-muted">
                        <th className="px-2 py-1.5 font-medium">Tarih</th>
                        <th className="px-2 py-1.5 font-medium">Kategori</th>
                        <th className="px-2 py-1.5 font-medium">Danışman</th>
                        <th className="px-2 py-1.5 font-medium">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masraflar.map((m) => (
                        <tr key={m.id} className="border-t border-border-subtle">
                          <td className="px-2 py-1.5 text-text-secondary">{formatDateOnly(m.createdAt?.slice(0, 10))}</td>
                          <td className="px-2 py-1.5 text-text-secondary">{kategoriLabel(m.tur)}</td>
                          <td className="px-2 py-1.5 text-text-muted">{m.danismanId ? knownUsers[m.danismanId]?.name ?? '—' : 'Genel ofis gideri'}</td>
                          <td className="px-2 py-1.5 font-medium text-text-primary">{tl(m.tutar)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Aylık Danışman Faturası</h2>
              <p className="mb-2 text-xs text-text-muted">Sahibinden ilan bedeli / ofis katılım bedeli — ofisin danışmana kestiği fatura.</p>
              <form onSubmit={handleFaturaSubmit} className="space-y-2">
                <select
                  required
                  value={faturaForm.danismanId}
                  onChange={(e) => setFaturaForm((f) => ({ ...f, danismanId: e.target.value }))}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                >
                  <option value="">Danışman seç</option>
                  {danismanOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  value={faturaForm.kategori}
                  onChange={(e) => setFaturaForm((f) => ({ ...f, kategori: e.target.value }))}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                >
                  <option value="sahibinden_bedeli">Sahibinden İlan Bedeli</option>
                  <option value="ofis_katilim_bedeli">Ofis Katılım Bedeli</option>
                </select>
                <input
                  required
                  inputMode="numeric"
                  value={faturaForm.tutar}
                  onChange={(e) => setFaturaForm((f) => ({ ...f, tutar: formatThousands(e.target.value) }))}
                  placeholder="Tutar (₺)"
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
                <input
                  required
                  type="date"
                  value={faturaForm.tarih}
                  onChange={(e) => setFaturaForm((f) => ({ ...f, tarih: e.target.value }))}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                />
                <input
                  value={faturaForm.aciklama}
                  onChange={(e) => setFaturaForm((f) => ({ ...f, aciklama: e.target.value }))}
                  placeholder="Açıklama (opsiyonel, ör. Ekim 2026)"
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Faturayı Cari Hesaba İşle
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
