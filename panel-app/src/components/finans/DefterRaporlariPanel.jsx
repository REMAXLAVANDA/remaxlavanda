import { useMemo, useState } from 'react'
import { useKnownUsers } from '../../context/UsersContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { defterKayitlari as defterKayitlariProvider, kasalar as kasalarProvider } from '../../lib/dataProvider'
import { aylikGelirGider, cariBakiyeleri, karZarar, kdvOzeti, nakitAkisi } from '../../lib/defterRaporlari'
import { downloadCsv } from '../../lib/csv'
import { isWithinRange } from '../../lib/dateRange'
import { LoadingState, ErrorState } from '../common/AsyncState'
import DateRangeFilter from '../common/DateRangeFilter'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const AY_LABELS = { '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan', '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos', '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık' }
function ayEtiketi(ayAnahtari) {
  const [yil, ay] = (ayAnahtari || '').split('-')
  return ay ? `${AY_LABELS[ay] ?? ay} ${yil}` : '—'
}

async function loadAll() {
  const [kayitlar, kasalar] = await Promise.all([defterKayitlariProvider.list(), kasalarProvider.list()])
  return { kayitlar, kasalar }
}

const SEKMELER = [
  { key: 'cari', label: 'Cari Bakiyeleri' },
  { key: 'gelirGider', label: 'Aylık Gelir-Gider' },
  { key: 'karZarar', label: 'Kâr-Zarar' },
  { key: 'nakit', label: 'Nakit Akışı' },
  { key: 'kdv', label: 'KDV Özeti' },
]

