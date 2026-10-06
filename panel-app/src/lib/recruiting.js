// recruiting_manage RLS kuralıyla aynı: broker/owner/ofis erişebilir.
// Lead Havuzu daraltılınca (sadece broker/owner) canManageLeads'ten
// BİLEREK ayrı bir fonksiyona bölündü — bkz. lib/roles.js.
export { canManageRecruiting } from './roles'

import { OFIS_ADRESI, OFIS_MAPS_URL, OFIS_INSTAGRAM_URL, OFIS_LINKEDIN_URL } from './kartvizit'

// WhatsApp'ta aç butonuna tıklanınca ön dolu açılan davet mesajı (broker
// onayı, 2026-09-30: "biz herkese konum atıyoruz, gelmeden önce araştırma
// fırsatı olsa") — adres/yol tarifi + adayın gelmeden önce ofisi tanıyabileceği
// iki hesap (bkz. lib/kartvizit.js'teki not). Randevu tarihi/saati doluysa
// (gorusmeTarih + gorusmeSaat) mesaja eklenir — no-show azaltma amaçlı da
// (RECRUITING_OLUMSUZ_SEBEPLERI'nde "randevuya_gelmedi" zaten gerçek bir
// sebep). Otomatik GÖNDERİLMİYOR, sadece mesaj kutusunu dolduruyor —
// personel göndermeden önce düzenleyebilir/silebilir.
export function candidateInviteMessage({ adSoyad, gorusmeTarih, gorusmeSaat } = {}) {
  const selamlama = adSoyad ? `Merhaba ${adSoyad}` : 'Merhaba'
  const lines = [`${selamlama}, RE/MAX Lavanda'ya hoş geldiniz!`]
  if (gorusmeTarih && gorusmeSaat) {
    const [yil, ay, gun] = gorusmeTarih.split('-')
    lines.push(`Görüşmemiz ${gun}.${ay}.${yil} saat ${gorusmeSaat}.`)
  }
  lines.push('', `Ofis adresimiz: ${OFIS_ADRESI}`, `Yol tarifi: ${OFIS_MAPS_URL}`)
  lines.push('', 'Bizi tanımak isterseniz:', `Instagram: ${OFIS_INSTAGRAM_URL}`, `LinkedIn: ${OFIS_LINKEDIN_URL}`)
  lines.push('', 'Görüşmek üzere!')
  return lines.join('\n')
}

// 6 aşamalı basitleştirilmiş huni (2026-09-27, broker kararı — eski 7
// aşamalı huniden geldi, bkz. AI_NOTLARI.md "Recruiting aşama sadeleştirme").
// Ara aşamalar (eski Ön Görüşme/Ofis Tanıtımı/Karar Bekliyor) TEK bir
// "ikinci_gorusme" durumunda toplandı — henüz sonuçlanmamış her şey burada,
// danışman gerçek duruma göre Olumlu/Olumsuz'a ilerletir. GD Onboarding
// devri (eski 'evrak' notu) artık 'olumlu' aşamasında.
//
// Etiketler (broker kararı, 2026-09-27, 3. revizyon): 'ilk_gorusme' durumu
// panelde "Randevu", 'ikinci_gorusme' durumu "Karar Bekliyor" olarak
// gösteriliyor — SADECE görünen isim değişti, durum değerleri/DB şeması
// (ilk_gorusme/ikinci_gorusme) ve bunlara bağlı Meta CAPI eşlemesi
// (send-meta-conversion) AYNI kaldı, migration GEREKMEDİ.
//
// "Yanlış Başvuru" BİLEREK "Olumsuz"dan AYRI — ikisi Meta'ya farklı anlam
// taşıyor (bkz. AI_NOTLARI.md): Yanlış Başvuru = hiç geçerli bir aday
// değildi (spam/yanlış numara), lead kalitesi kötüydü -> Meta'ya
// Disqualified. Olumsuz = gerçek, görüşülmüş bir adaydı ama işe alınmadı,
// lead kalitesiyle ilgisi yok -> Meta'ya HİÇBİR sinyal gitmez (zaten
// Randevu'da/ilk_gorusme'de Qualified gönderilmişti, o geçerliliğini korur).
//
// Sıralama (broker kararı, 2026-09-27, 2. revizyon): "Yanlış Başvuru" ilk
// başta 2. sıradaydı, broker fikrini değiştirip EN SONA aldırdı — akış
// mantığı (Yeni Başvuru -> Randevu -> Karar Bekliyor -> Olumsuz) önde,
// hiç geçerli olmayan başvurular en arkada. Bu sıra hem kanban panosunun
// hem üst filtrenin kolon/seçenek sırasını belirliyor (RECRUITING_DURUM_
// SECILEBILIR üzerinden, bkz. RecruitingBoard/RecruitingFilters).
export const RECRUITING_DURUMLARI = ['yeni_basvuru', 'ilk_gorusme', 'ikinci_gorusme', 'olumlu', 'olumsuz', 'yanlis_basvuru']
export const RECRUITING_DURUM_LABELS = {
  yeni_basvuru: 'Yeni Başvuru',
  yanlis_basvuru: 'Yanlış Başvuru',
  ilk_gorusme: 'Randevu',
  ikinci_gorusme: 'Karar Bekliyor',
  olumlu: 'Olumlu',
  olumsuz: 'Olumsuz',
}
// RE/MAX marka paletinden (kırmızı + mavi tonları) — mor/amber/sky/emerald
// gibi markaya ait olmayan stok renkler yerine (bkz. AI_NOTLARI.md).
//
// Randevu/Karar Bekliyor BİLEREK birbirine YAKIN iki mavi değil, UZAK iki
// ton (2026-09-27 düzeltme, broker: "üç kolonu daha anlaşılır bir renkle
// ayrıştır" — eski blue-mid/blue çifti kanban'da yan yana durunca birbirine
// çok benziyordu). Randevu = açık gök mavisi (canlı, "sürüyor" hissi),
// Karar Bekliyor = koyu lacivert (ciddi, "karar eşiği" hissi) — aradaki
// kontrast blue-mid/blue'dan çok daha belirgin, aynı zamanda akışın
// ilerledikçe "koyulaşması" anlamlı bir sıra da taşıyor.
export const RECRUITING_DURUM_STYLES = {
  yeni_basvuru: 'bg-ink-100 text-ink-600',
  yanlis_basvuru: 'bg-ink-200 text-ink-500',
  ilk_gorusme: 'bg-remax-blue-light/60 text-remax-blue-dark2',
  ikinci_gorusme: 'bg-remax-navy/20 text-remax-navy',
  olumlu: 'bg-remax-navy/10 text-remax-navy',
  olumsuz: 'bg-remax-red-dark/10 text-remax-red-dark',
}

