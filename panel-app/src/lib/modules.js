// Ana menü modülleri — RE/MAX Lavanda Portal
// Sıra, spesifikasyondaki "Ana Modüller" sırasıyla birebir aynı.
// Ayarlar burada YOK: profil menüsünden erişiliyor, ana menüde YÖNETİM yok.

import {
  LayoutDashboard,
  Target,
  CalendarDays,
  GraduationCap,
  Wrench,
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
    description: 'Satıcı / Alıcı adayları',
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
    key: 'egitim',
    path: '/egitim',
    label: 'Eğitim',
    description: 'Power Camp, modüller, rozetler',
    icon: GraduationCap,
    roles: ALL_ROLES,
  },
  {
    key: 'operasyon',
    path: '/operasyon',
    label: 'Operasyon',
    description: 'Sponsorlu reklam ve çağrı kayıtları',
    icon: Wrench,
    roles: ALL_ROLES,
  },
  {
    key: 'takip',
    path: '/takip',
    label: 'Takip',
    description: 'Danışman 360° sağlık skoru',
    icon: HeartPulse,
    // Herkes modüle girebilir; sayfa içeriği role göre uyarlanıyor —
    // danışman sadece kendi skorunu görür, yönetim tüm ekibi görür.
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
