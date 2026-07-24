// Dijital kartvizit — unvan türetme, ofis adresi, vCard üretimi ve kart
// linki. Hem herkese açık kart sayfası (pages/KartvizitPublic.jsx) hem de
// kendi kartvizitini düzenleme ekranı (pages/Kartvizitim.jsx) bunu kullanır.
import { ROLES } from './roles'
import { whatsappHref } from './phone'

export const KARTVIZIT_UNVAN = {
  [ROLES.BROKER]: 'Broker Owner',
  [ROLES.OWNER]: 'Owner',
  [ROLES.DANISMAN]: 'Gayrimenkul Danışmanı',
}

export function unvanFor(role) {
  return KARTVIZIT_UNVAN[role] ?? 'RE/MAX Lavanda'
}

// Rol bazlı: kartvizit sadece fiilen müşteriyle muhatap olan roller için
// anlamlı — ofis (sadece veri girişi yapan personel) hariç tutuluyor.
export const KARTVIZIT_ROLES = [ROLES.BROKER, ROLES.OWNER, ROLES.DANISMAN]
export function hasKartvizit(role) {
  return KARTVIZIT_ROLES.includes(role)
}

export const OFIS_ADRESI = 'Rumeli Mah. Yücetürk Cad. No:20/3 Çorlu/Tekirdağ'
// Paylaşılan pin linkleri (maps.app.goo.gl / share.google) sadece konumu
// gösterip bir dokunuş daha istiyor — bunun yerine Google'ın resmi
// "directions" API'si kullanılıyor, tıklayınca doğrudan kullanıcının
// bulunduğu yerden ofise rota/yol tarifi başlatır.
export const OFIS_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(OFIS_ADRESI)}`

export const SOSYAL_MEDYA_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/kullaniciadi' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/kullaniciadi' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '05xx xxx xx xx' },
  { key: 'web', label: 'Web / İlanlarım', placeholder: 'https://...' },
]

// lib/phone.js'teki whatsappHref ile aynı mantık — burada tek yerden
// (o dosyadan) kullanılsın diye yeniden dışa veriliyor, tekrar yazılmıyor.
export const whatsappLink = whatsappHref

export function kartvizitPath(userId) {
  return `/k/${userId}`
}

export function kartvizitUrl(userId) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${kartvizitPath(userId)}`
}

function vcardEscape(value) {
  return String(value ?? '').replace(/([,;])/g, '\\$1')
}

// Rehbere kaydedilen kişi telefonun kişi aramasında "remax" yazınca da
// çıksın istendiği için (broker/danışman fark etmeden) — sadece ORG alanına
// güvenmiyoruz, çünkü bazı telefon rehberi uygulamaları aramada sadece
// isim (FN) alanını tarıyor. Bu yüzden marka adı hem isme hem ORG/NOTE'a
// ekleniyor, hangisini tararsa tarasın bulunsun diye.
export function buildVCard({ name, telefon, email, role }) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:;${vcardEscape(name)};;;`,
    `FN:${vcardEscape(name)} - RE/MAX Lavanda`,
    `NICKNAME:${vcardEscape(name)}`,
    `TITLE:${vcardEscape(unvanFor(role))}`,
    'ORG:RE/MAX Lavanda;Gayrimenkul Danışmanlığı',
    'NOTE:RE/MAX Lavanda Gayrimenkul Danışmanlığı',
    telefon ? `TEL;TYPE=CELL:${vcardEscape(telefon)}` : null,
    email ? `EMAIL:${vcardEscape(email)}` : null,
    'END:VCARD',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export function downloadVCard(card) {
  const vcard = buildVCard(card)
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(card.name ?? 'kartvizit').replace(/\s+/g, '_')}.vcf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