// "Olumlu" formda/dropdown'da SEÇİLEMEZ — sadece "Danışman Olarak Ekle"
// eylemi (bkz. RecruitingDetailModal, Recruiting.jsx handleCreateDanisman)
// bu duruma taşıyabilir, çünkü Olumlu = gerçek danışman hesabı açıldı
// demek (broker kararı: "hiç olumlu menüsü olmasın, seçim olumlu olunca
// direkt yeni danışman kaydına atsın").
export const RECRUITING_DURUM_SECILEBILIR = RECRUITING_DURUMLARI.filter((d) => d !== 'olumlu')

// "Olumsuz" seçilince ZORUNLU sorulan sebep (broker kararı, 2026-09-27:
// "olumsuzların da neden olumsuz olduğunu bilmek için") — "Yanlış
// Başvuru"da sorulmuyor, o zaten kendi açıklamasını taşıyor (spam/yanlış
// numara), buradaki liste gerçek görüşülmüş ama işe alınmamış adaylar
// için Follow Up Boss/HubSpot tarzı "kapanış sebebi" mantığı.
//
// Liste 2026-09-28'de broker'ın kendi önerisiyle güncellendi: "baska_teklif"
// (Başka bir teklif/fırsat kabul etti) İKİYE ayrıldı — rakip bir emlak
// ofisine mi kaybedildi, yoksa sektör dışı bir işe mi — bunlar broker için
// FARKLI anlam taşıyor (rakip analizi vs. sektör cazibesi). "Randevuya
// gelmedi" yeni eklendi (gerçek kullanımda sık karşılaşılan ama listede
// hiç olmayan bir durumdu, elle "Açıklama"ya yazılıyordu). "Deneyim/
// yetkinlik yetersiz" ve "İletişime geçilemedi" listeden ÇIKARILDI (broker
// kararı, kullanım verisi de zaten çok düşüktü: sırasıyla 1 ve 0 kayıt).
// Eski "baska_teklif"/"deneyim_yetersiz"/"iletisime_gecilemedi" değerleri
// DB'de (CHECK constraint'te) hâlâ geçerli — geçmiş kayıtlar bozulmasın
// diye, sadece BURADAN yeni seçim olarak sunulmuyorlar.
export const RECRUITING_OLUMSUZ_SEBEPLERI = [
  'maas_beklentisi',
  'profile_uygun_degil',
  'baska_emlak_ofisi',
  'farkli_sektor_teklifi',
  'randevuya_gelmedi',
  'kendi_istegiyle',
  'diger',
]
export const RECRUITING_OLUMSUZ_SEBEP_LABELS = {
  maas_beklentisi: 'Maaş/hakediş beklentisi uyuşmadı',
  profile_uygun_degil: 'Aradığımız profile uygun değil',
  baska_emlak_ofisi: 'Başka bir emlak ofisiyle anlaştı',
  farkli_sektor_teklifi: 'Farklı bir sektörden iş teklifi kabul etti',
  randevuya_gelmedi: 'Randevuya gelmedi',
  kendi_istegiyle: 'Kendi isteğiyle vazgeçti',
  diger: 'Diğer',
  // Artık seçilemiyor ama eski kayıtlarda görünebilir (bkz. yukarı not) —
  // RECRUITING_OLUMSUZ_SEBEPLERI'nde YOK, sadece etiket çözümü için burada.
  deneyim_yetersiz: 'Deneyim/yetkinlik yetersiz',
  baska_teklif: 'Başka bir teklif/fırsat kabul etti',
  iletisime_gecilemedi: 'İletişime geçilemedi',
}

