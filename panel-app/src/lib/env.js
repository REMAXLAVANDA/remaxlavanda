// Ortam değişkenleri tek yerden okunur — başka hiçbir dosya doğrudan
// import.meta.env'e dokunmaz. Böylece "hangi mod aktif" sorusunun tek
// cevabı burada olur.
//
// GÜVENLİK: Burada SADECE public/anon değerler olabilir. service_role key
// veya DB şifresi gibi gizli değerler asla frontend koduna eklenmemeli —
// bkz. .env.example'daki uyarı.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Harita tile sağlayıcı (LocationIQ) — domain-kısıtlı public key, gizli
// değil (bkz. 2026-11-08 broker kararı: MapTiler/Stadia Maps'in ücretsiz
// planları ticari kullanıma kapalı, LocationIQ'ninki açık).
export const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY

// Adres/site arama (Google Places Autocomplete) — HTTP referrer (domain)
// kısıtlı key, gizli değil (bkz. 2026-11-08 broker kararı: Nominatim site/
// bina isimlerini bulamıyordu). Harita görseli (LocationIQ) buna dahil
// DEĞİL, sadece arama kutusu için.
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

export const IS_PROD = import.meta.env.PROD
export const IS_DEV = import.meta.env.DEV

// Development'ta .env ile mock/supabase arasında geçiş yapılabilir; ama
// production build'de KURAL GEREĞİ her zaman supabase zorlanır — kullanıcı
// yanlışlıkla (veya birisi bilerek) VITE_DATA_SOURCE=mock ile prod build
// alırsa bile mock veri canlıya çıkamaz.
const requestedSource = import.meta.env.VITE_DATA_SOURCE ?? 'mock'
export const DATA_SOURCE = IS_PROD ? 'supabase' : requestedSource
export const USE_SUPABASE = DATA_SOURCE === 'supabase'

export const HAS_SUPABASE_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
