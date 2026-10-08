// Ana menü modülleri — RE/MAX Lavanda Portal
// Sıra, spesifikasyondaki "Ana Modüller" sırasıyla birebir aynı.
// Ayarlar burada YOK: profil menüsünden erişiliyor, ana menüde YÖNETİM yok.

import {
  LayoutDashboard,
  Target,
  CalendarDays,
  HeartPulse,
  Trophy,
  BookOpen,
  Inbox,
  UserSearch,
  Receipt,
  Landmark,
  Wallet,
} from 'lucide-react'
import { ROLES } from './roles'

const ALL_ROLES = [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS, ROLES.DANISMAN]
const MANAGE_ROLES = [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS]
// Lead Havuzu ofis'ten de daraltıldı — sadece broker/owner (bkz.
// lib/roles.js canManageLeads). Recruiting MANAGE_ROLES'te (broker/owner/
// ofis) kalıyor, ikisi artık farklı yetki seviyeleri.
const LEADS_ROLES = [ROLES.BROKER, ROLES.OWNER]
// Ciro Raporu: ofis'in ne oluşturma (sadece danışman) ne onaylama (sadece
// broker/owner, bkz. lib/ciroRaporlari.js canApproveCiroRaporu) yetkisi
// var — menüde de hiç görünmüyor (2026-10-08 broker kararı).
const CIRO_RAPORU_ROLES = [ROLES.BROKER, ROLES.OWNER, ROLES.DANISMAN]
// Finans'ın geri kalanı (Masraflar, Cari Hesap) ve Banka Hareketleri
// sekmesi (Finans sayfasının içinde) — para hareketleri hassas bilgi,
// sadece broker/owner (bkz. lib/bankaHareketleri.js, lib/cariHesap.js).
const FINANS_YONETIM_ROLES = [ROLES.BROKER, ROLES.OWNER]

// "Takip & Gelişim" grup başlığı, içindeki "Takip" (sağlık skoru/eğitim)
// menü öğesiyle aynı kelimeyi taşıyordu — isim çakışması geri bildirimi
// üzerine (2026-09-17) SADECE grup başlığı "Gelişim"e kısaltıldı, "Takip"
// menü öğesinin adı/path'i aynı kaldı (kullanıcı zaten günlük konuşmada
// spesifik sayfayı "Takip" diye biliyor, grup başlığı nadiren referans
// alınıyor — alışkanlığı en az bozan yön, bkz. Sidebar.jsx subtitle notu).
export const MODULE_GROUPS = {
  operasyon: 'Operasyon',
  takip: 'Gelişim',
  finans: 'Finans',
}

