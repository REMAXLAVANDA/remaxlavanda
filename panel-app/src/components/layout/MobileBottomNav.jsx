import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Target, Plus, CalendarDays, Trophy } from 'lucide-react'

// Sadece <768px'de görünen alt navigasyon — masaüstündeki sol menüyle AYNI
// rotalara gider, yeni bir özellik değil, sık kullanılan 4 sayfa + ortadaki
// "+" (Hızlı kayıt'ın Fırsat seçeneğiyle aynı hedef: ?yeni=firsat) için
// tek dokunuşluk kısayol (bkz. tasarım paketi "mobil alt navigasyon").
const ITEMS = [
  { key: 'panel', label: 'Panel', icon: LayoutDashboard, path: '/panel' },
  { key: 'firsatlar', label: 'Fırsat', icon: Target, path: '/firsatlar' },
  { key: 'takvim', label: 'Plan', icon: CalendarDays, path: '/takvim' },
  { key: 'lig', label: 'Lig', icon: Trophy, path: '/lig' },
]

export default function MobileBottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex h-[76px] items-center justify-around border-t border-border-default bg-surface-raised px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {ITEMS.slice(0, 2).map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium ${
              isActive ? 'text-brand-600' : 'text-text-disabled'
            }`
          }
        >
          <item.icon size={21} />
          {item.label}
        </NavLink>
      ))}

      <button
        onClick={() => navigate('/firsatlar?yeni=firsat')}
        aria-label="Hızlı kayıt"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_8px_18px_-6px_rgba(220,28,46,0.7)]"
      >
        <Plus size={24} />
      </button>

      {ITEMS.slice(2).map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium ${
              isActive ? 'text-brand-600' : 'text-text-disabled'
            }`
          }
        >
          <item.icon size={21} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
