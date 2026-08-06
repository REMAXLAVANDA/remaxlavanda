import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NotificationPrompt from './NotificationPrompt'
import MobileBottomNav from './MobileBottomNav'
import { MODULES } from '../../lib/modules'

function useCurrentTitle() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/ayarlar')) return 'Ayarlar'
  // /operasyon ve /egitim artık ayrı birer menü değil, sırasıyla Fırsatlar
  // ve Takip sayfalarının bir bölümü (bkz. pages/Firsatlar.jsx,
  // pages/Takip.jsx) — ama link olarak hâlâ çalışıyorlar.
  if (pathname.startsWith('/operasyon')) return 'Fırsatlar'
  if (pathname.startsWith('/egitim')) return 'Takip'
  const active = MODULES.find((m) => pathname.startsWith(m.path))
  return active?.label ?? 'RE/MAX Lavanda'
}

const TODAY_LABEL = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
}).format(new Date())

function useCurrentSubtitle() {
  const { pathname } = useLocation()
  // Sadece Panel'de tarih alt satırı var (bkz. tasarım referansı) — diğer
  // sayfalarda başlık zaten kendini açıklıyor.
  if (pathname.startsWith('/panel')) return TODAY_LABEL
  return undefined
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const title = useCurrentTitle()
  const subtitle = useCurrentSubtitle()

  return (
    <div className="h-screen overflow-hidden bg-surface-page lg:flex">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <NotificationPrompt />
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