// Kendi kaynak listesi — leads.kaynak ile AYNI DEĞİL, bilerek. Recruiting
// kanalları (Kariyer.net, LinkedIn, İşin Olsun...) portföy lead
// kanallarından (web, tabela, sahibinden) farklı; onlar recruiting için
// anlamsız bulunup çıkarıldı, "ofis" (ofise gelip başvuran) eklendi.
export const RECRUITING_KAYNAKLARI = [
  'meta_recruiting', 'kariyer_net', 'isinolsun', 'linkedin', 'secretcv', 'indeed',
  'instagram', 'referans', 'remax_agi', 'seminer', 'santral', 'ofis', 'diger',
]
export const RECRUITING_KAYNAK_LABELS = {
  meta_recruiting: 'Meta (Recruiting)',
  kariyer_net: 'Kariyer.net',
  isinolsun: 'İşin Olsun',
  linkedin: 'LinkedIn',
  secretcv: 'SecretCV',
  indeed: 'Indeed',
  instagram: 'Instagram',
  referans: 'Referans',
  remax_agi: 'RE/MAX Ağı',
  seminer: 'Seminer',
  santral: 'Santral',
  ofis: 'Ofis',
  diger: 'Diğer',
}

// Recruiting.jsx'in kendi filtre çubuğu artık kayıt tipini değil tarih
// aralığını kullanıyor (bkz. lib/dateRange, 2026-09-27 broker kararı) —
// bu fonksiyon SADECE Panel.jsx'in ana sayfa özet kartı için kalıyor
// ('aktif' sabit değeriyle çağrılıyor, arşiv kayıtlarının özet sayılara
// karışmaması için).
export function matchesKayitTipiFilter(candidate, filterValue) {
  if (filterValue === 'tumu') return true
  if (filterValue === 'gecmis') return candidate.kayitTipi === 'gecmis'
  return candidate.kayitTipi !== 'gecmis'
}

// Lead Havuzu'ndan "Recruiting'e Dönüştür" ile açılırken lead.kaynak'ı
// (leads.js'in 7 değerlik listesi) recruiting'in kendi 13 değerlik
// listesine deterministik çevirir — form boş açılıp elle doldurmaya
// bırakılmıyor (unutulup veri kirlenmesin diye), personel isterse formda
// yine değiştirebilir.
// "meta_portfoy" (Meta'dan portföy/gayrimenkul ilgisiyle gelen lead) BİLEREK
// 'diger' DEĞİL 'meta_recruiting'e eşleniyor (2026-09-27 düzeltme, broker:
// "neden kaynak metayken diğer işaretli") — hangi Meta kampanyasından
// geldiği (recruiting mi portföy mü) zaten reklamAdi/kampanyaKodu'nda ayrı
// duruyor, kaynak alanı sadece "Meta'dan mı geldi" bilgisini taşıyor,
// bunu 'diger'e düşürmek kaynağı gizliyordu.
export const LEAD_TO_RECRUITING_KAYNAK = {
  meta_recruiting: 'meta_recruiting',
  telefon: 'santral',
  referans: 'referans',
  web: 'diger',
  tabela: 'diger',
  meta_portfoy: 'meta_recruiting',
  diger: 'diger',
}

