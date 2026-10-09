import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { ciroRaporlari as ciroRaporlariProvider, islemMasraflari as islemMasraflariProvider, cariHareketler as cariHareketlerProvider } from '../../lib/dataProvider'
import { MASRAF_TUR_LABELS, canManageMasraflar } from '../../lib/islemMasraflari'
import { formatDateOnly, formatThousands, parseThousands } from '../../lib/format'
import { LoadingState, ErrorState, RestrictedAccess } from '../common/AsyncState'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const today = () => new Date().toISOString().slice(0, 10)

async function loadAll() {
  const raporlar = await ciroRaporlariProvider.list()
  return { raporlar }
}

export default function MasraflarPanel() {
  const { role, user } = useAuth()
  const { showToast } = useToast()
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])

  const [masrafForm, setMasrafForm] = useState({ ciroRaporuId: '', tur: 'tapu_harci', tutar: '', aciklama: '', danismanId: '' })
  const [faturaForm, setFaturaForm] = useState({ danismanId: '', kategori: 'sahibinden_bedeli', tutar: '', tarih: today(), aciklama: '' })
  const [submitting, setSubmitting] = useState(false)

  const danismanOptions = useMemo(
    () => Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi),
    [knownUsers],
  )

  if (!canManageMasraflar(role)) {
    return <RestrictedAccess message="Masraflar sadece broker ve owner rollerine açıktır." />
  }

  const raporlar = data?.raporlar ?? []
  const opportunityLabel = (r) => `${r.islemTarihi ? formatDateOnly(r.islemTarihi) : ''} · ${tl(r.islemTutari)}`.trim()
  const seciliRapor = raporlar.find((r) => r.id === masrafForm.ciroRaporuId)

  async function handleMasrafSubmit(e) {
    e.preventDefault()
    const parsed = parseThousands(masrafForm.tutar)
    if (!masrafForm.ciroRaporuId || parsed === null || parsed <= 0) return
    setSubmitting(true)
    try {
      await islemMasraflariProvider.create(
        {
          ciroRaporuId: masrafForm.ciroRaporuId,
          danismanId: masrafForm.danismanId || null,
          tur: masrafForm.tur,
          aciklama: masrafForm.aciklama.trim(),
          tutar: parsed,
        },
        user.id,
      )
      setMasrafForm({ ciroRaporuId: '', tur: 'tapu_harci', tutar: '', aciklama: '', danismanId: '' })
      showToast('Masraf kaydedildi.', 'success')
      reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <div>
      <p className="mb-5 text-sm text-text-muted">İşleme bağlı masraf ve danışmana kesilen aylık fatura — ikisi de Cari Hesap'a otomatik işlenir.</p>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border-default bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">İşleme Bağlı Masraf</h2>
            <form onSubmit={handleMasrafSubmit} className="space-y-2">
              <select
                required
                value={masrafForm.ciroRaporuId}
                onChange={(e) => setMasrafForm((f) => ({ ...f, ciroRaporuId: e.target.value, danismanId: '' }))}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              >
                <option value="">İşlem (Ciro Raporu) seç</option>
                {raporlar.map((r) => (
                  <option key={r.id} value={r.id}>
                    {opportunityLabel(r)}
                  </option>
                ))}
              </select>
              <select
                value={masrafForm.tur}
                onChange={(e) => setMasrafForm((f) => ({ ...f, tur: e.target.value }))}
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
              >
                {Object.entries(MASRAF_TUR_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                required
                inputMode="numeric"
                value={masrafForm.tutar}
                onChange={(e) => setMasrafForm((f) => ({ ...f, tutar: formatThousands(e.target.value) }))}
                placeholder="Tutar (₺)"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
              {seciliRapor && (seciliRapor.katilimcilar ?? []).length > 0 && (
                <select
                  value={masrafForm.danismanId}
                  onChange={(e) => setMasrafForm((f) => ({ ...f, danismanId: e.target.value }))}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary"
                >
                  <option value="">Kimseden düşülmesin (sadece dosya masrafı)</option>
                  {seciliRapor.katilimcilar.map((k) => (
                    <option key={k.danismanId} value={k.danismanId}>
                      {knownUsers[k.danismanId]?.name ?? '—'} hak edişinden düşülsün
                    </option>
                  ))}
                </select>
              )}
              <input
                value={masrafForm.aciklama}
                onChange={(e) => setMasrafForm((f) => ({ ...f, aciklama: e.target.value }))}
                placeholder="Açıklama (opsiyonel)"
                className="w-full rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Masrafı Kaydet
              </button>
            </form>
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
      )}
    </div>
  )
}
