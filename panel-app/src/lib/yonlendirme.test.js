import { describe, expect, it } from 'vitest'
import {
  computeYonlendirmePuani,
  isIlk90Gunde,
  yonlendirmeDurumu,
  sortBySiralamaPuani,
  yonlendirmeMesaji,
  buildYonlendirmeMap,
} from './yonlendirme'

const day = 24 * 60 * 60 * 1000

describe('isIlk90Gunde', () => {
  it('30 gün önce başlayan danışman için true döner', () => {
    const now = new Date()
    const user = { createdAt: new Date(now.getTime() - 30 * day).toISOString() }
    expect(isIlk90Gunde(user, now)).toBe(true)
  })

  it('120 gün önce başlayan danışman için false döner', () => {
    const now = new Date()
    const user = { createdAt: new Date(now.getTime() - 120 * day).toISOString() }
    expect(isIlk90Gunde(user, now)).toBe(false)
  })

  it('createdAt yoksa false döner', () => {
    expect(isIlk90Gunde({}, new Date())).toBe(false)
  })
})

describe('yonlendirmeDurumu', () => {
  it('70 ve üzeri puan Açık', () => {
    expect(yonlendirmeDurumu(70, false)).toBe('acik')
    expect(yonlendirmeDurumu(90, false)).toBe('acik')
  })

  it('50-70 arası Sırada geride', () => {
    expect(yonlendirmeDurumu(50, false)).toBe('sirada_geride')
    expect(yonlendirmeDurumu(69, false)).toBe('sirada_geride')
  })

  it('50 altı Kapalı', () => {
    expect(yonlendirmeDurumu(49, false)).toBe('kapali')
    expect(yonlendirmeDurumu(0, false)).toBe('kapali')
  })

  it('ilk 90 gündeyse puan düşük olsa bile Açık', () => {
    expect(yonlendirmeDurumu(10, true)).toBe('acik')
  })
})

describe('computeYonlendirmePuani', () => {
  it('3 bileşenin düz ortalamasını alır', () => {
    const now = new Date('2026-10-06T12:00:00Z')
    const events = [{ id: 'e1', startAt: new Date(now.getTime() - day).toISOString(), endAt: new Date(now.getTime() - day + 3600000).toISOString() }]
    const attendance = [{ userId: 'u1', eventId: 'e1', status: 'katildi' }]
    const calls = [{ assignedTo: 'u1', kaynak: 'Reklam', portfoyTalebiMi: false, donusYapildiMi: true }]
    const activity = [{ userId: 'u1', lastSignInAt: now.toISOString() }]
    const { puan, metrics } = computeYonlendirmePuani('u1', { events, attendance, calls, activity })
    // meetingAttend 100, leadResponse 100, portalUsage 100 -> ortalama 100
    expect(metrics.meetingAttend).toBe(100)
    expect(metrics.leadResponse).toBe(100)
    expect(metrics.portalUsage).toBe(100)
    expect(puan).toBe(100)
  })

  it('hiç veri yoksa 0 döner (veri yok = %0 kuralı)', () => {
    const { puan } = computeYonlendirmePuani('u1', { events: [], attendance: [], calls: [], activity: [] })
    expect(puan).toBe(0)
  })
})

describe('sortBySiralamaPuani', () => {
  it('yüksek sıralama puanı önce, haritada olmayan sona düşer', () => {
    const options = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const map = { a: { siralamaPuani: 40 }, b: { siralamaPuani: 90 } }
    const sorted = sortBySiralamaPuani(options, map)
    expect(sorted.map((o) => o.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('yonlendirmeMesaji', () => {
  it('Kapalı durumda yönlendirme yapılmayacağını açıkça söyler', () => {
    const entry = { puan: 42, durum: 'kapali', ilk90Gunde: false, metrics: { meetingAttend: 80, leadResponse: 35, portalUsage: 90 } }
    const msg = yonlendirmeMesaji(entry)
    expect(msg).toContain('yeni portföy/müşteri yönlendirilmiyor')
    expect(msg).toContain('Lead Dönüş Oranı')
  })

  it('ilk 90 gün koruması varsa özel mesaj döner', () => {
    const entry = { puan: 20, durum: 'acik', ilk90Gunde: true, metrics: { meetingAttend: 0, leadResponse: 0, portalUsage: 0 } }
    expect(yonlendirmeMesaji(entry)).toContain('İlk 90 gün koruması')
  })

  it('Açık durumda yönlendirme alabileceğini söyler', () => {
    const entry = { puan: 85, durum: 'acik', ilk90Gunde: false, metrics: { meetingAttend: 90, leadResponse: 80, portalUsage: 85 } }
    expect(yonlendirmeMesaji(entry)).toContain('Yönlendirmeye açıksın')
  })
})

describe('buildYonlendirmeMap', () => {
  it('her kullanıcı için bir giriş üretir', () => {
    const users = [{ id: 'u1', createdAt: '2020-01-01T00:00:00Z' }, { id: 'u2', createdAt: '2020-01-01T00:00:00Z' }]
    const data = { events: [], attendance: [], calls: [], activity: [], ciroMusterileri: [], scores: [], periods: [], users }
    const map = buildYonlendirmeMap(users, data)
    expect(Object.keys(map).sort()).toEqual(['u1', 'u2'])
    expect(map.u1.durum).toBe('kapali')
  })
})
