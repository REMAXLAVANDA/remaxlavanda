// Ciro Raporu sistemi — danışman, işlemi tamamladığı opportunity üzerinden
// kendisi ciro + fatura bilgisi raporluyor (eskiden broker/owner'ın Lig'de
// elle girdiği "Ciro Gir" akışının YERİNE geçti, 2026-10-08 broker kararı).
// Broker onaylayınca her katılımcının payına düşen tutar otomatik olarak
// mevcut `league.addScore()` üzerinden ciro_girisleri'ne yazılır — Lig ve
// Mentor Primi bu sayede hiç değişmeden, sadece kaynağı değişerek çalışır.
import { ROLES } from './roles'
import { canManageCiroScores } from './league'

export const CIRO_RAPORU_DURUM_LABELS = {
  taslak: 'Taslak',
  onay_bekliyor: 'Onay Bekliyor',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
}

export const CIRO_RAPORU_DURUM_STYLES = {
  taslak: 'bg-ink-100 text-ink-600',
  onay_bekliyor: 'bg-amber-50 text-amber-700',
  onaylandi: 'bg-emerald-50 text-emerald-700',
  reddedildi: 'bg-red-50 text-red-600',
}

export const ISLEM_TIPI_LABELS = { satis: 'Satış', kiralama: 'Kiralama' }

export const PORTFOY_TIPI_LABELS = { portfoyum: 'Portföylerim', dis_portfoy: 'Dış Portföy' }

// ciro_raporlari_insert_self RLS'i rol kontrolü yapmıyor (sadece
// olusturan_id = auth.uid() şartı var) — asıl kısıtlama burada, UI
// seviyesinde. Danışmanın yanı sıra broker da kendi kapattığı işlemi
// raporlayabilir (2026-10-09 broker kararı: "broker ciro girebilsin" —
// gerçek RE/MAX ekranında broker de bir GD olarak kendi payıyla
// görünüyor). Owner/ofis hâlâ giremiyor.
export function canSubmitCiroRaporu(role) {
  return role === ROLES.DANISMAN || role === ROLES.BROKER
}

// ciro_raporlari_manage_broker RLS'iyle aynı: onay/red SADECE broker/owner
// — Lig'deki manuel ciro girişiyle AYNI yetki seviyesi (canManageCiroScores,
// 2026-10-08'de ofis bilerek çıkarılmıştı), bilinçli olarak yeniden kullanılıyor.
export function canApproveCiroRaporu(role) {
  return canManageCiroScores(role)
}

// Bir danışmanın verilen tarihteki geçerli komisyon paylaşım oranı —
// gecerlilik_bitis boşsa hâlâ geçerli demektir. Birden fazla uygunsa (veri
// hatası) en yeni başlangıçlı olan kazanır.
export function guncelAnlasmaOrani(anlasmalar, danismanId, tarihIso) {
  const tarih = new Date(tarihIso)
  const uygun = (anlasmalar ?? [])
    .filter((a) => a.danismanId === danismanId)
    .filter((a) => {
      const baslangic = new Date(a.gecerlilikBaslangic)
      const bitis = a.gecerlilikBitis ? new Date(a.gecerlilikBitis) : null
      return tarih >= baslangic && (!bitis || tarih <= bitis)
    })
    .sort((a, b) => new Date(b.gecerlilikBaslangic) - new Date(a.gecerlilikBaslangic))
  return uygun[0]?.paylasimOrani ?? null
}

// Bir katılımcının payına düşen SATIŞ tutarı — Lig'e/Mentor Primi'ye giden
// değer bu (komisyon değil, broker'ın onayladığı tasarım: "ciro" her zaman
// satış hacmini ölçüyor, bkz. AI_NOTLARI.md).
export function katilimciSatisPayi(islemTutari, payOrani) {
  return Number(islemTutari) * (Number(payOrani) / 100)
}

// Danışmana önerilen fatura tutarı — kendi payına düşen satıştan, o anki
// anlaşma oranına göre kesmesi gereken komisyon.
export function komisyonTutariOnerisi(islemTutari, payOrani, anlasmaOrani) {
  if (anlasmaOrani == null) return null
  return katilimciSatisPayi(islemTutari, payOrani) * (Number(anlasmaOrani) / 100)
}

// Katılımcıların girdiği gerçek fatura tutarı, önerilen tutardan (küçük
// yuvarlama farkları hariç) belirgin şekilde sapıyorsa "tutarsız" uyarısı —
// broker onay kuyruğunda bunu görür, kör onaylamaz.
export function faturaTutarsizMi(faturaTutari, onerilenTutar) {
  if (faturaTutari == null || onerilenTutar == null) return false
  return Math.abs(Number(faturaTutari) - onerilenTutar) > 1
}

// Katılımcı paylarının toplamı — DB'deki deferred constraint trigger'ıyla
// aynı kural, formda anlık uyarı göstermek için (sunucuya gitmeden önce).
export function toplamPayOrani(katilimcilar) {
  return (katilimcilar ?? []).reduce((sum, k) => sum + Number(k.payOrani || 0), 0)
}

// RE/MAX Türkiye'nin resmi ciro ekranındaki "hizmet bedeli" — satış
// tutarından (Lig'e giden satış hacmi) AYRI, gerçek para akışı. Satıcı/
// alıcı tarafların checkbox'ları işaretli değilse o tarafın tutarı 0 sayılır.
export function toplamHizmetBedeli({ saticiHizmetBedeli, aliciHizmetBedeli }) {
  return [saticiHizmetBedeli, aliciHizmetBedeli].reduce((sum, v) => sum + Number(v || 0), 0)
}

// Bir katılımcının payına düşen GERÇEK ciro (hizmet bedelinden) — Çalışan/
// RT/Ofis Payı üçlemesinin tabanı. katılımciSatisPayi'yle aynı formül,
// sadece taban "satış tutarı" değil "toplam hizmet bedeli".
export function gdCirosu(toplamHizmetBedeliTutari, payOrani) {
  return katilimciSatisPayi(toplamHizmetBedeliTutari, payOrani)
}

// Danışmanın güncel RT Payı oranı — guncelAnlasmaOrani ile AYNI desen,
// farklı alan (rtPayOrani), aynı tarih aralığı mantığı (danisman_anlasmalari).
export function guncelRtPayOrani(anlasmalar, danismanId, tarihIso) {
  const tarih = new Date(tarihIso)
  const uygun = (anlasmalar ?? [])
    .filter((a) => a.danismanId === danismanId)
    .filter((a) => {
      const baslangic = new Date(a.gecerlilikBaslangic)
      const bitis = a.gecerlilikBitis ? new Date(a.gecerlilikBitis) : null
      return tarih >= baslangic && (!bitis || tarih <= bitis)
    })
    .sort((a, b) => new Date(b.gecerlilikBaslangic) - new Date(a.gecerlilikBaslangic))
  return uygun[0]?.rtPayOrani ?? null
}

export function rtPayiOnerisi(gdCirosuTutari, rtPayOrani) {
  if (rtPayOrani == null) return null
  return gdCirosuTutari * (Number(rtPayOrani) / 100)
}

// Ofis Payı her zaman kalan — elle girilmez, Çalışan+RT+Ofis GD Cirosu'na
// eşit olsun garantisi bu şekilde sağlanır (üç ayrı elle girilen alan
// toplamı tutmayabilirdi).
export function ofisPayiTutari(gdCirosuTutari, calisanPayiTutari, rtPayiTutariDeger) {
  return Number(gdCirosuTutari || 0) - Number(calisanPayiTutari || 0) - Number(rtPayiTutariDeger || 0)
}
