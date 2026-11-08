import { Menu } from 'lucide-react'

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
          {/* Broker, 2026-11-08: sayfa başlığı diğer başlıklardan (bölüm/
              collapsible) net ayrışmıyordu — text-xl (21px) tasarım
              sistemindeki "Sayfa başlığı" boyutu, text-lg (19px) "Bölüm
              başlığı"ydı, ikisi birbirine çok yakındı. Bu TEK satır TÜM
              sayfaların başlığını kapsıyor (her sayfa bu component'i
              kullanıyor). */}
          <h1 className="truncate text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-text-muted">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  )
}
