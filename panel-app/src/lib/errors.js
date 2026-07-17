// Supabase'den dönen ham hatalar (Postgres kodu, SQL detayları, RLS policy
// isimleri vb.) SON KULLANICIYA hiçbir zaman doğrudan gösterilmez — bu
// dosya her hatayı bilinen bir "kind"e ve Türkçe, güvenli bir mesaja çevirir.
// Teknik detay sadece development konsoluna (mapSupabaseError içinde) yazılır,
// kullanıcı verisi (isim/telefon/e-posta) LOGLANMAZ.

export class ApiError extends Error {
  constructor(kind, message, cause) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.cause = cause
  }
}

const NETWORK_MESSAGE = 'Bağlantı hatası oluştu, internet bağlantını kontrol edip tekrar dene.'
const TIMEOUT_MESSAGE = 'İstek zaman aşımına uğradı, tekrar dene.'
const SESSION_EXPIRED_MESSAGE = 'Oturumun sona ermiş, tekrar giriş yapmalısın.'
const FORBIDDEN_MESSAGE = 'Bu işlem için yetkin yok.'
const NOT_FOUND_MESSAGE = 'Aradığın kayıt bulunamadı.'
const CONFLICT_MESSAGE = 'Bu kayıt başka biri tarafından değiştirilmiş olabilir, sayfayı yenile.'
const IN_USE_MESSAGE = 'Bu kayıt hâlâ kullanımda olduğu için silinemedi — önce bağlı kayıtları taşı veya sil.'
const VALIDATION_MESSAGE = 'Girdiğin bilgilerde bir sorun var, kontrol edip tekrar dene.'
const STORAGE_MESSAGE = 'Dosya işlemi sırasında bir sorun oluştu, tekrar dene.'
const SERVER_MESSAGE = 'Sunucuda beklenmeyen bir sorun oluştu, tekrar dene.'
const UNKNOWN_MESSAGE = 'Beklenmeyen bir hata oluştu, tekrar dene.'

// Supabase/PostgREST hata kodlarını (bkz. postgrest hata sözlüğü) ve
// auth.js hatalarını tek bir sınıflandırmaya indirger.
export function mapSupabaseError(error) {
  if (!error) return new ApiError('unknown', UNKNOWN_MESSAGE)

  const code = error.code ?? error.status
  const status = error.status ?? error.statusCode
  const rawMessage = error.message ?? ''

  let kind = 'unknown'
  let message = UNKNOWN_MESSAGE

  if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError') || code === 'PGRST000') {
    kind = 'network'
    message = NETWORK_MESSAGE
  } else if (rawMessage.toLowerCase().includes('timeout')) {
    kind = 'timeout'
    message = TIMEOUT_MESSAGE
  } else if (status === 401 || rawMessage.toLowerCase().includes('jwt expired') || rawMessage.toLowerCase().includes('invalid token')) {
    kind = 'session_expired'
    message = SESSION_EXPIRED_MESSAGE
  } else if (status === 403 || code === '42501') {
    kind = 'forbidden'
    message = FORBIDDEN_MESSAGE
  } else if (status === 404 || code === 'PGRST116') {
    kind = 'not_found'
    message = NOT_FOUND_MESSAGE
  } else if (code === '23503') {
    kind = 'in_use'
    message = IN_USE_MESSAGE
  } else if (status === 409 || code === '23505') {
    kind = 'conflict'
    message = CONFLICT_MESSAGE
  } else if (code === '23502' || code === '23514' || status === 400) {
    kind = 'validation'
    message = VALIDATION_MESSAGE
  } else if (rawMessage.toLowerCase().includes('storage') || rawMessage.toLowerCase().includes('bucket')) {
    kind = 'storage'
    message = STORAGE_MESSAGE
  } else if (status >= 500) {
    kind = 'server'
    message = SERVER_MESSAGE
  } else if (rawMessage) {
    // SECURITY DEFINER fonksiyonlarımızdan (claim_opportunity vb.) gelen
    // 'raise exception' mesajları zaten Türkçe ve kullanıcıya güvenle
    // gösterilebilir şekilde yazıldı — bunları olduğu gibi geçiriyoruz.
    kind = 'validation'
    message = rawMessage
  }

  // Teknik detay SADECE development konsoluna — kullanıcı verisi değil,
  // hata kodu/mesajı loglanıyor.
  if (import.meta.env.DEV) {
    console.warn('[Supabase error]', { code, status, rawMessage, kind })
  }

  return new ApiError(kind, message, error)
}
