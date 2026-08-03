import { Menu } from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import QuickAddMenu from './QuickAddMenu'

export default function Topbar({ title, subtitle, onMenuClick }) {
  return (
    <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border-default bg-surface-raised/90 px-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-text-disabled">{subtitle}</p> : null}
        </div>
      </div>

      <div className="hidden flex-1 justify-center md:flex">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <QuickAddMenu />
      </div>
    </header>
  )
}
