import { getSupabaseClient } from './supabaseClient'
import { mapSupabaseError } from './errors'
import { USE_SUPABASE } from './env'

const BUCKET = 'docs'
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB — bucket policy ile birebir aynı (defense in depth)
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'zip']

// Dosya adını kullanıcı girdisinden doğrudan path'e koymuyoruz — Türkçe
// karakterleri sadeleştirip, path'i bozabilecek karakterleri temizleyip,
// çakışmayı önlemek için zaman damgası ekliyoruz.
export function normalizeFilename(filename) {
  const trimmed = (filename ?? '').trim()
  const lastDot = trimmed.lastIndexOf('.')
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed
  const ext = lastDot > 0 ? trimmed.slice(lastDot + 1).toLowerCase() : ''

  const safeBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // aksan işaretlerini kaldır (ör. ı->i, ş->s)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80)

  const safeName = safeBase || 'dosya'
  return ext ? `${safeName}.${ext}` : safeName
}

export function buildStoragePath({ categoryKey, docId, filename }) {
  const safeName = normalizeFilename(filename)
  const timestamp = Date.now()
  return `${categoryKey}/${docId}/${timestamp}-${safeName}`
}

/**
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateFile(file) {
  if (!file) return { ok: false, reason: 'Dosya seçilmedi.' }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, reason: 'Dosya 20 MB sınırını aşıyor.' }
  }
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `Bu dosya türü desteklenmiyor (izin verilenler: ${ALLOWED_EXTENSIONS.join(', ')}).` }
  }
  return { ok: true }
}

// Gerçek dosya baytlarını Storage'a yükler. Kayıt satırı (docs/doc_versions)
// AYRI bir işlemdir — bkz. dataProvider supabaseProvider.docs.addVersion().
// Bucket zaten server-side mime/boyut kısıtı uyguluyor (bkz. migration),
// buradaki validateFile() sadece kullanıcıya erken/anlaşılır geri bildirim.
//
// Mock modda gerçek Supabase Storage yok — dosyayı tarayıcı belleğinde
// bir blob URL'e çeviriyoruz ki Önizle/İndir dev ortamında da gerçekten
// çalışsın (üretimde bu dal hiç çalışmaz, USE_SUPABASE her zaman true).
export async function uploadDocFile(file, { categoryKey, docId }, onProgress) {
  const check = validateFile(file)
  if (!check.ok) throw new Error(check.reason)

  if (!USE_SUPABASE) {
    onProgress?.(100)
    return URL.createObjectURL(file)
  }

  const client = getSupabaseClient()
  const path = buildStoragePath({ categoryKey, docId, filename: file.name })

  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw mapSupabaseError(error)

  onProgress?.(100)
  return path
}

export async function getSignedDocUrl(path, expiresInSeconds = 300) {
  // Mock modda path zaten uploadDocFile()'ın döndürdüğü blob URL — doğrudan
  // kullanılabilir, imzalamaya gerek yok.
  if (!USE_SUPABASE) return path

  const client = getSupabaseClient()
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error) throw mapSupabaseError(error)
  return data.signedUrl
}

export async function deleteDocFile(path) {
  if (!USE_SUPABASE) return
  const client = getSupabaseClient()
  const { error } = await client.storage.from(BUCKET).remove([path])
  if (error) throw mapSupabaseError(error)
}

// --- Kartvizit profil fotoğrafı ----------------------------------------------
// "docs" bucket'ının aksine PUBLIC — kartvizit sayfası girişsiz (anon)
// açıldığı için signed URL değil, doğrudan kalıcı bir public URL gerekiyor.
const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB — bucket policy ile aynı
const AVATAR_ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

export function validateAvatarFile(file) {
  if (!file) return { ok: false, reason: 'Dosya seçilmedi.' }
  if (file.size > AVATAR_MAX_SIZE_BYTES) return { ok: false, reason: 'Fotoğraf 5 MB sınırını aşıyor.' }
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !AVATAR_ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: 'Sadece PNG, JPG veya WEBP yükleyebilirsin.' }
  }
  return { ok: true }
}

// Yükler ve kalıcı public URL'i döner (avatar_url kolonuna bu yazılır).
// Mock modda gerçek Storage yok — dosyayı tarayıcı belleğinde bir blob
// URL'e çevirip önizlemenin dev ortamında da çalışmasını sağlıyoruz.
export async function uploadAvatarFile(file, userId) {
  const check = validateAvatarFile(file)
  if (!check.ok) throw new Error(check.reason)

  if (!USE_SUPABASE) {
    return URL.createObjectURL(file)
  }

  const client = getSupabaseClient()
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) throw mapSupabaseError(error)

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
