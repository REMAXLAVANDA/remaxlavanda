import { GOOGLE_MAPS_KEY } from './env'

// SiteKonumSecici birden fazla yerde aynı anda kullanılabiliyor (Ciro
// Raporu formu + Manuel Kayıt formu) — script'in sadece 1 kez eklenmesi
// için modül seviyesinde tek bir promise'de tutuluyor (2026-11-08,
// Nominatim'den Google Places Autocomplete'e geçiş).
let loadPromise = null

export function loadGooglePlaces() {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places?.PlaceAutocompleteElement) {
      resolve(window.google.maps)
      return
    }
    if (!GOOGLE_MAPS_KEY) {
      reject(new Error('Google Places anahtarı tanımlı değil'))
      return
    }
    window.__onGooglePlacesReady = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async&callback=__onGooglePlacesReady`
    script.async = true
    script.onerror = () => reject(new Error('Google Places yüklenemedi'))
    document.head.appendChild(script)
  })

  return loadPromise
}
