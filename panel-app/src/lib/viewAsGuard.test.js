import { describe, it, expect, afterEach } from 'vitest'
import { setViewAsActive, isViewAsActive, assertNotViewingAs, guardSupabaseClient } from './viewAsGuard'

// "Birini Olarak Görüntüle" modunun TEK güvenlik sınırı burası — bu
// testler yanlışlıkla bir yazma yolunun engelden kaçmasını yakalamak için
// var (bkz. context/ViewAsContext.jsx, dataProvider/supabaseProvider.js).
describe('viewAsGuard', () => {
  afterEach(() => setViewAsActive(false))

  it('varsayılan olarak aktif değil', () => {
    expect(isViewAsActive()).toBe(false)
    expect(() => assertNotViewingAs()).not.toThrow()
  })

  it('aktifken assertNotViewingAs fırlatır', () => {
    setViewAsActive(true)
    expect(() => assertNotViewingAs()).toThrow()
  })

  function fakeClient() {
    const builder = {
      insert: () => 'gerçek-insert',
      update: () => 'gerçek-update',
      upsert: () => 'gerçek-upsert',
      delete: () => 'gerçek-delete',
      select: () => 'gerçek-select',
      eq: () => builder,
    }
    return {
      from: () => builder,
      rpc: (name) => `gerçek-rpc:${name}`,
    }
  }

  it('aktif değilken .from().insert/update/upsert/delete ve .rpc() normal çalışır', () => {
    const client = guardSupabaseClient(fakeClient())
    expect(client.from('x').insert()).toBe('gerçek-insert')
    expect(client.from('x').update()).toBe('gerçek-update')
    expect(client.from('x').upsert()).toBe('gerçek-upsert')
    expect(client.from('x').delete()).toBe('gerçek-delete')
    expect(client.from('x').select()).toBe('gerçek-select')
    expect(client.rpc('cozumle_emanet')).toBe('gerçek-rpc:cozumle_emanet')
  })

  it('aktifken .from().insert/update/upsert/delete fırlatır, .select() etkilenmez', () => {
    setViewAsActive(true)
    const client = guardSupabaseClient(fakeClient())
    expect(() => client.from('x').insert()).toThrow()
    expect(() => client.from('x').update()).toThrow()
    expect(() => client.from('x').upsert()).toThrow()
    expect(() => client.from('x').delete()).toThrow()
    expect(client.from('x').select()).toBe('gerçek-select')
  })

  it('aktifken bilinen okuma-amaçlı RPC çalışır, diğerleri fırlatır', () => {
    setViewAsActive(true)
    const client = guardSupabaseClient(fakeClient())
    expect(client.rpc('get_opportunity_contact')).toBe('gerçek-rpc:get_opportunity_contact')
    expect(client.rpc('get_kartvizit')).toBe('gerçek-rpc:get_kartvizit')
    expect(() => client.rpc('cozumle_emanet')).toThrow()
    expect(() => client.rpc('approve_ciro_raporu')).toThrow()
    expect(() => client.rpc('set_muhasebe_tamamlandi')).toThrow()
  })

  it('zincirleme (.eq() sonrası) builderda da engel geçerli kalır', () => {
    setViewAsActive(true)
    const client = guardSupabaseClient(fakeClient())
    expect(() => client.from('x').eq('id', 1).update()).toThrow()
  })
})