// Reklam bazlı Recruiting dönüşümü — "Reklam Kaynakları" raporunun
// Recruiting tarafı. lib/callLogs.js computeReklamKoduConversion ile aynı
// desen: sadece reklamdan gelen (reklamAdi/kampanyaKodu dolu) adaylar
// sayılır, manuel/ofis girişleri dışarıda kalır. "Birebir görüşme" tek bir
// alanla tutulmadığı için mevcut durum aşamasından türetiliyor — ilk
// görüşme ve sonrası (olumsuz hariç) o kişiyle bire bir görüşüldüğü
// anlamına gelir.
const BIREBIR_GORUSME_ASAMALARI = ['ilk_gorusme', 'ikinci_gorusme', 'olumlu']
export function computeRecruitingReklamConversion(candidates) {
  const byAd = {}
  for (const c of candidates) {
    const key = c.reklamAdi || c.kampanyaKodu
    if (!key) continue
    if (!byAd[key]) byAd[key] = { total: 0, gorusme: 0, alindi: 0 }
    byAd[key].total += 1
    if (BIREBIR_GORUSME_ASAMALARI.includes(c.durum)) byAd[key].gorusme += 1
    if (c.durum === 'olumlu') byAd[key].alindi += 1
  }
  return Object.entries(byAd)
    .map(([reklamAdi, v]) => ({ reklamAdi, ...v }))
    .sort((a, b) => b.alindi - a.alindi)
}

function isInMonth(dateIso, year, month) {
  if (!dateIso) return false
  const d = new Date(dateIso)
  return d.getFullYear() === year && d.getMonth() === month
}

// Recruiting Kaynak Raporu — "bu ay kaç aday danışman oldu, hangi
// kaynaktan" sorusuna cevap (2026-10-06 broker isteği). Her metrik
// GERÇEKTEN O İŞLEMİN OLDUĞU aya yazılır (broker: "RE/MAX da bu şekilde
// yapıyor") — başvuru createdAt'a, görüşme ilkGorusmeTarihi'ne, sonuç
// (danışman oldu/olumsuz) sonucTarihi'ne göre. İkisi de sadece bu
// migration'dan (2026-10-06) SONRAKİ değişiklikler için doğru — eski
// kayıtlarda bu tarihler hiç kaydedilmediği için boş kalır, o yüzden
// geçmiş aylarda "görüşmeye kalan"/"danışman oldu" sayıları olduğundan
// düşük çıkabilir (broker onayı: kabul edilebilir).
// sorumluId verilirse SADECE o kişiye ait adaylar sayılır (recruiter
// performansı için, atananDanismanId'den AYRI — bkz. migration notu).
export function computeRecruitingKaynakRaporu(candidates, { year, month, sorumluId }) {
  const rows = sorumluId ? candidates.filter((c) => c.sorumluId === sorumluId) : candidates
  const byKaynak = {}
  for (const key of RECRUITING_KAYNAKLARI) {
    byKaynak[key] = { kaynak: key, basvuru: 0, gorusme: 0, danismanOldu: 0, olumsuz: 0, olumsuzSebepleri: {} }
  }
  for (const c of rows) {
    const bucket = byKaynak[c.kaynak] ?? (byKaynak[c.kaynak] = { kaynak: c.kaynak, basvuru: 0, gorusme: 0, danismanOldu: 0, olumsuz: 0, olumsuzSebepleri: {} })
    if (isInMonth(c.createdAt, year, month)) bucket.basvuru += 1
    if (isInMonth(c.ilkGorusmeTarihi, year, month)) bucket.gorusme += 1
    if (c.durum === 'olumlu' && isInMonth(c.sonucTarihi, year, month)) bucket.danismanOldu += 1
    if (c.durum === 'olumsuz' && isInMonth(c.sonucTarihi, year, month)) {
      bucket.olumsuz += 1
      const sebep = c.olumsuzSebebi ?? 'diger'
      bucket.olumsuzSebepleri[sebep] = (bucket.olumsuzSebepleri[sebep] ?? 0) + 1
    }
  }
  return Object.values(byKaynak)
    .map((b) => {
      const sebepEntries = Object.entries(b.olumsuzSebepleri)
      const enSikSebep = sebepEntries.length > 0 ? sebepEntries.sort((a, b2) => b2[1] - a[1])[0][0] : null
      return { ...b, enSikOlumsuzSebebi: enSikSebep }
    })
    .filter((b) => b.basvuru > 0 || b.gorusme > 0 || b.danismanOldu > 0 || b.olumsuz > 0)
    .sort((a, b) => b.basvuru - a.basvuru)
}

// "Danışman Olarak Ekle" eyleminde users.kaynak'a yazılan özet metin —
// broker kararı: "o danışmanları biz nereden aldığımızı da bilmeliyiz,
// kaynağını bilelim". Canlı bir FK yerine BİLEREK bir anlık özet (snapshot)
// — "nereden geldi" tarihsel bir gerçek, recruiting_candidates satırı
// silinse/değişse bile users tablosunda okunabilir kalmalı.
export function candidateKaynakOzeti(candidate) {
  const parts = [RECRUITING_KAYNAK_LABELS[candidate.kaynak] ?? candidate.kaynak]
  if (candidate.reklamAdi) parts.push(candidate.reklamAdi)
  else if (candidate.kampanyaKodu) parts.push(candidate.kampanyaKodu)
  return `Recruiting: ${parts.join(' — ')}`
}
