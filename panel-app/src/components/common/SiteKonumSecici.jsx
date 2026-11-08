import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { LOCATIONIQ_KEY } from '../../lib/env'
import { loadGooglePlaces } from '../../lib/googlePlacesLoader'

// Vite/bundler'lar Leaflet'in varsayılan pin görselini kendi yoluyla
// bulamıyor (bilinen bir Leaflet+bundler sorunu) — ikon elle ayarlanmazsa
// pin görünmez/kırık çıkar.
const PIN_ICON = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// RE/MAX Lavanda'nın çalıştığı bölge — henüz pin konulmamışsa harita burada açılır.
const VARSAYILAN_MERKEZ = [40.9833, 27.5167]
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
// Nominatim kullanım kuralı: kim/ne amaçla çağırdığını belirten bir referer/
// user-agent ister — tarayıcıdan atılan isteklerde Origin zaten gidiyor,
// ayrıca kendi uygulama adımızı da query'ye eklemek nazik bir pratik.
const NOMINATIM_HEADERS = { Accept: 'application/json' }

function AramaSonucunaUc({ hedef }) {
  const map = useMap()
  useEffect(() => {
    if (hedef) map.flyTo(hedef, 17)
  }, [hedef, map])
  return null
}

function TiklamaDinleyici({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

async function nominatimTersCevir(lat, lng) {
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { headers: NOMINATIM_HEADERS })
  if (!res.ok) throw new Error('Adres çözümlenemedi')
  const data = await res.json()
  return data.display_name ?? null
}

// Ciro Raporu formu VE Portföy (Fırsat) formu ortak kullanıyor — Site/Bina
// Adı + haritadan pin + adres arama, TEK bileşende (bkz. broker 2026-11-07
// pasted spec: "siteler/binalar tablosu açma, site_adi üzerinden eşleştir").
// Seçilen konumun adresi (Nominatim ters-çevirme) kutunun altında onay
// satırı olarak gösterilir ki danışman yanlış yere tıklarsa fark etsin —
// bu metin SADECE görsel onay, ayrıca kaydedilmiyor (lat/lng yeterli).
export default function SiteKonumSecici({ siteAdi, onSiteAdiChange, lat, lng, onLocationChange, required = false }) {
  const [secilenAdres, setSecilenAdres] = useState(null)
  const [adresYukleniyor, setAdresYukleniyor] = useState(false)
  const [ucusHedefi, setUcusHedefi] = useState(null)
  const [aramaHatali, setAramaHatali] = useState(false)
  const aramaKutusuRef = useRef(null)

  const pinVar = lat != null && lng != null
  const merkez = pinVar ? [lat, lng] : VARSAYILAN_MERKEZ

  // Kayıtlı bir lat/lng ile açılıyorsa (düzenleme) adresi göstermek için
  // bir kerelik ters-çevirme — sadece lat/lng değişince, yazarken değil.
  useEffect(() => {
    if (!pinVar) {
      setSecilenAdres(null)
      return
    }
    let iptal = false
    setAdresYukleniyor(true)
    nominatimTersCevir(lat, lng)
      .then((adres) => {
        if (!iptal) setSecilenAdres(adres)
      })
      .catch(() => {
        if (!iptal) setSecilenAdres(null)
      })
      .finally(() => {
        if (!iptal) setAdresYukleniyor(false)
      })
    return () => {
      iptal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  // Arama kutusu artık Nominatim değil, Google Places Autocomplete (2026-
  // 11-08 broker kararı: Nominatim site/bina isimlerini bulamıyordu).
  // Google'ın kendi hazır arama kutusu (web component) container'a
  // ekleniyor — oturum/ücretlendirme takibini kendisi hallediyor.
  // Harita görseli (LocationIQ) ve haritaya tıklayıp pin koyma BUNDAN
  // bağımsız, değişmedi.
  useEffect(() => {
    let iptal = false
    let eleman = null
    let dinleyici = null

    loadGooglePlaces()
      .then((googleMaps) => {
        if (iptal || !aramaKutusuRef.current) return
        eleman = new googleMaps.places.PlaceAutocompleteElement({
          includedRegionCodes: ['tr'],
        })
        dinleyici = async ({ placePrediction }) => {
          try {
            const place = placePrediction.toPlace()
            await place.fetchFields({ fields: ['location'] })
            const yeniLat = place.location.lat()
            const yeniLng = place.location.lng()
            onLocationChange(yeniLat, yeniLng)
            setUcusHedefi([yeniLat, yeniLng])
          } catch {
            // Konum alınamadı — kullanıcı haritadan elle tıklayarak devam edebilir.
          }
        }
        eleman.addEventListener('gmp-select', dinleyici)
        aramaKutusuRef.current.appendChild(eleman)
      })
      .catch(() => {
        if (!iptal) setAramaHatali(true)
      })

    return () => {
      iptal = true
      if (eleman && dinleyici) eleman.removeEventListener('gmp-select', dinleyici)
      eleman?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleHaritaTiklandi(yeniLat, yeniLng) {
    onLocationChange(yeniLat, yeniLng)
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs text-ink-500">
          Site/Bina Adı {required && <span className="text-red-600">* zorunlu</span>}
        </label>
        <input
          required={required}
          value={siteAdi}
          onChange={(e) => onSiteAdiChange(e.target.value)}
          placeholder="ör. Yeşil Vadi Sitesi A Blok"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">
          Harita Konumu {required && <span className="text-red-600">* zorunlu</span>}
        </label>
        <div className="relative">
          {aramaHatali ? (
            <p className="rounded-lg border border-ink-200 px-3 py-2 text-xs text-ink-400">
              Arama şu an kullanılamıyor — haritadan doğrudan tıklayarak seç.
            </p>
          ) : (
            <div ref={aramaKutusuRef} />
          )}
        </div>

        <div className="mt-2 h-[260px] overflow-hidden rounded-lg border border-ink-200">
          <MapContainer center={merkez} zoom={pinVar ? 17 : 13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://locationiq.com/">LocationIQ</a>'
              url={`https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`}
            />
            <TiklamaDinleyici onClick={handleHaritaTiklandi} />
            <AramaSonucunaUc hedef={ucusHedefi} />
            {pinVar && <Marker position={merkez} icon={PIN_ICON} />}
          </MapContainer>
        </div>

        {pinVar && (
          <p className="mt-1 text-xs text-ink-500">
            {adresYukleniyor ? 'Adres çözümleniyor...' : secilenAdres ? <>Seçtiğin konum: {secilenAdres}</> : 'Konum seçildi.'}
          </p>
        )}
      </div>
    </div>
  )
}
