import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

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

async function nominatimAra(sorgu) {
  const url = `${NOMINATIM_BASE}/search?format=json&limit=5&countrycodes=tr&q=${encodeURIComponent(sorgu)}`
  const res = await fetch(url, { headers: NOMINATIM_HEADERS })
  if (!res.ok) throw new Error('Arama başarısız')
  return res.json()
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
  const [aramaMetni, setAramaMetni] = useState('')
  const [aramaSonuclari, setAramaSonuclari] = useState([])
  const [aramaYukleniyor, setAramaYukleniyor] = useState(false)
  const [secilenAdres, setSecilenAdres] = useState(null)
  const [adresYukleniyor, setAdresYukleniyor] = useState(false)
  const [ucusHedefi, setUcusHedefi] = useState(null)
  const debounceRef = useRef(null)

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

  function handleAramaDegisti(deger) {
    setAramaMetni(deger)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (deger.trim().length < 3) {
      setAramaSonuclari([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setAramaYukleniyor(true)
      try {
        const sonuclar = await nominatimAra(deger.trim())
        setAramaSonuclari(sonuclar)
      } catch {
        setAramaSonuclari([])
      } finally {
        setAramaYukleniyor(false)
      }
    }, 500)
  }

  function handleSonucSec(sonuc) {
    const yeniLat = Number(sonuc.lat)
    const yeniLng = Number(sonuc.lon)
    onLocationChange(yeniLat, yeniLng)
    setSecilenAdres(sonuc.display_name)
    setAramaSonuclari([])
    setAramaMetni('')
    setUcusHedefi([yeniLat, yeniLng])
  }

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
          <input
            value={aramaMetni}
            onChange={(e) => handleAramaDegisti(e.target.value)}
            placeholder="Adres yaz, haritayı oraya götür (opsiyonel) — ya da doğrudan haritadan tıkla"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
          {aramaYukleniyor && <p className="mt-1 text-xs text-ink-400">Aranıyor...</p>}
          {aramaSonuclari.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg">
              {aramaSonuclari.map((sonuc) => (
                <button
                  key={sonuc.place_id}
                  type="button"
                  onClick={() => handleSonucSec(sonuc)}
                  className="block w-full px-3 py-2 text-left text-xs text-ink-700 hover:bg-ink-50"
                >
                  {sonuc.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 h-[260px] overflow-hidden rounded-lg border border-ink-200">
          <MapContainer center={merkez} zoom={pinVar ? 17 : 13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
