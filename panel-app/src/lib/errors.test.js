import { describe, expect, it } from 'vitest'
import { mapSupabaseError, ApiError } from './errors'

// Bu dosya son kullanıcıya HİÇBİR ZAMAN ham Supabase/Postgres hatası
// göstermeme kuralının uygulandığını doğrular — her dönen mesaj Türkçe ve
// teknik detay (SQL kodu, policy adı, sütun adı) içermemeli.

describe('mapSupabaseError', () => {
  it('null/undefined hata için bilinmeyen hata döner, çökme olmaz', () => {
    const err = mapSupabaseError(null)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.kind).toBe('unknown')
  })

  it('ağ hatasını "network" olarak sınıflandırır', () => {
    const err = mapSupabaseError({ message: 'Failed to fetch' })
    expect(err.kind).toBe('network')
    expect(err.message).not.toMatch(/fetch/i)
  })

  it('401 -> session_expired, teknik detay içermeyen mesaj', () => {
    const err = mapSupabaseError({ status: 401, message: 'JWT expired' })
    expect(err.kind).toBe('session_expired')
    expect(err.message).not.toMatch(/jwt/i)
  })

  it('403 / RLS reddi -> forbidden', () => {
    const err = mapSupabaseError({ status: 403, message: 'new row violates row-level security policy' })
    expect(err.kind).toBe('forbidden')
    expect(err.message).not.toMatch(/row-level security/i)
  })

  it('42501 Postgres yetki hatası -> forbidden', () => {
    const err = mapSupabaseError({ code: '42501', message: 'permission denied for table opportunities' })
    expect(err.kind).toBe('forbidden')
    expect(err.message).not.toMatch(/opportunities/i)
  })

  it('23505 unique violation -> conflict', () => {
    const err = mapSupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint' })
    expect(err.kind).toBe('conflict')
  })

  it('23503 foreign key violation -> in_use, kullanıcıya net mesaj', () => {
    const err = mapSupabaseError({ code: '23503', message: 'update or delete on table violates foreign key constraint' })
    expect(err.kind).toBe('in_use')
    expect(err.message).toMatch(/kullanımda/)
  })

  it('500+ sunucu hatası -> server, dönen mesaj sabit ve güvenli', () => {
    const err = mapSupabaseError({ status: 500, message: 'internal server error at line 42' })
    expect(err.kind).toBe('server')
    expect(err.message).not.toMatch(/line 42/i)
  })

  it('claim_opportunity() RPC\'sinden gelen "raise exception" mesajı olduğu gibi geçer (zaten Türkçe/güvenli)', () => {
    const err = mapSupabaseError({ message: 'Bu fırsat artık uygun değil (zaten alınmış olabilir).' })
    expect(err.message).toBe('Bu fırsat artık uygun değil (zaten alınmış olabilir).')
  })
})
