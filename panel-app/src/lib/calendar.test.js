import { describe, expect, it } from 'vitest'
import { canViewEvent, addMinutesToTimeString, eventAttendPercent } from './calendar'

const danisman = { id: 'u-danisman', role: 'danisman' }
const broker = { id: 'u-broker', role: 'broker' }

describe('canViewEvent', () => {
  it('yönetim (broker/owner/ofis) her etkinliği görür', () => {
    const event = { id: 'e1', type: 'broker_gorusmesi', gorunurluk: 'davetliler' }
    expect(canViewEvent(event, broker, [])).toBe(true)
  })

  it('genel türler (Toplantı/Eğitim/Etkinlik/RE MAX Türkiye) danışmana davetsiz de görünür', () => {
    for (const type of ['toplanti', 'egitim', 'etkinlik', 'remax_turkiye']) {
      const event = { id: 'e1', type, gorunurluk: 'davetliler' }
      expect(canViewEvent(event, danisman, [])).toBe(true)
    }
  })

  it('kişisel görüşme türleri (Broker/Koçluk/Recruiting Görüşmesi) davetsiz danışmana görünmez', () => {
    for (const type of ['broker_gorusmesi', 'kocluk_gorusmesi', 'recruiting_gorusmesi']) {
      const event = { id: 'e1', type, gorunurluk: 'davetliler' }
      expect(canViewEvent(event, danisman, [])).toBe(false)
    }
  })

  it('kişisel görüşme türü davetli danışmana görünür', () => {
    const event = { id: 'e1', type: 'broker_gorusmesi', gorunurluk: 'davetliler' }
    const attendance = [{ eventId: 'e1', userId: 'u-danisman' }]
    expect(canViewEvent(event, danisman, attendance)).toBe(true)
  })

  it('kişisel görüşme türü manuel "herkese açık" işaretlenirse davetsiz de görünür', () => {
    const event = { id: 'e1', type: 'broker_gorusmesi', gorunurluk: 'herkese_acik' }
    expect(canViewEvent(event, danisman, [])).toBe(true)
  })
})

describe('addMinutesToTimeString', () => {
  it('normal bir saate dakika ekler', () => {
    expect(addMinutesToTimeString('14:00', 30)).toBe('14:30')
  })

  it('saat sınırını aşan dakikayı doğru taşır', () => {
    expect(addMinutesToTimeString('14:45', 30)).toBe('15:15')
  })

  it('gün sınırını aşarsa saati sarar', () => {
    expect(addMinutesToTimeString('23:45', 30)).toBe('00:15')
  })

  it('0 dakika eklerse saati değiştirmez', () => {
    expect(addMinutesToTimeString('09:05', 0)).toBe('09:05')
  })
})

describe('eventAttendPercent', () => {
  it('katıldı/katılmadı oranını doğru hesaplar', () => {
    const attendees = [
      { status: 'katildi' },
      { status: 'katildi' },
      { status: 'katilmadi' },
      { status: 'katilmadi' },
    ]
    expect(eventAttendPercent(attendees)).toEqual({ resolved: 4, attended: 2, percent: 50 })
  })

  it('reddedilen mazereti katılmadı gibi çözümlenmiş sayar', () => {
    const attendees = [{ status: 'katildi' }, { status: 'mazeretli', mazeretStatus: 'reddedildi' }]
    expect(eventAttendPercent(attendees)).toEqual({ resolved: 2, attended: 1, percent: 50 })
  })

  it('bekleyen/onaylanan mazereti ve henüz işaretlenmemiş davetli/katılacak durumlarını nötr sayar', () => {
    const attendees = [
      { status: 'katildi' },
      { status: 'davetli' },
      { status: 'onayladi' },
      { status: 'mazeretli', mazeretStatus: 'bekliyor' },
      { status: 'mazeretli', mazeretStatus: 'onaylandi' },
    ]
    expect(eventAttendPercent(attendees)).toEqual({ resolved: 1, attended: 1, percent: 100 })
  })

  it('hiç çözümlenmiş katılımcı yoksa 0 döner', () => {
    expect(eventAttendPercent([])).toEqual({ resolved: 0, attended: 0, percent: 0 })
  })
})
