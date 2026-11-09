import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Plus } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../context/AuthContext'
import { useKnownUsers } from '../../context/UsersContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncList } from '../../hooks/useAsyncList'
import { harita as haritaProvider } from '../../lib/dataProvider'
import { formatDateOnly, sortByName } from '../../lib/format'
import { LOCATIONIQ_KEY } from '../../lib/env'
import { ROLES } from '../../lib/roles'
import { ISLEM_TIPI_LABELS as CIRO_ISLEM_TIPI_LABELS, RAPOR_KATEGORI_LABELS } from '../../lib/ciroRaporlari'
import { ISLEM_TIPI_LABELS as PORTFOY_ISLEM_TIPI_LABELS } from '../../lib/opportunities'
import { LoadingState, ErrorState } from '../common/AsyncState'
import ManuelHaritaKaydiModal from './ManuelHaritaKaydiModal'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

// Pin rengi emlak tipine göre (broker, 2026-11-09: danışman araştırma
// yaparken konut/ticari/arsa ayrımını haritada direkt görmeli) —
// gerçekleşmiş satış/aktif portföy ayrımı artık renkte değil, popup'ın en
// üstündeki "SATILDI"/"AKTİF PORTFÖY" etiketinde (bkz. durumBasligi).
const KATEGORI_RENK = { konut: '#1d4ed8', ticari: '#7c3aed', arsa: '#16a34a' }
const KATEGORI_VARSAYILAN_RENK = '#6b7280'

function pinIcon(kategori) {
  const renk = KATEGORI_RENK[kategori] ?? KATEGORI_VARSAYILAN_RENK
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36">
    <path fill="${renk}" stroke="white" stroke-width="1.5" d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 23 13 23s13-13.5 13-23C26 5.8 20.2 0 13 0z"/>
    <circle cx="13" cy="13" r="5" fill="white"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -32],
  })
}

const PIN_ICONS = { konut: pinIcon('konut'), ticari: pinIcon('ticari'), arsa: pinIcon('arsa') }
const VARSAYILAN_ICON = pinIcon(null)
const VARSAYILAN_MERKEZ = [40.9833, 27.5167]

const KATEGORI_LABELS = { ...RAPOR_KATEGORI_LABELS, diger: 'Diğer' }

async function loadAll() {
  return { kayitlar: await haritaProvider.listKayitlar() }
}

// Danışman araştırma yaparken önce bunu görmeli: bu gerçekten satılmış mı,
// hâlâ satışta olan bir portföy mü, yoksa elle girilmiş bilgi notu mu —
// tarih veya renkten tahmin etmesin, direkt yazsın (broker, 2026-11-09:
// "sadece gerçekleşen işlem diye uyarı olmalı").
function durumBasligi(k) {
  if (k.kaynak === 'satis') return 'SATILDI'
  if (k.kaynak === 'manuel') return 'Manuel kayıt'
  return 'AKTİF PORTFÖY'
}

// Broker, 2026-11-07 (pasted spec): "ofis genelinde hangi bölgede ne
// sattığımızı gösteren bir harita" — herkese açık (Finans.jsx'te
// showBankaTab filtresinden muaf tutuldu). Lat/lng'si olmayan eski
// kayıtlar burada hiç görünmez — bunun yerine broker/owner "Manuel Kayıt
// Ekle" ile elle ekleyebiliyor (broker, 2026-11-08, bkz. migration
// 20261108100000 — tam bir Ciro Raporu değil, sadece bilgi amaçlı).
export default function HaritaPanel() {
  const { role, user } = useAuth()
  const { knownUsers } = useKnownUsers()
  const { showToast } = useToast()
  const isManager = role === ROLES.BROKER || role === ROLES.OWNER
  const { data, loading, error, reload } = useAsyncList(loadAll, [])
  const kayitlar = data?.kayitlar ?? []
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Broker de kendi işlemini kaydedebilmek için seçilebilir — ama Lig
  // sıralamaları gibi performans listelerinde YAYINLANMAK istemiyor (bkz.
  // OperasyonTab.jsx'teki aynı ayrım, broker 2026-11-08).
  const danismanOptions = useMemo(
    () => sortByName(Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman' || u.role === 'broker') && !u.testHesabi)),
    [knownUsers],
  )

  const merkez = useMemo(() => {
    if (kayitlar.length === 0) return VARSAYILAN_MERKEZ
    return [kayitlar[0].lat, kayitlar[0].lng]
  }, [kayitlar])

  async function handleAddSubmit(payload) {
    setSubmitting(true)
    try {
      await haritaProvider.manuelKayitEkle(payload, user.id)
      setShowAddModal(false)
      showToast('Manuel kayıt eklendi.', 'success')
      await reload()
    } catch (err) {
      showToast(err.message ?? 'Kaydedilemedi, tekrar dene.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await haritaProvider.manuelKayitSil(id)
      showToast('Kayıt silindi.', 'success')
      await reload()
    } catch (err) {
      showToast(err.message ?? 'Silinemedi, tekrar dene.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <LoadingState label="Harita yükleniyor..." />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KATEGORI_RENK.konut }} /> Konut
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KATEGORI_RENK.ticari }} /> Ticari
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KATEGORI_RENK.arsa }} /> Arsa/Arazi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KATEGORI_VARSAYILAN_RENK }} /> Kategori girilmemiş
        </span>
        <span className={isManager ? '' : 'ml-auto'}>{kayitlar.length} kayıt</span>
        {isManager && (
          <button
            onClick={() => setShowAddModal(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            <Plus size={14} /> Manuel Kayıt Ekle
          </button>
        )}
      </div>

      <div className="h-[560px] overflow-hidden rounded-2xl border border-border-default">
        <MapContainer center={merkez} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://locationiq.com/">LocationIQ</a>'
            url={`https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`}
          />
          {kayitlar.map((k) => (
            <Marker key={`${k.kaynak}-${k.id}`} position={[k.lat, k.lng]} icon={PIN_ICONS[k.kategori] ?? VARSAYILAN_ICON}>
              <Popup>
                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-text-primary">{durumBasligi(k)}</p>
                  <p>{k.siteAdi || 'Site adı yok'}</p>
                  {k.islemTipi && (
                    <p>
                      {(k.kaynak === 'portfoy' ? PORTFOY_ISLEM_TIPI_LABELS : CIRO_ISLEM_TIPI_LABELS)[k.islemTipi] ?? k.islemTipi}
                    </p>
                  )}
                  <p className="text-text-muted">{k.kategori ? (KATEGORI_LABELS[k.kategori] ?? k.kategori) : 'Kategori girilmemiş'}</p>
                  {(k.m2 != null || k.odaSayisi) && (
                    <p className="text-text-muted">{[k.m2 != null ? `${k.m2} m²` : null, k.odaSayisi || null].filter(Boolean).join(' · ')}</p>
                  )}
                  <p>{k.danismanAdi || '—'}</p>
                  <p>{tl(k.tutar)}</p>
                  <p>{formatDateOnly(k.tarih)}</p>
                  {isManager && k.kaynak === 'manuel' && (
                    <button
                      disabled={deletingId === k.id}
                      onClick={() => handleDelete(k.id)}
                      className="mt-1 font-medium text-brand-700 hover:underline disabled:opacity-50"
                    >
                      {deletingId === k.id ? 'Siliniyor...' : 'Kaydı sil'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {showAddModal && (
        <ManuelHaritaKaydiModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
          submitting={submitting}
          danismanOptions={danismanOptions}
        />
      )}
    </div>
  )
}
