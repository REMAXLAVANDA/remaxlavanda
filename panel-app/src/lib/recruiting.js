// recruiting_manage RLS kuralıyla aynı: broker/owner/ofis erişebilir.
// Lead Havuzu daraltılınca (sadece broker/owner) canManageLeads'ten
// BİLEREK ayrı bir fonksiyona bölündü — bkz. lib/roles.js.
export { canManageRecruiting } from './roles'

// 6 aşamalı basitleştirilmiş huni (2026-09-27, broker kararı — eski 7
// aşamalı huniden geldi, bkz. AI_NOTLARI.md "Recruiting aşama sadeleştirme").
// Ara aşamalar (eski Ön Görüşme/Ofis Tanıtımı/Karar Bekliyor) TEK bir
// "İkinci Görüşme" aşamasında toplandı — henüz sonuçlanmamış her şey burada,
// danışman gerçek duruma göre Olumlu/Olumsuz'a ilerletir. GD Onboarding
// devri (eski 'evrak' notu) artık 'olumlu' aşamasında.
//
// "Yanlış Başvuru" BİLEREK "Olumsuz"dan AYRI — ikisi Meta'ya farklı anlam
// taşıyor (bkz. AI_NOTLARI.md): Yanlış Başvuru = hiç geçerli bir aday
// değildi (spam/yanlış numara), lead kalitesi kötüydü -> Meta'ya
// Disqualified. Olumsuz = gerçek, görüşülmüş bir adaydı ama işe alınmadı,
// lead kalitesiyle ilgisi yok -> Meta'ya HİÇBİR sinyal gitmez (zaten
// İlk Görüşme'de Qualified gönderilmişti, o geçerliliğini koruyor).
//
// Sıralama (broker kararı, 2026-09-27, 2. revizyon): "Yanlış Başvuru" ilk
// başta 2. sıradaydı, broker fikrini değiştirip EN SONA aldırdı — akış
// mantığı (Yeni Başvuru -> İlk Görüşme -> İkinci Görüşme -> Olumsuz) önde,
// hiç geçerli olmayan başvurular en arkada. Bu sıra hem kanban panosunun
// hem üst filtrenin kolon/seçenek sırasını belirliyor (RECRUITING_DURUM_
// SECILEBILIR üzerinden, bkz. RecruitingBoard/RecruitingFilters).
export const RECRUITING_DURUMLARI = ['yeni_basvuru', 'ilk_gorusme', 'ikinci_gorusme', 'olumlu', 'olumsuz', 'yanlis_basvuru']
export const RECRUITING_DURUM_LABELS = {
  yeni_basvuru: 'Yeni Başvuru',
  yanlis_basvuru: 'Yanlış Başvuru',
  ilk_gorusme: 'İlk Görüşme',
  ikinci_gorusme: 'İkinci Görüşme',
  olumlu: 'Olumlu',
  olumsuz: 'Olumsuz',
}
// RE/MAX marka paletinden (kırmızı + mavi tonları) — mor/amber/sky/emerald
// gibi markaya ait olmayan stok renkler yerine (bkz. AI_NOTLARI.md).
export const RECRUITING_DURUM_STYLES = {
  yeni_basvuru: 'bg-ink-100 text-ink-600',
  yanlis_basvuru: 'bg-ink-200 text-ink-500',
  ilk_gorusme: 'bg-remax-blue-mid/10 text-remax-blue-mid',
  ikinci_gorusme: 'bg-remax-blue/10 text-remax-blue',
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
export const RECRUITING_OLUMSUZ_SEBEPLERI = [
  'maas_beklentisi',
  'deneyim_yetersiz',
  'baska_teklif',
  'iletisime_gecilemedi',
  'profile_uygun_degil',
  'kendi_istegiyle',
  'diger',
]
export const RECRUITING_OLUMSUZ_SEBEP_LABELS = {
  maas_beklentisi: 'Maaş/hakediş beklentisi uyuşmadı',
  deneyim_yetersiz: 'Deneyim/yetkinlik yetersiz',
  baska_teklif: 'Başka bir teklif/fırsat kabul etti',
  iletisime_gecilemedi: 'İletişime geçilemedi',
  profile_uygun_degil: 'Aradığımız profile uygun değil',
  kendi_istegiyle: 'Kendi isteğiyle vazgeçti',
  diger: 'Diğer',
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

// Arşiv taşıması (421 kayıt, kayit_tipi='gecmis') sonrası günlük görünümü
// kirletmesin diye — varsayılan filtre 'aktif' (lead+manuel), geçmiş
// kayıtlar sadece elle "Geçmiş"/"Tümü" seçilince görünür (bkz.
// pages/Recruiting.jsx, RecruitingFilters.jsx).
export const RECRUITING_KAYIT_TIPI_FILTRELERI = ['aktif', 'gecmis', 'tumu']
export const RECRUITING_KAYIT_TIPI_FILTRE_LABELS = {
  aktif: 'Aktif',
  gecmis: 'Geçmiş',
  tumu: 'Tümü',
}
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
export const LEAD_TO_RECRUITING_KAYNAK = {
  meta_recruiting: 'meta_recruiting',
  telefon: 'santral',
  referans: 'referans',
  web: 'diger',
  tabela: 'diger',
  meta_portfoy: 'diger',
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
