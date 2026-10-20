import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import { formatThousands, parseThousands } from '../../lib/format'
import {
  ISLEM_TIPI_LABELS,
  PORTFOY_TIPI_LABELS,
  RAPOR_KATEGORI_LABELS,
  KREDI_DURUMU_LABELS,
  guncelAnlasmaOrani,
  guncelRtPayOrani,
  komisyonTutariOnerisi,
  toplamHizmetBedeli,
  gdCirosu,
  rtPayiOnerisi,
  beklenenHizmetBedeli,
  hizmetBedeliStandartDisiMi,
} from '../../lib/ciroRaporlari'
import { BANKA_HAREKETI_TUR_LABELS } from '../../lib/bankaHareketleri'

function tl(n) {
  return n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`
}

const today = () => new Date().toISOString().slice(0, 10)

// Broker, 2026-10-11: "dış beyan kodu otomatik verilsin" — Dış Portföy
// seçildiğinde danışmanın elle bir kod icat etmesi gerekmiyor (gerçek bir
// portföy kaydına bağlı değil, sadece bir beyan etiketi). Portföylerim
// seçiliyken kod hâlâ elle giriliyor — gerçek portföyün kendi koduyla
// eşleşmesi gerekiyor, otomatik üretim izlenebilirliği bozar.
function generateDisBeyanKodu() {
  const parca = Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase()
  return `DIS-${parca}`
}

// Danışman kendi kapattığı bir işlem için ciro raporu oluşturur — rapor
// "taslak" durumunda kalır, onaya gönderme ayrı bir adım (fatura no
// girilmesi şart, bkz. CiroRaporlariPanel.jsx handleCreate/
// handleSubmitTaslak — 2026-10-09 broker kararı: "fatura kestikten
// sonra asıl o zaman onaya göndermiş olmalı").
// Satıcı/Alıcı farklı danışmanlar tarafından temsil ediliyorsa (broker,
// 2026-10-16) pay oranı artık ELLE YAZILMIYOR — her tarafı getiren
// danışman o taraftan alınan hizmet bedelini otomatik alır (bkz. aşağıdaki
// katilimciPaylari). Toplamın 100'ü aşmaması DB'deki deferred trigger'la
// zaten garanti (bkz. lib/ciroRaporlari.js toplamPayOrani) ama bu hesap
// yöntemiyle zaten aşamaz.
//
// Satıcı/Alıcı hizmet bedeli bölümleri RE/MAX Türkiye'nin resmi ciro
// ekranındaki gibi checkbox'la açılıyor (2026-10-09 broker kararı: "sadece
// bir tık koyalım") — toplamı GD Cirosu'nun (RT Payı/Ofis Payı hesabının)
// tabanı, satış tutarından (Lig'e giden ayrı metrik) bağımsız.
// Broker, 2026-10-11: "sil ve düzenle diye seçim olmalı" — `editing`
// (düzenlenen mevcut rapor) verilirse tüm state ondan dolduruluyor,
// submit "Güncelle" olarak çalışıyor; verilmezse davranış AYNEN eskisi
// (yeni rapor oluşturma).
export default function CiroRaporuFormModal({ onClose, onSubmit, submitting, danismanOptions, anlasmalar, user, editing, existingParaHareketleri }) {
  // Eski kayıtlarda (ciro_raporu_katilimcilari) hangi katılımcının satıcı
  // mı alıcı mı tarafını temsil ettiği HİÇ tutulmuyordu — sadece pay_orani
  // vardı (bkz. aşağıdaki saticiDanismanId/aliciDanismanId notu). 2 kişilik
  // eski bir taslağı düzenlerken en iyi tahmin: ilk katılımcı satıcı,
  // ikincisi alıcı tarafı — ikisi de forma geldiğinde danışman yanlışsa
  // elle düzeltebilir, hiçbiri sessizce kaybolmaz.
  const [saticiDanismanId, setSaticiDanismanId] = useState(editing?.katilimcilar?.[0]?.danismanId ?? user.id)
  const [aliciDanismanId, setAliciDanismanId] = useState(editing?.katilimcilar?.[1]?.danismanId ?? editing?.katilimcilar?.[0]?.danismanId ?? user.id)
  const [form, setForm] = useState({
    islemTipi: editing?.islemTipi ?? 'satis',
    islemTarihi: editing?.islemTarihi ?? today(),
    notlar: editing?.notlar ?? '',
  })
  const [portfoyTipi, setPortfoyTipi] = useState(editing?.portfoyTipi ?? 'portfoyum')
  const [disBeyanKodu, setDisBeyanKodu] = useState(editing?.disBeyanKodu ?? '')
  const [tapuBilgileri, setTapuBilgileri] = useState(editing?.tapuBilgileri ?? '')
  const [mulkBedeli, setMulkBedeli] = useState(editing?.mulkBedeli != null ? formatThousands(String(editing.mulkBedeli)) : '')
  const [raporKategori, setRaporKategori] = useState(editing?.raporKategori ?? '')
  const [krediDurumu, setKrediDurumu] = useState(editing?.krediDurumu ?? 'nakit')
  const [krediBankasi, setKrediBankasi] = useState(editing?.krediBankasi ?? '')
  // null = henüz seçilmedi — broker, 2026-10-11: "bir seçim zorunlu olmalı,
  // yoksa işaretlemeden gözden kaçabilir". Checkbox'ın varsayılan "boş =
  // hayır" haliyle sessizce atlanabilmesi yerine, Nakit/Kredi'yle AYNI
  // desende açıkça "Aldım"/"Almadım" seçilmesi zorunlu (bkz. canSubmit).
  const [saticiVar, setSaticiVar] = useState(editing ? !!editing.saticiHizmetBedeliAlindi : null)
  const [satici, setSatici] = useState({
    adSoyad: editing?.saticiAdSoyad ?? '',
    telefon: editing?.saticiTelefon ?? '',
    kimlikNo: editing?.saticiKimlikNo ?? '',
    hizmetBedeli: editing?.saticiHizmetBedeli != null ? formatThousands(String(editing.saticiHizmetBedeli)) : '',
    kdvOrani: editing?.saticiKdvOrani != null ? String(editing.saticiKdvOrani) : '20',
  })
  // "+" ile eklenen EK satıcılar (ör. miras payı/hisse ortaklığı) — broker,
  // 2026-10-11: "artı işareti ekleyerek başka satıcı da eklenebilsin, isim
  // soyisim tc zorunlu olacak". Hizmet bedeli/KDV tek taraf olarak kalıyor
  // (satici state'inde), bu dizi sadece ek kimlik bilgisi topluyor.
  const [saticiDiger, setSaticiDiger] = useState(editing?.saticiDigerKisiler ?? [])
  const [aliciVar, setAliciVar] = useState(editing ? !!editing.aliciHizmetBedeliAlindi : null)
  const [alici, setAlici] = useState({
    adSoyad: editing?.aliciAdSoyad ?? '',
    telefon: editing?.aliciTelefon ?? '',
    kimlikNo: editing?.aliciKimlikNo ?? '',
    hizmetBedeli: editing?.aliciHizmetBedeli != null ? formatThousands(String(editing.aliciHizmetBedeli)) : '',
    kdvOrani: editing?.aliciKdvOrani != null ? String(editing.aliciKdvOrani) : '20',
  })
  const [aliciDiger, setAliciDiger] = useState(editing?.aliciDigerKisiler ?? [])
  // Broker, 2026-10-11: "danışman beyan girerken bu bilgileri işlesin,
  // bankadan ayrıca eşleştirelim. yani beyan menüsünde para girişlerini
  // ve çıkışlarını danışmanın gireceği satır olmalı" — ayrı bir Banka
  // Hareketleri ekranına gitmeye gerek kalmadan, bu işleme ait para
  // hareketleri (giriş/çıkış) doğrudan beyan formunun içinden satır
  // olarak eklenebiliyor. Kaydedilince banka_hareketleri tablosuna
  // yazılıyor (ciro_raporu_id ile bu beyana bağlı), broker/ofis
  // GERÇEK banka ekstresiyle eşleştirme/teyit adımını SONRA ayrıca yapar
  // (bkz. migration 20261011150000, FaturaKontrolPanel teyit akışı).
  // Artık en az bir hareket zorunlu (broker, 2026-10-17) — zorunlu bir
  // alanı "+ ekle"ye tıklanana kadar gizlememek için yeni raporda baştan
  // bir boş satırla açılıyor. Düzenlemede zaten kaydedilmiş hareketler
  // (existingParaHareketleri) varsa şart karşılanmış demektir, boş satır
  // zorlanmaz.
  const [paraHareketleri, setParaHareketleri] = useState(() =>
    !editing && !existingParaHareketleri?.length
      ? [{ tip: 'giris', tur: 'hizmet_bedeli', tutar: '', tarih: today(), dekontTarihi: today(), gonderenAdi: '', referansNo: '' }]
      : [],
  )
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  function addParaHareketi() {
    setParaHareketleri((list) => [
      ...list,
      { tip: 'giris', tur: 'hizmet_bedeli', tutar: '', tarih: today(), dekontTarihi: today(), gonderenAdi: '', referansNo: '' },
    ])
  }
  function updateParaHareketi(index, patch) {
    setParaHareketleri((list) => list.map((h, i) => (i === index ? { ...h, ...patch } : h)))
  }
  function removeParaHareketi(index) {
    setParaHareketleri((list) => list.filter((_, i) => i !== index))
  }

  function addDigerKisi(setList) {
    setList((list) => [...list, { adSoyad: '', telefon: '', kimlikNo: '' }])
  }
  function updateDigerKisi(setList, index, patch) {
    setList((list) => list.map((k, i) => (i === index ? { ...k, ...patch } : k)))
  }
  function removeDigerKisi(setList, index) {
    setList((list) => list.filter((_, i) => i !== index))
  }

  // Mülk bedeli (satış/kira) sadece Satış ve Kiralama'da zorunlu —
  // Referral/Cooperation'da mülkün kendisi bu danışmanın işlemi değil,
  // mülk bedeli kavramı yok (broker, 2026-10-13).
  const mulkBedeliGerekli = form.islemTipi === 'satis' || form.islemTipi === 'kiralama'
  const mulkBedeliParsed = parseThousands(mulkBedeli)
  // Standart hizmet bedeli oranı (satışta %2+KDV, kiralamada 1 kira+KDV) —
  // danışman girdiği tutar bundan sapıyorsa uyarı gösterilir, kaydetmeyi
  // engellemez (broker: "ona uyarı versin beni bilgilendirsin").
  const beklenenHizmetBedeliTutari = mulkBedeliGerekli ? beklenenHizmetBedeli(form.islemTipi, mulkBedeliParsed) : null

  const saticiHizmetBedeliParsed = parseThousands(satici.hizmetBedeli)
  const aliciHizmetBedeliParsed = parseThousands(alici.hizmetBedeli)
  const saticiKdvOraniParsed = satici.kdvOrani.trim() === '' ? null : Number(satici.kdvOrani)
  const aliciKdvOraniParsed = alici.kdvOrani.trim() === '' ? null : Number(alici.kdvOrani)
  // Hizmet bedeli KDV DAHİL giriliyor (dekont/ödeme tutarı) ama GD Cirosu/
  // Çalışan Payı/RT Payı/Ofis Payı hesabının tabanı KDV HARİÇ (net) olmalı
  // — KDV devlete gidiyor, şirketin cirosu değil (broker kararı,
  // AskUserQuestion 2026-10-11, bkz. migration 20261011120000).
  const saticiHizmetBedeliHaric =
    saticiHizmetBedeliParsed != null && saticiKdvOraniParsed != null
      ? Math.round((saticiHizmetBedeliParsed / (1 + saticiKdvOraniParsed / 100)) * 100) / 100
      : null
  const aliciHizmetBedeliHaric =
    aliciHizmetBedeliParsed != null && aliciKdvOraniParsed != null
      ? Math.round((aliciHizmetBedeliParsed / (1 + aliciKdvOraniParsed / 100)) * 100) / 100
      : null

  const toplamHizmetBedeliDeger = useMemo(
    () =>
      toplamHizmetBedeli({
        saticiHizmetBedeli: saticiVar === true ? saticiHizmetBedeliHaric ?? 0 : 0,
        aliciHizmetBedeli: aliciVar === true ? aliciHizmetBedeliHaric ?? 0 : 0,
      }),
    [saticiVar, saticiHizmetBedeliHaric, aliciVar, aliciHizmetBedeliHaric],
  )

  // Broker, 2026-10-11: "işlem tutarı en alta alınsın zaten gd alıcı ve
  // satıcı olarak giriliyor. total rakam toplam gelsin" — ayrı elle
  // girilen bir İşlem Tutarı alanı kaldırıldı; satıcı+alıcıdan alınan
  // hizmet bedellerinin (KDV dahil, gerçekten tahsil edilen tutar)
  // toplamı otomatik hesaplanıp Lig'e giden işlem tutarı olarak kullanılıyor.
  const islemTutariToplam =
    (saticiVar === true ? saticiHizmetBedeliParsed ?? 0 : 0) + (aliciVar === true ? aliciHizmetBedeliParsed ?? 0 : 0)

  // Broker, 2026-10-16: "iki tane gayrimenkul danışmanı ... paylaşım
  // oranı ... bir hata yaptığımızı fark ettim ... alıcıyı/satıcıyı başka
  // bir danışman temsil ediyorsa orada o danışmanı seçsin ... otomatik
  // hesaplayalım, bir müşteriden farklı bir müşteriden farklı hizmet
  // bedeli de alabiliriz". Eskiden pay oranı elle yazılıyordu ("ortak
  // çalıştığım danışman" + serbest %) — satıcıdan/alıcıdan GERÇEKTE
  // alınan hizmet bedeliyle hiç bağlı değildi, bu yüzden taraflar eşit
  // olmayan tutar aldığında biri "bir tık eksik" çıkıyordu. Artık pay
  // oranı ELLE YAZILMIYOR — satıcı tarafını getiren danışman satıcıdan
  // alınanı, alıcı tarafını getiren danışman alıcıdan alınanı otomatik
  // alır. İkisi aynı kişiyse (çoğu işlem) değişen bir şey yok, hâlâ %100
  // tek kişide.
  const saticiPayTutari = saticiVar === true ? saticiHizmetBedeliHaric ?? 0 : 0
  const aliciPayTutari = aliciVar === true ? aliciHizmetBedeliHaric ?? 0 : 0

  const katilimciPaylari = useMemo(() => {
    if (!saticiDanismanId || !aliciDanismanId) return []
    if (saticiDanismanId === aliciDanismanId) {
      return [{ danismanId: saticiDanismanId, payOrani: 100 }]
    }
    const toplam = saticiPayTutari + aliciPayTutari
    if (toplam <= 0) return []
    // Yuvarlama DB'deki "toplam %100'ü geçemez" kısıtını (bkz. migration
    // 20261008120000 ciro_raporu_pay_orani_kontrol) float hatasıyla
    // ihlal etmesin diye: ikinci taraf 100 - birinci olarak (ikisi de 2
    // ondalığa yuvarlanmış) hesaplanıyor, ayrı ayrı bölünmüyor.
    const saticiOrani = Math.round((saticiPayTutari / toplam) * 10000) / 100
    const aliciOrani = Math.round((100 - saticiOrani) * 100) / 100
    const liste = []
    if (saticiPayTutari > 0) liste.push({ danismanId: saticiDanismanId, payOrani: saticiOrani })
    if (aliciPayTutari > 0) liste.push({ danismanId: aliciDanismanId, payOrani: aliciOrani })
    return liste
  }, [saticiDanismanId, aliciDanismanId, saticiPayTutari, aliciPayTutari])

  const katilimcilarHazir = useMemo(
    () =>
      katilimciPaylari.map((k) => {
        const anlasmaOrani = guncelAnlasmaOrani(anlasmalar, k.danismanId, form.islemTarihi)
        const rtOrani = guncelRtPayOrani(anlasmalar, k.danismanId, form.islemTarihi)
        const gdCirosuDeger = gdCirosu(toplamHizmetBedeliDeger, k.payOrani)
        return {
          ...k,
          anlasmaOrani,
          rtOrani,
          gdCirosu: gdCirosuDeger,
          komisyonTutariOnerisi: komisyonTutariOnerisi(toplamHizmetBedeliDeger, k.payOrani, anlasmaOrani),
          rtPayiTutari: rtPayiOnerisi(gdCirosuDeger, rtOrani),
        }
      }),
    [katilimciPaylari, anlasmalar, form.islemTarihi, toplamHizmetBedeliDeger],
  )

  function temsilciAdi(danismanId) {
    if (danismanId === user.id) return 'Sen'
    return danismanOptions.find((u) => u.id === danismanId)?.name ?? '—'
  }

  // handleSubmit'teki paraHareketleri filtresiyle AYNI şart (tutar>0, tarihli).
  const paraHareketleriGecerliSayisi = paraHareketleri.filter(
    (h) => parseThousands(h.tutar) !== null && parseThousands(h.tutar) > 0 && h.tarih,
  ).length

  const canSubmit =
    disBeyanKodu.trim().length > 0 &&
    islemTutariToplam > 0 &&
    (!mulkBedeliGerekli || (mulkBedeliParsed !== null && mulkBedeliParsed > 0)) &&
    form.islemTarihi &&
    !!raporKategori &&
    (krediDurumu !== 'kredi' || krediBankasi.trim().length > 0) &&
    satici.adSoyad.trim().length > 0 &&
    satici.telefon.trim().length > 0 &&
    satici.kimlikNo.trim().length > 0 &&
    saticiVar !== null &&
    (saticiVar === false ||
      (saticiHizmetBedeliParsed !== null && saticiHizmetBedeliParsed > 0 && saticiKdvOraniParsed !== null && saticiKdvOraniParsed >= 0)) &&
    alici.adSoyad.trim().length > 0 &&
    alici.telefon.trim().length > 0 &&
    alici.kimlikNo.trim().length > 0 &&
    aliciVar !== null &&
    (aliciVar === false ||
      (aliciHizmetBedeliParsed !== null && aliciHizmetBedeliParsed > 0 && aliciKdvOraniParsed !== null && aliciKdvOraniParsed >= 0)) &&
    saticiDiger.every((k) => k.adSoyad.trim().length > 0 && k.telefon.trim().length > 0 && k.kimlikNo.trim().length > 0) &&
    aliciDiger.every((k) => k.adSoyad.trim().length > 0 && k.telefon.trim().length > 0 && k.kimlikNo.trim().length > 0) &&
    !!saticiDanismanId &&
    !!aliciDanismanId &&
    katilimcilarHazir.length > 0 &&
    // Broker, 2026-10-17: "para hareketleri opsiyonel yazmış, bağlanma
    // parası giriş/çıkışları, hizmet bedeli — tüm hareketleri buraya
    // girmeli" — en az bir geçerli (tutar>0, tarihli) para hareketi
    // zorunlu. Düzenlemede daha önce kaydedilmiş hareketler (existingPara-
    // Hareketleri, artık değiştirilemez) varsa bu şartı zaten karşılar.
    (paraHareketleriGecerliSayisi > 0 || (existingParaHareketleri?.length ?? 0) > 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const katilimcilar = katilimcilarHazir.map((k) => ({
      danismanId: k.danismanId,
      payOrani: k.payOrani,
      anlasmaOraniSnapshot: k.anlasmaOrani,
      komisyonTutariOnerisi: k.komisyonTutariOnerisi,
      gdCirosu: k.gdCirosu,
      rtPayOraniSnapshot: k.rtOrani,
      rtPayiTutari: k.rtPayiTutari,
      ofisPayiTutari: null,
    }))
    onSubmit({
      opportunityId: null,
      islemTipi: form.islemTipi,
      islemTutari: islemTutariToplam,
      islemTarihi: form.islemTarihi,
      notlar: form.notlar.trim() || null,
      portfoyTipi,
      disBeyanKodu: disBeyanKodu.trim() || null,
      tapuBilgileri: tapuBilgileri.trim() || null,
      mulkBedeli: mulkBedeliGerekli ? mulkBedeliParsed : null,
      saticiHizmetBedeliAlindi: saticiVar,
      saticiAdSoyad: satici.adSoyad.trim(),
      saticiTelefon: satici.telefon.trim(),
      saticiKimlikNo: satici.kimlikNo.trim(),
      saticiHizmetBedeli: saticiHizmetBedeliParsed,
      saticiKdvOrani: saticiVar === true ? saticiKdvOraniParsed : null,
      saticiHizmetBedeliHaric: saticiVar === true ? saticiHizmetBedeliHaric : null,
      saticiDigerKisiler: saticiDiger.map((k) => ({
        adSoyad: k.adSoyad.trim(),
        telefon: k.telefon.trim(),
        kimlikNo: k.kimlikNo.trim(),
      })),
      aliciHizmetBedeliAlindi: aliciVar,
      aliciAdSoyad: alici.adSoyad.trim(),
      aliciTelefon: alici.telefon.trim(),
      aliciKimlikNo: alici.kimlikNo.trim(),
      aliciHizmetBedeli: aliciHizmetBedeliParsed,
      aliciKdvOrani: aliciVar === true ? aliciKdvOraniParsed : null,
      aliciHizmetBedeliHaric: aliciVar === true ? aliciHizmetBedeliHaric : null,
      aliciDigerKisiler: aliciDiger.map((k) => ({
        adSoyad: k.adSoyad.trim(),
        telefon: k.telefon.trim(),
        kimlikNo: k.kimlikNo.trim(),
      })),
      raporKategori,
      krediDurumu,
      krediBankasi: krediDurumu === 'kredi' ? krediBankasi.trim() : null,
      katilimcilar,
      paraHareketleri: paraHareketleri
        .map((h) => ({
          tip: h.tip,
          tutar: parseThousands(h.tutar),
          tarih: h.tarih,
          dekontTarihi: h.dekontTarihi || null,
          gonderenAdi: h.gonderenAdi.trim(),
          referansNo: h.referansNo.trim(),
        }))
        .filter((h) => h.tutar !== null && h.tutar > 0 && h.tarih),
    })
  }

  return (
    <Modal title={editing ? 'Ciro Raporunu Düzenle' : 'Yeni Ciro Raporu'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Bu formdaki TÜM tek seçimli buton grupları (Portföy Tipi, İşlem
            Tipi, Kategori, Aldım/Almadım, Kredi Durumu, Giriş/Çıkış) aynı
            seçili/seçili-değil desenini kullanıyor — 2026-10-18 görsel
            tutarlılık düzeltmesi: seçili artık ince kenarlık farkıyla değil,
            dolu brand-600 zemin + beyaz metinle göze çarpıyor. */}
        <div className="flex gap-2">
          {Object.entries(PORTFOY_TIPI_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setPortfoyTipi(key)
                if (key === 'dis_portfoy' && !disBeyanKodu.trim()) {
                  setDisBeyanKodu(generateDisBeyanKodu())
                }
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                portfoyTipi === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">
            {portfoyTipi === 'portfoyum' ? 'Portföy / Referans Numarası' : 'Dış Beyan Kodu'} *
          </label>
          <input
            required
            value={disBeyanKodu}
            onChange={(e) => setDisBeyanKodu(e.target.value)}
            placeholder={portfoyTipi === 'portfoyum' ? 'Portföy kodu' : 'Dış beyan kodu'}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">Tapu Bilgileri (kısaca, opsiyonel)</label>
          <input
            value={tapuBilgileri}
            onChange={(e) => setTapuBilgileri(e.target.value)}
            placeholder="Ör. Ada 123 Parsel 45, Blok A Daire 6"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">İşlem Tipi</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ISLEM_TIPI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set({ islemTipi: key })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  form.islemTipi === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mulkBedeliGerekli && (
          <div>
            <label className="mb-1 block text-xs text-ink-500">
              Anlaşılan Bedel (₺) {form.islemTipi === 'kiralama' ? '— aylık' : ''} *
            </label>
            <input
              required
              inputMode="numeric"
              value={mulkBedeli}
              onChange={(e) => setMulkBedeli(formatThousands(e.target.value))}
              placeholder={form.islemTipi === 'satis' ? 'Mülkün satış bedeli' : 'Aylık kira bedeli'}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-ink-500">Kategori *</label>
          <div className="flex gap-2">
            {Object.entries(RAPOR_KATEGORI_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRaporKategori(key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  raporKategori === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-500">
            İşlem tarihi * (sözleşme/devir tarihi — raporu ne zaman doldurduğun değil)
          </label>
          <input
            required
            type="date"
            value={form.islemTarihi}
            onChange={(e) => set({ islemTarihi: e.target.value })}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
          />
        </div>

        <div className="rounded-lg bg-ink-50 p-3">
          <p className="mb-2 text-xs font-medium text-ink-700">Satıcı Bilgileri</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              value={satici.adSoyad}
              onChange={(e) => setSatici((s) => ({ ...s, adSoyad: e.target.value }))}
              placeholder="Ad Soyad *"
              className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            />
            <input
              required
              value={satici.telefon}
              onChange={(e) => setSatici((s) => ({ ...s, telefon: e.target.value }))}
              placeholder="Telefon *"
              className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            />
            <input
              required
              value={satici.kimlikNo}
              onChange={(e) => setSatici((s) => ({ ...s, kimlikNo: e.target.value }))}
              placeholder="TC veya Vergi No *"
              className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            />
          </div>

          <div className="mt-2">
            <label className="mb-1 block text-[11px] text-ink-500">Satıcıyı temsil eden danışman</label>
            <select
              value={saticiDanismanId}
              onChange={(e) => setSaticiDanismanId(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            >
              <option value={user.id}>Ben</option>
              {danismanOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {saticiDiger.map((k, i) => (
            <div key={i} className="mt-2 grid grid-cols-2 gap-2 border-t border-ink-200 pt-2">
              <input
                required
                value={k.adSoyad}
                onChange={(e) => updateDigerKisi(setSaticiDiger, i, { adSoyad: e.target.value })}
                placeholder="Ad Soyad *"
                className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                required
                value={k.telefon}
                onChange={(e) => updateDigerKisi(setSaticiDiger, i, { telefon: e.target.value })}
                placeholder="Telefon *"
                className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <div className="flex gap-1">
                <input
                  required
                  value={k.kimlikNo}
                  onChange={(e) => updateDigerKisi(setSaticiDiger, i, { kimlikNo: e.target.value })}
                  placeholder="TC veya Vergi No *"
                  className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                />
                <button
                  type="button"
                  onClick={() => removeDigerKisi(setSaticiDiger, i)}
                  className="rounded-lg border border-ink-200 px-2 text-xs text-ink-500 hover:bg-ink-100"
                  aria-label="Satıcıyı kaldır"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addDigerKisi(setSaticiDiger)}
            className="mt-2 text-xs font-medium text-brand-700 hover:underline"
          >
            + Başka satıcı ekle
          </button>

          <p className="mt-2 mb-1 text-xs font-medium text-ink-700">Satıcıdan hizmet bedeli aldım mı? *</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSaticiVar(true)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                saticiVar === true
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border-default bg-surface-sunken text-text-secondary'
              }`}
            >
              Aldım
            </button>
            <button
              type="button"
              onClick={() => setSaticiVar(false)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                saticiVar === false
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border-default bg-surface-sunken text-text-secondary'
              }`}
            >
              Almadım
            </button>
          </div>
          {saticiVar === true && (
            <div className="mt-2 flex gap-2">
              <input
                required
                inputMode="numeric"
                value={satici.hizmetBedeli}
                onChange={(e) => setSatici((s) => ({ ...s, hizmetBedeli: formatThousands(e.target.value) }))}
                placeholder="Hizmet Bedeli (KDV Dahil) *"
                className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                required
                inputMode="numeric"
                value={satici.kdvOrani}
                onChange={(e) => setSatici((s) => ({ ...s, kdvOrani: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="KDV % *"
                className="w-20 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
            </div>
          )}
          {saticiVar === true && saticiHizmetBedeliHaric != null && (
            <p className="mt-1 text-[11px] text-ink-500">KDV hariç: {tl(saticiHizmetBedeliHaric)}</p>
          )}
          {saticiVar === true && hizmetBedeliStandartDisiMi(saticiHizmetBedeliParsed, beklenenHizmetBedeliTutari) && (
            <p className="mt-1 text-[11px] text-amber-600">
              Standart oranda ({form.islemTipi === 'satis' ? '%2+KDV' : '1 kira+KDV'}) bu tutar {tl(beklenenHizmetBedeliTutari)} olurdu — girdiğin tutarı kontrol et.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-ink-50 p-3">
          <p className="mb-2 text-xs font-medium text-ink-700">Alıcı/Kiracı Bilgileri</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              value={alici.adSoyad}
              onChange={(e) => setAlici((s) => ({ ...s, adSoyad: e.target.value }))}
              placeholder="Ad Soyad *"
              className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            />
            <input
              required
              value={alici.telefon}
              onChange={(e) => setAlici((s) => ({ ...s, telefon: e.target.value }))}
              placeholder="Telefon *"
              className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            />
            <input
              required
              value={alici.kimlikNo}
              onChange={(e) => setAlici((s) => ({ ...s, kimlikNo: e.target.value }))}
              placeholder="TC veya Vergi No *"
              className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            />
          </div>

          <div className="mt-2">
            <label className="mb-1 block text-[11px] text-ink-500">Alıcıyı/Kiracıyı temsil eden danışman</label>
            <select
              value={aliciDanismanId}
              onChange={(e) => setAliciDanismanId(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
            >
              <option value={user.id}>Ben</option>
              {danismanOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {aliciDiger.map((k, i) => (
            <div key={i} className="mt-2 grid grid-cols-2 gap-2 border-t border-ink-200 pt-2">
              <input
                required
                value={k.adSoyad}
                onChange={(e) => updateDigerKisi(setAliciDiger, i, { adSoyad: e.target.value })}
                placeholder="Ad Soyad *"
                className="col-span-2 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                required
                value={k.telefon}
                onChange={(e) => updateDigerKisi(setAliciDiger, i, { telefon: e.target.value })}
                placeholder="Telefon *"
                className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <div className="flex gap-1">
                <input
                  required
                  value={k.kimlikNo}
                  onChange={(e) => updateDigerKisi(setAliciDiger, i, { kimlikNo: e.target.value })}
                  placeholder="TC veya Vergi No *"
                  className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                />
                <button
                  type="button"
                  onClick={() => removeDigerKisi(setAliciDiger, i)}
                  className="rounded-lg border border-ink-200 px-2 text-xs text-ink-500 hover:bg-ink-100"
                  aria-label="Alıcıyı kaldır"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addDigerKisi(setAliciDiger)}
            className="mt-2 text-xs font-medium text-brand-700 hover:underline"
          >
            + Başka alıcı/kiracı ekle
          </button>

          <p className="mt-2 mb-1 text-xs font-medium text-ink-700">Alıcıdan/Kiracıdan hizmet bedeli aldım mı? *</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAliciVar(true)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                aliciVar === true
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border-default bg-surface-sunken text-text-secondary'
              }`}
            >
              Aldım
            </button>
            <button
              type="button"
              onClick={() => setAliciVar(false)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                aliciVar === false
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border-default bg-surface-sunken text-text-secondary'
              }`}
            >
              Almadım
            </button>
          </div>
          {aliciVar === true && (
            <div className="mt-2 flex gap-2">
              <input
                required
                inputMode="numeric"
                value={alici.hizmetBedeli}
                onChange={(e) => setAlici((s) => ({ ...s, hizmetBedeli: formatThousands(e.target.value) }))}
                placeholder="Hizmet Bedeli (KDV Dahil) *"
                className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
              <input
                required
                inputMode="numeric"
                value={alici.kdvOrani}
                onChange={(e) => setAlici((s) => ({ ...s, kdvOrani: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="KDV % *"
                className="w-20 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
              />
            </div>
          )}
          {aliciVar === true && aliciHizmetBedeliHaric != null && (
            <p className="mt-1 text-[11px] text-ink-500">KDV hariç: {tl(aliciHizmetBedeliHaric)}</p>
          )}
          {aliciVar === true && hizmetBedeliStandartDisiMi(aliciHizmetBedeliParsed, beklenenHizmetBedeliTutari) && (
            <p className="mt-1 text-[11px] text-amber-600">
              Standart oranda ({form.islemTipi === 'satis' ? '%2+KDV' : '1 kira+KDV'}) bu tutar {tl(beklenenHizmetBedeliTutari)} olurdu — girdiğin tutarı kontrol et.
            </p>
          )}
        </div>

        {/* Pay oranı artık elle yazılmıyor — satıcıyı/alıcıyı temsil eden
            danışman yukarıdaki iki seçimle belirleniyor, pay otomatik
            olarak o tarafın hizmet bedelinden hesaplanıyor (broker,
            2026-10-16). */}
        {toplamHizmetBedeliDeger > 0 && (
          <div className="space-y-1.5 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
            {katilimcilarHazir.length === 0 ? (
              'Pay hesaplanamadı — satıcı/alıcıdan alınan hizmet bedelini kontrol et.'
            ) : (
              katilimcilarHazir.map((k) => (
                <p key={k.danismanId}>
                  <span className="font-medium">{temsilciAdi(k.danismanId)}</span> — pay %{k.payOrani}
                  {k.anlasmaOrani != null ? (
                    <>
                      {' '}
                      · hakediş: <span className="font-semibold">{tl(k.komisyonTutariOnerisi)}</span> (%{k.anlasmaOrani} anlaşma oranı)
                    </>
                  ) : (
                    ' · anlaşma oranı tanımlı değil, broker/owner ile kontrol et'
                  )}
                </p>
              ))
            )}
          </div>
        )}

        <div className="rounded-lg bg-ink-50 p-3">
          <p className="mb-2 text-xs font-medium text-ink-700">Diğer Bilgiler</p>
          <div className="flex gap-2">
            {Object.entries(KREDI_DURUMU_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setKrediDurumu(key)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${
                  krediDurumu === key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {krediDurumu === 'kredi' && (
            <input
              required
              value={krediBankasi}
              onChange={(e) => setKrediBankasi(e.target.value)}
              placeholder="Kredi bankası *"
              className="mt-2 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
            />
          )}
        </div>

        <div className="rounded-lg bg-ink-50 p-3">
          <p className="mb-2 text-xs font-medium text-ink-700">Para Hareketleri *</p>
          <p className="mb-2 text-[11px] text-ink-500">
            Bu işleme ait TÜM banka giriş/çıkışlarını (bağlanma parası, hizmet bedeli — her hareketi ayrı satır olarak) buraya ekle —
            broker/ofis bunları gerçek banka ekstresiyle eşleştirecek. En az bir hareket girilmesi zorunlu.
          </p>
          {existingParaHareketleri?.length > 0 && (
            <div className="mb-2 space-y-1 rounded-lg bg-white p-2 text-[11px] text-ink-600">
              <p className="font-medium text-ink-700">Daha önce eklenmiş (düzenlenemez):</p>
              {existingParaHareketleri.map((h) => (
                <p key={h.id}>
                  {h.tip === 'cikis' ? 'Çıkış' : 'Giriş'} · {BANKA_HAREKETI_TUR_LABELS[h.tur] ?? 'Diğer'} · {tl(h.tutar)} · {h.gonderenAdi || '—'}
                </p>
              ))}
            </div>
          )}
          {paraHareketleri.map((h, i) => (
            <div key={i} className="mb-2 rounded-lg border border-ink-200 bg-white p-2 last:mb-0">
              <div className="mb-2 flex gap-2">
                {[
                  { key: 'giris', label: 'Giriş' },
                  { key: 'cikis', label: 'Çıkış' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => updateParaHareketi(i, { tip: t.key })}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                      h.tip === t.key ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-default bg-surface-sunken text-text-secondary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => removeParaHareketi(i)}
                  className="ml-auto rounded-lg border border-ink-200 px-2 text-xs text-ink-500 hover:bg-ink-100"
                  aria-label="Satırı kaldır"
                >
                  ×
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {Object.entries(BANKA_HAREKETI_TUR_LABELS)
                  .filter(([key]) => key !== 'baglanma_parasi')
                  .map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateParaHareketi(i, { tur: key })}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                        (h.tur ?? 'hizmet_bedeli') === key
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-border-default bg-surface-sunken text-text-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  inputMode="numeric"
                  value={h.tutar}
                  onChange={(e) => updateParaHareketi(i, { tutar: formatThousands(e.target.value) })}
                  placeholder="Tutar (₺)"
                  className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800"
                />
                <input
                  value={h.gonderenAdi}
                  onChange={(e) => updateParaHareketi(i, { gonderenAdi: e.target.value })}
                  placeholder={h.tip === 'cikis' ? 'Kime gönderildi' : 'Kimden geldi'}
                  className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800"
                />
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Transfer Tarihi</label>
                  <input
                    type="date"
                    value={h.tarih}
                    onChange={(e) => updateParaHareketi(i, { tarih: e.target.value })}
                    className="w-full rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Dekont Tarihi</label>
                  <input
                    type="date"
                    value={h.dekontTarihi}
                    onChange={(e) => updateParaHareketi(i, { dekontTarihi: e.target.value })}
                    className="w-full rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800"
                  />
                </div>
                <input
                  value={h.referansNo}
                  onChange={(e) => updateParaHareketi(i, { referansNo: e.target.value })}
                  placeholder="İşlem Referans No (EFT/FAST)"
                  className="col-span-2 rounded-lg border border-ink-200 px-2 py-1.5 text-xs text-ink-800"
                />
              </div>
            </div>
          ))}
          <button type="button" onClick={addParaHareketi} className="text-xs font-medium text-brand-700 hover:underline">
            + Para hareketi ekle
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-ink-50 p-3">
          <span className="text-xs font-medium text-ink-700">İşlem Tutarı (Toplam)</span>
          <span className="text-sm font-semibold text-ink-800">{tl(islemTutariToplam)}</span>
        </div>

        <textarea
          value={form.notlar}
          onChange={(e) => set({ notlar: e.target.value })}
          placeholder="Not (opsiyonel)"
          rows={2}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50">
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Taslak Olarak Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
