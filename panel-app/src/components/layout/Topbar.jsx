import { Menu } from 'lucide-react'
import ProfileMenu from './ProfileMenu'

export default function Topbar({ title, onMenuClick }) {
  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-ink-100 bg-white/80 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
      </div>
      <ProfileMenu />
    </header>
  )
}
