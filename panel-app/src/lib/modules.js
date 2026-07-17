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
} from 'lucide-react'
import { ROLES } from './roles'

const ALL_ROLES = [ROLES.BROKER, ROLES.OWNER, ROLES.OFIS, ROLES.DANISMAN]

export const MODULES = [
  {
    key: 'panel',
    path: '/panel',
    label: 'Panel',
    description: 'Bugün yapman gerekenler',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    key: 'firsatlar',
    path: '/firsatlar',
    label: 'Fırsatlar',
    description: 'Satıcı / Alıcı adayları ve operasyon çağrıları',
    icon: Target,
    roles: ALL_ROLES,
  },
  {
    key: 'takvim',
    path: '/takvim',
    label: 'Takvim',
    description: 'Toplantı · Eğitim · Etkinlik · Broker Görüşmesi',
    icon: CalendarDays,
    roles: ALL_ROLES,
  },
  {
    key: 'takip',
    path: '/takip',
    label: 'Takip',
    description: 'Sağlık skoru ve eğitim/checklist takibi',
    icon: HeartPulse,
    // Herkes modüle girebilir; sayfa içeriği role göre uyarlanıyor —
    // danışman sadece kendi skorunu/eğitimini görür, yönetim tüm ekibi
    // görür. Eğitim artık ayrı bir menü değil, bu sayfanın alt bölümü
    // (bkz. pages/Takip.jsx) — /egitim linki hâlâ çalışır.
    roles: ALL_ROLES,
  },
  {
    key: 'lig',
    path: '/lig',
    label: 'Lig',
    description: '4 aylık ödül sıralaması',
    icon: Trophy,
    roles: ALL_ROLES,
  },
  {
    key: 'rehber',
    path: '/rehber',
    label: 'Rehber',
    description: 'Ofis dokümanları ve hazır metinler',
    icon: BookOpen,
    roles: ALL_ROLES,
  },
]

export function getModulesForRole(role) {
  return MODULES.filter((m) => m.roles.includes(role))
}