export const MODULES = [
  {
    key: 'panel',
    path: '/panel',
    label: 'Panel',
    // "Panel" hem tüm sistemin günlük konuşmadaki adı hem de bu spesifik
    // sayfanın adı — isim çakışması geri bildirimi üzerine (2026-09-17)
    // isim DEĞİŞTİRİLMEDİ (broker kararı: "Panel'e gir" alışkanlığı zaten
    // yerleşik), sadece Sidebar.jsx'te her zaman görünen (hover değil) kısa
    // bir alt-etiket eklendi — subtitle bunun için.
    subtitle: 'Anasayfa',
    description: 'Bugün yapman gerekenler',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
    group: 'operasyon',
  },
  {
    key: 'firsatlar',
    path: '/firsatlar',
    label: 'Fırsatlar',
    description: 'Satıcı / Alıcı adayları ve operasyon çağrıları',
    icon: Target,
    roles: ALL_ROLES,
    group: 'operasyon',
  },
  // "Operasyon" 2026-09-17'de ayrı bir sidebar girişi olarak eklenmişti
  // ("Operasyon'u nerede bulacağım" geri bildirimi) ama Fırsatlar ve
  // Operasyon aynı sayfanın (pages/Firsatlar.jsx) iki üst-üste bölümü
  // olduğu için Fırsatlar kısa/kapalıyken ikisi ekranda neredeyse aynı
  // görünüyordu — broker canlıda bunu kafa karıştırıcı buldu (2026-10-04,
  // bkz. /kurul görsel+kullanılabilirlik raporunun B13 bulgusuyla da
  // örtüşüyor). Sidebar girişi bu yüzden KALDIRILDI — ama /operasyon
  // route'u ve Panel'deki derin bağlantılar (Dikkat Gerekiyor, Ofisin
  // Nabzı kartı) hâlâ çalışıyor, sadece ayrı bir menü maddesi yok artık.
  {
    key: 'leads',
    path: '/leads',
    label: 'Lead Havuzu',
    description: 'Reklam ve diğer kanallardan gelen lead\'lerin takibi',
    icon: Inbox,
    // Sadece broker/owner — ofis/danışman ne menüde görür ne route'a
    // girebilir (bkz. lib/roles.js canManageLeads, pages/Leads.jsx guard).
    roles: LEADS_ROLES,
    group: 'operasyon',
  },
  {
    key: 'recruiting',
    path: '/recruiting',
    label: 'Recruiting',
    description: 'Aday takibi — başvurudan evraka huni',
    icon: UserSearch,
    // broker/owner/ofis — Lead Havuzu'ndan daha geniş (o sadece broker/
    // owner'a daraltıldı, bkz. lib/recruiting.js canManageRecruiting).
    roles: MANAGE_ROLES,
    group: 'operasyon',
  },
  {
    key: 'takvim',
    path: '/takvim',
    label: 'Planlama',
    description: 'Takvim (Toplantı/Eğitim/Etkinlik) ve görevler',
    icon: CalendarDays,
    // Görevler artık ayrı bir menü değil, bu sayfanın alt bölümü (bkz.
    // pages/Takvim.jsx) — /gorevler linki hâlâ çalışır.
    roles: ALL_ROLES,
    group: 'takip',
  },
  {
    key: 'takip',
    path: '/takip',
    label: 'Takip',
    // Grup başlığı "Gelişim"e kısaltıldıktan sonra bile "Takip" tek başına
    // ne olduğunu tam açıklamıyor olabilir — bkz. MODULE_GROUPS.takip notu.
    subtitle: 'Sağlık & Checklist',
    description: 'Sağlık skoru ve süreç/ayrılış checklist takibi',
    icon: HeartPulse,
    // Herkes modüle girebilir; sayfa içeriği role göre uyarlanıyor —
    // danışman sadece kendi skorunu/checklist'ini görür, yönetim tüm ekibi
    // görür. Checklist artık ayrı bir menü değil, bu sayfanın alt bölümü
    // (bkz. pages/Takip.jsx) — /egitim linki hâlâ çalışır (2026-10-07:
    // Power Camp modülleri/rozetleri kaldırıldı, "süreç içine dahil
    // edeceğim" — broker kararı, bu bölümde artık sadece checklist var).
    roles: ALL_ROLES,
    group: 'takip',
  },
  {
    key: 'lig',
    path: '/lig',
    label: 'Lig',
    description: '4 aylık ödül sıralaması',
    icon: Trophy,
    roles: ALL_ROLES,
    group: 'takip',
  },
  {
    key: 'rehber',
    path: '/rehber',
    label: 'Rehber',
    description: 'Ofis dokümanları ve hazır metinler',
    icon: BookOpen,
    roles: ALL_ROLES,
    group: 'takip',
  },
  {
    key: 'ciro-raporlari',
    path: '/ciro-raporlari',
    label: 'Ciro Raporları',
    description: 'Kapanan işlemleri raporla, onayla, banka hareketleriyle eşleştir',
    icon: Receipt,
    roles: CIRO_RAPORU_ROLES,
    group: 'finans',
  },
  {
    key: 'masraflar',
    path: '/masraflar',
    label: 'Masraflar',
    description: 'İşleme bağlı masraf + aylık danışman faturası',
    icon: Landmark,
    roles: FINANS_YONETIM_ROLES,
    group: 'finans',
  },
  {
    key: 'cari-hesap',
    path: '/cari-hesap',
    label: 'Cari Hesap',
    description: 'Danışmanların borç/alacak defteri',
    icon: Wallet,
    roles: FINANS_YONETIM_ROLES,
    group: 'finans',
  },
]

export function getModulesForRole(role) {
  return MODULES.filter((m) => m.roles.includes(role))
}