// 2. Aşama Adım 5 (docs/muhasebe-tasarim.md madde h) — bu tablonun
// kaynağı TAMAMEN defter_kayitlari (Adım 1-2'nin köprüsü). Var olan
// Cari Hesap/Kasa Raporu/Kârlılık ekranları DEĞİŞMEDİ, bunlar o
// ekranların YANINA eklenen, tüm kaynakları tek yerde toplayan EK bir
// görünüm. Danışman bazında kârlılık raporu (madde h.6) zaten var olan
// Kârlılık sekmesinde (KarlilikPanel) — burada tekrarlanmıyor.
export default function DefterRaporlariPanel() {
  const { knownUsers } = useKnownUsers()
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const [sekme, setSekme] = useState('cari')
  const [tarihFiltre, setTarihFiltre] = useState({ dateRange: '4a', customFrom: '', customTo: '' })

  const kayitlar = data?.kayitlar ?? []
  const kasalar = data?.kasalar ?? []
  const kasaAdi = useMemo(() => Object.fromEntries(kasalar.map((k) => [k.id, k.ad])), [kasalar])

  // Cari bakiyeleri bir BAKİYE (bugünkü durum), Cari Hesap ekranıyla AYNI
  // mantık — tarih filtresinden bağımsız, hep tüm geçmiş.
  const cari = useMemo(() => cariBakiyeleri(kayitlar), [kayitlar])

  const filtreliKayitlar = useMemo(
    () => kayitlar.filter((k) => isWithinRange(k.tarih, tarihFiltre.dateRange, tarihFiltre.customFrom, tarihFiltre.customTo)),
    [kayitlar, tarihFiltre],
  )
  const gelirGider = useMemo(() => aylikGelirGider(filtreliKayitlar), [filtreliKayitlar])
  const kz = useMemo(() => karZarar(filtreliKayitlar), [filtreliKayitlar])
  const nakit = useMemo(() => nakitAkisi(filtreliKayitlar), [filtreliKayitlar])
  const kdv = useMemo(() => kdvOzeti(filtreliKayitlar), [filtreliKayitlar])

  return (
    <div>
      <p className="mb-4 text-sm text-text-muted">
        Tüm para hareketlerinin (banka, genel gider, tedarikçi, ortak hesabı, kasa transferi, danışman ödemesi, emanet) tek defterden özeti — var olan ekranları değiştirmiyor, onlara ek.
      </p>

      <div className="mb-5 flex gap-1 border-b border-border-subtle">
        {SEKMELER.map((s) => (
          <button
            key={s.key}
            onClick={() => setSekme(s.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              sekme === s.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && sekme === 'cari' && (
        <CariBakiyeleriBolumu cari={cari} knownUsers={knownUsers} />
      )}

      {!loading && !error && sekme !== 'cari' && (
        <div className="mb-4">
          <DateRangeFilter value={tarihFiltre} onChange={setTarihFiltre} />
        </div>
      )}

      {!loading && !error && sekme === 'gelirGider' && <GelirGiderBolumu rows={gelirGider} />}
      {!loading && !error && sekme === 'karZarar' && <KarZararBolumu rows={kz} />}
      {!loading && !error && sekme === 'nakit' && <NakitAkisiBolumu rows={nakit} kasaAdi={kasaAdi} />}
      {!loading && !error && sekme === 'kdv' && <KdvOzetiBolumu veri={kdv} />}
    </div>
  )
}

function Tablo({ basliklar, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border-default bg-surface-raised">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-text-muted">
            {basliklar.map((b) => (
              <th key={b} className="px-3 py-2 font-medium">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function ExportButonu({ filename, columns, rows }) {
  return (
    <button
      onClick={() => downloadCsv(filename, columns, rows)}
      disabled={rows.length === 0}
      className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-sunken disabled:opacity-50"
    >
      Excel'e Aktar (CSV)
    </button>
  )
}

function CariBakiyeleriBolumu({ cari, knownUsers }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Danışman Carisi</h3>
          <ExportButonu
            filename="danisman-carisi.csv"
            columns={[
              { label: 'Danışman', value: (r) => knownUsers[r.hesapId]?.name ?? '—' },
              { label: 'Borç', value: 'borc' },
              { label: 'Alacak', value: 'alacak' },
              { label: 'Bakiye', value: 'bakiye' },
            ]}
            rows={cari.danisman}
          />
        </div>
        <Tablo basliklar={['Danışman', 'Borç', 'Alacak', 'Bakiye']}>
          {cari.danisman.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-text-muted">Kayıt yok.</td>
            </tr>
          )}
          {cari.danisman.map((r) => (
            <tr key={r.hesapId} className="border-t border-border-subtle">
              <td className="px-3 py-2 text-text-primary">{knownUsers[r.hesapId]?.name ?? '—'}</td>
              <td className="px-3 py-2">{tl(r.borc)}</td>
              <td className="px-3 py-2">{tl(r.alacak)}</td>
              <td className={`px-3 py-2 font-semibold ${r.bakiye >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(r.bakiye)}</td>
            </tr>
          ))}
        </Tablo>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Tedarikçi Carisi</h3>
          <ExportButonu
            filename="tedarikci-carisi.csv"
            columns={[
              { label: 'Tedarikçi', value: 'ad' },
              { label: 'Borç', value: 'borc' },
              { label: 'Alacak', value: 'alacak' },
              { label: 'Bakiye', value: 'bakiye' },
            ]}
            rows={cari.tedarikci}
          />
        </div>
        <Tablo basliklar={['Tedarikçi', 'Borç', 'Alacak', 'Bakiye']}>
          {cari.tedarikci.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-text-muted">Kayıt yok.</td>
            </tr>
          )}
          {cari.tedarikci.map((r) => (
            <tr key={r.hesapId} className="border-t border-border-subtle">
              <td className="px-3 py-2 text-text-primary">{r.ad ?? '—'}</td>
              <td className="px-3 py-2">{tl(r.borc)}</td>
              <td className="px-3 py-2">{tl(r.alacak)}</td>
              <td className={`px-3 py-2 font-semibold ${r.bakiye > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{tl(r.bakiye)}</td>
            </tr>
          ))}
        </Tablo>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Ortak Carisi</h3>
        <Tablo basliklar={['Ortak', 'Koyma', 'Çekiş', 'Bakiye']}>
          {cari.ortak.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-3 text-text-muted">Kayıt yok.</td>
            </tr>
          )}
          {cari.ortak.map((r) => (
            <tr key={r.hesapId} className="border-t border-border-subtle">
              <td className="px-3 py-2 text-text-primary">{knownUsers[r.hesapId]?.name ?? '—'}</td>
              <td className="px-3 py-2">{tl(r.borc)}</td>
              <td className="px-3 py-2">{tl(r.alacak)}</td>
              <td className={`px-3 py-2 font-semibold ${r.bakiye >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(r.bakiye)}</td>
            </tr>
          ))}
        </Tablo>
      </div>
    </div>
  )
}

const HESAP_TIPI_LABELS = { gelir: 'Gelir', gider: 'Gider' }

function GelirGiderBolumu({ rows }) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ExportButonu
          filename="aylik-gelir-gider.csv"
          columns={[
            { label: 'Ay', value: (r) => ayEtiketi(r.ay) },
            { label: 'Tür', value: (r) => HESAP_TIPI_LABELS[r.hesapTip] },
            { label: 'Kategori', value: 'kategori' },
            { label: 'Tutar', value: 'tutar' },
          ]}
          rows={rows}
        />
      </div>
      <Tablo basliklar={['Ay', 'Tür', 'Kategori', 'Tutar']}>
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="px-3 py-3 text-text-muted">Bu aralıkta kayıt yok.</td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border-subtle">
            <td className="px-3 py-2 text-text-secondary">{ayEtiketi(r.ay)}</td>
            <td className={`px-3 py-2 font-medium ${r.hesapTip === 'gelir' ? 'text-emerald-700' : 'text-red-600'}`}>{HESAP_TIPI_LABELS[r.hesapTip]}</td>
            <td className="px-3 py-2 text-text-secondary">{r.kategori ?? '—'}</td>
            <td className="px-3 py-2 font-medium text-text-primary">{tl(r.tutar)}</td>
          </tr>
        ))}
      </Tablo>
    </div>
  )
}

function KarZararBolumu({ rows }) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ExportButonu
          filename="kar-zarar.csv"
          columns={[
            { label: 'Ay', value: (r) => ayEtiketi(r.ay) },
            { label: 'Gelir', value: 'gelir' },
            { label: 'Gider', value: 'gider' },
            { label: 'Kâr/Zarar', value: 'kar' },
            { label: 'Kümülatif', value: 'kumulatifKar' },
          ]}
          rows={rows}
        />
      </div>
      <Tablo basliklar={['Ay', 'Gelir', 'Gider', 'Kâr/Zarar', 'Kümülatif']}>
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-3 py-3 text-text-muted">Bu aralıkta kayıt yok.</td>
          </tr>
        )}
        {rows.map((r) => (
          <tr key={r.ay} className="border-t border-border-subtle">
            <td className="px-3 py-2 text-text-secondary">{ayEtiketi(r.ay)}</td>
            <td className="px-3 py-2 text-emerald-700">{tl(r.gelir)}</td>
            <td className="px-3 py-2 text-red-600">{tl(r.gider)}</td>
            <td className={`px-3 py-2 font-semibold ${r.kar >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(r.kar)}</td>
            <td className={`px-3 py-2 font-semibold ${r.kumulatifKar >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(r.kumulatifKar)}</td>
          </tr>
        ))}
      </Tablo>
    </div>
  )
}

function NakitAkisiBolumu({ rows, kasaAdi }) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ExportButonu
          filename="nakit-akisi.csv"
          columns={[
            { label: 'Ay', value: (r) => ayEtiketi(r.ay) },
            { label: 'Kasa', value: (r) => kasaAdi[r.kasaId] ?? '—' },
            { label: 'Giriş', value: 'giris' },
            { label: 'Çıkış', value: 'cikis' },
            { label: 'Net', value: 'net' },
          ]}
          rows={rows}
        />
      </div>
      <Tablo basliklar={['Ay', 'Kasa', 'Giriş', 'Çıkış', 'Net']}>
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className="px-3 py-3 text-text-muted">Bu aralıkta kayıt yok.</td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border-subtle">
            <td className="px-3 py-2 text-text-secondary">{ayEtiketi(r.ay)}</td>
            <td className="px-3 py-2 text-text-primary">{kasaAdi[r.kasaId] ?? '—'}</td>
            <td className="px-3 py-2 text-emerald-700">{tl(r.giris)}</td>
            <td className="px-3 py-2 text-red-600">{tl(r.cikis)}</td>
            <td className={`px-3 py-2 font-semibold ${r.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(r.net)}</td>
          </tr>
        ))}
      </Tablo>
    </div>
  )
}

function KdvOzetiBolumu({ veri }) {
  return (
    <div>
      <p className="mb-3 text-xs text-text-muted">
        Bilgi amaçlı özet — resmi beyanname değildir, mali müşavire referans içindir.
        {veri.kdvsizSatirSayisi > 0 && ` ${veri.kdvsizSatirSayisi} gelir/gider kaydında KDV tutarı hiç girilmemiş, bu rapora dahil değil.`}
      </p>
      <div className="mb-2 flex justify-end">
        <ExportButonu
          filename="kdv-ozeti.csv"
          columns={[
            { label: 'Ay', value: (r) => ayEtiketi(r.ay) },
            { label: 'Gelir KDV\'si', value: 'gelirKdvsi' },
            { label: 'Gider KDV\'si', value: 'giderKdvsi' },
            { label: 'Net', value: 'net' },
          ]}
          rows={veri.aylar}
        />
      </div>
      <Tablo basliklar={['Ay', "Gelir KDV'si", "Gider KDV'si", 'Net']}>
        {veri.aylar.length === 0 && (
          <tr>
            <td colSpan={4} className="px-3 py-3 text-text-muted">Bu aralıkta KDV'li kayıt yok.</td>
          </tr>
        )}
        {veri.aylar.map((r) => (
          <tr key={r.ay} className="border-t border-border-subtle">
            <td className="px-3 py-2 text-text-secondary">{ayEtiketi(r.ay)}</td>
            <td className="px-3 py-2 text-emerald-700">{tl(r.gelirKdvsi)}</td>
            <td className="px-3 py-2 text-red-600">{tl(r.giderKdvsi)}</td>
            <td className={`px-3 py-2 font-semibold ${r.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tl(r.net)}</td>
          </tr>
        ))}
      </Tablo>
    </div>
  )
}
