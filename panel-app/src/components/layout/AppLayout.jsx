import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import NotificationPrompt from './NotificationPrompt'
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

// Panel (ve eşleşmeyen her şey — Ayarlar/Kartvizitim dahil) varsayılan
// nötr zeminde (ink-50) kalıyor; Panel'e kasıtlı olarak dokunulmuyor.
// Diğer 5 modül kendi çok açık zeminini alıyor (bkz. index.css'teki
// --color-page-* tanımları) — /operasyon, /egitim, /gorevler eski
// linkleri de aynı mantıkla asıl sayfalarının zeminini paylaşıyor.
const PAGE_BG_BY_PREFIX = {
  '/firsatlar': 'bg-page-firsatlar',
  '/operasyon': 'bg-page-firsatlar',
  '/takvim': 'bg-page-planlama',
  '/gorevler': 'bg-page-planlama',
  '/takip': 'bg-page-takip',
  '/egitim': 'bg-page-takip',
  '/lig': 'bg-page-lig',
  '/rehber': 'bg-page-rehber',
}

function useCurrentPageBg() {
  const { pathname } = useLocation()
  const prefix = Object.keys(PAGE_BG_BY_PREFIX).find((p) => pathname.startsWith(p))
  return prefix ? PAGE_BG_BY_PREFIX[prefix] : 'bg-ink-50'
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const title = useCurrentTitle()
  const pageBg = useCurrentPageBg()

  return (
    <div className={`h-screen overflow-hidden ${pageBg} lg:flex`}>
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <NotificationPrompt />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
