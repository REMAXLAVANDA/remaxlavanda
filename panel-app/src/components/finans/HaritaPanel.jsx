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
import { formatDateOnly } from '../../lib/format'
import { ROLES } from '../../lib/roles'
import { ISLEM_TIPI_LABELS as CIRO_ISLEM_TIPI_LABELS } from '../../lib/ciroRaporlari'
import { ISLEM_TIPI_LABELS as PORTFOY_ISLEM_TIPI_LABELS } from '../../lib/opportunities'
import { LoadingState, ErrorState } from '../common/AsyncState'
import ManuelHaritaKaydiModal from './ManuelHaritaKaydiModal'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

// Satış (gerçekleşmiş) pini yeşil, portföy (hâlâ satışta) pini mavi, broker'ın
// elle eklediği manuel kayıt amber — tasarım sistemindeki tint-green/
// remax-blue/tint-amber token'larıyla aynı mantık (bkz. bankaHareketleri.js
// BANKA_HAREKETI_DURUM_STYLES notu).
function pinIcon(kaynak) {
  const renk = kaynak === 'satis' ? '#16a34a' : kaynak === 'manuel' ? '#d97706' : '#1d4ed8'
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

const SATIS_ICON = pinIcon('satis')
const PORTFOY_ICON = pinIcon('portfoy')
const MANUEL_ICON = pinIcon('manuel')
const VARSAYILAN_MERKEZ = [40.9833, 27.5167]

const DURUM_LABELS = { acik: 'Açık', claimed: 'Üstlenilmiş', onaylandi: 'Satıldı' }

async function loadAll() {
  return { kayitlar: await haritaProvider.listKayitlar() }
}

const PIN_ICONS = { satis: SATIS_ICON, portfoy: PORTFOY_ICON, manuel: MANUEL_ICON }

function durumMetni(k) {
  if (k.kaynak === 'satis') return 'Satıldı'
  if (k.kaynak === 'manuel') return 'Manuel kayıt'
  return DURUM_LABELS[k.durum] ?? k.durum
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

  const danismanOptions = useMemo(
    () => Object.values(knownUsers).filter((u) => (!u.role || u.role === 'danisman') && !u.testHesabi),
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
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#16a34a' }} /> Gerçekleşmiş satış
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#1d4ed8' }} /> Aktif portföy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#d97706' }} /> Manuel kayıt
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {kayitlar.map((k) => (
            <Marker key={`${k.kaynak}-${k.id}`} position={[k.lat, k.lng]} icon={PIN_ICONS[k.kaynak] ?? PORTFOY_ICON}>
              <Popup>
                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-text-primary">{k.siteAdi || 'Site adı yok'}</p>
                  <p>{durumMetni(k)}</p>
                  <p>{k.danismanAdi || '—'}</p>
                  <p>{tl(k.tutar)}</p>
                  <p>{formatDateOnly(k.tarih)}</p>
                  {k.islemTipi && (
                    <p className="text-text-muted">
                      {(k.kaynak === 'satis' ? CIRO_ISLEM_TIPI_LABELS : PORTFOY_ISLEM_TIPI_LABELS)[k.islemTipi] ?? k.islemTipi}
                    </p>
                  )}
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
